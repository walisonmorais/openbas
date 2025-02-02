package io.openbas.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.openbas.config.OpenBASConfig;
import io.openbas.database.model.*;
import io.openbas.database.repository.*;
import io.openbas.database.specification.ScenarioSpecification;
import io.openbas.rest.exercise.exports.ExerciseExportMixins;
import io.openbas.rest.exercise.exports.ExerciseFileExport;
import io.openbas.rest.exercise.exports.VariableMixin;
import io.openbas.rest.exercise.exports.VariableWithValueMixin;
import io.openbas.rest.scenario.export.ScenarioExportMixins;
import io.openbas.rest.scenario.export.ScenarioFileExport;
import io.openbas.rest.scenario.form.ScenarioSimple;
import io.openbas.utils.pagination.SearchPaginationInput;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.java.Log;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.logging.Level;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static io.openbas.config.SessionHelper.currentUser;
import static io.openbas.database.specification.ScenarioSpecification.findGrantedFor;
import static io.openbas.helper.StreamHelper.fromIterable;
import static io.openbas.service.ImportService.EXPORT_ENTRY_ATTACHMENT;
import static io.openbas.service.ImportService.EXPORT_ENTRY_SCENARIO;
import static io.openbas.utils.pagination.PaginationUtils.buildPaginationJPA;
import static java.time.Instant.now;

@RequiredArgsConstructor
@Service
@Log
public class ScenarioService {

  @Value("${openbas.mail.imap.enabled}")
  private boolean imapEnabled;

  @Value("${openbas.mail.imap.username}")
  private String imapUsername;

  @Resource
  private OpenBASConfig openBASConfig;

  @Resource
  protected ObjectMapper mapper;

  private final ScenarioRepository scenarioRepository;
  private final GrantService grantService;
  private final VariableService variableService;
  private final ChallengeService challengeService;
  private final DocumentRepository documentRepository;
  private final TeamRepository teamRepository;
  private final UserRepository userRepository;
  private final ScenarioTeamUserRepository scenarioTeamUserRepository;
  private final FileService fileService;

  @Transactional
  public Scenario createScenario(@NotNull final Scenario scenario) {
    if (this.imapEnabled) {
      scenario.setFrom(this.imapUsername);
      scenario.setReplyTos(List.of(this.imapUsername));
    } else {
      scenario.setFrom(this.openBASConfig.getDefaultMailer());
      scenario.setReplyTos(List.of(this.openBASConfig.getDefaultReplyTo()));
    }

    this.grantService.computeGrant(scenario);

    return this.scenarioRepository.save(scenario);
  }

  public List<ScenarioSimple> scenarios() {
    List<Scenario> scenarios;
    if (currentUser().isAdmin()) {
      scenarios = fromIterable(this.scenarioRepository.findAll());
    } else {
      scenarios = this.scenarioRepository.findAllGranted(currentUser().getId());
    }
    return scenarios.stream().map(ScenarioSimple::fromScenario).toList();
  }

  public Page<Scenario> scenarios(SearchPaginationInput searchPaginationInput) {
    if (currentUser().isAdmin()) {
      return buildPaginationJPA(
              this.scenarioRepository::findAll,
              searchPaginationInput,
              Scenario.class
      );
    } else {
      return buildPaginationJPA(
          (Specification<Scenario> specification, Pageable pageable) -> this.scenarioRepository.findAll(
              findGrantedFor(currentUser().getId()).and(specification),
              pageable
          ),
          searchPaginationInput,
          Scenario.class
      );
    }
  }

  public List<Scenario> recurringScenarios(@NotNull final Instant instant) {
    return this.scenarioRepository.findAll(
        ScenarioSpecification.isRecurring()
            .and(ScenarioSpecification.recurrenceStartDateAfter(instant))
            .and(ScenarioSpecification.recurrenceStopDateBefore(instant))
    );
  }

  public Scenario scenario(@NotBlank final String scenarioId) {
    return this.scenarioRepository.findById(scenarioId)
        .orElseThrow(() -> new IllegalStateException("Scenario not found"));
  }

  public Scenario scenarioByExternalReference(@NotBlank final String scenarioExternalReference) {
    return this.scenarioRepository.findByExternalReference(scenarioExternalReference)
            .orElseThrow(() -> new IllegalStateException("Scenario not found"));
  }
  public Scenario updateScenario(@NotNull final Scenario scenario) {
    scenario.setUpdatedAt(now());
    return this.scenarioRepository.save(scenario);
  }

  public void deleteScenario(@NotBlank final String scenarioId) {
    this.scenarioRepository.deleteById(scenarioId);
  }

  // -- EXPORT --

  // TODO: we can do better
  public void exportScenario(
      @NotBlank final String scenarioId,
      final boolean isWithTeams,
      final boolean isWithPlayers,
      final boolean isWithVariableValues,
      HttpServletResponse response)
      throws IOException {
    Scenario scenario = this.scenario(scenarioId);
    List<Tag> scenarioTags = new ArrayList<>();
    List<String> documentIds = new ArrayList<>();

    // Start exporting scenario
    ScenarioFileExport scenarioFileExport = new ScenarioFileExport();
    scenarioFileExport.setVersion(1);
    // Add Scenario
    scenarioFileExport.setScenario(scenario);
    mapper.addMixIn(Scenario.class, ScenarioExportMixins.Scenario.class);
    scenarioTags.addAll(scenario.getTags());
    // Add Objectives
    scenarioFileExport.setObjectives(scenario.getObjectives());
    mapper.addMixIn(Objective.class, ExerciseExportMixins.Objective.class);
    // Add Lesson Categories
    scenarioFileExport.setLessonsCategories(scenario.getLessonsCategories());
    mapper.addMixIn(LessonsCategory.class, ExerciseExportMixins.LessonsCategory.class);
    // Add Lessons Questions
    List<LessonsQuestion> lessonsQuestions = scenario.getLessonsCategories()
        .stream()
        .flatMap(category -> category.getQuestions().stream())
        .toList();
    scenarioFileExport.setLessonsQuestions(lessonsQuestions);
    mapper.addMixIn(LessonsQuestion.class, ExerciseExportMixins.LessonsQuestion.class);
    // Add Variables
    List<Variable> variables = this.variableService.variablesFromScenario(scenarioId);
    scenarioFileExport.setVariables(variables);
    if (isWithVariableValues) {
      mapper.addMixIn(Variable.class, VariableWithValueMixin.class);
    } else {
      mapper.addMixIn(Variable.class, VariableMixin.class);
    }

    // Add Documents
    scenarioFileExport.setDocuments(scenario.getDocuments());
    mapper.addMixIn(Document.class, ExerciseExportMixins.Document.class);
    scenarioTags.addAll(scenario.getDocuments().stream().flatMap(doc -> doc.getTags().stream()).toList());
    documentIds.addAll(scenario.getDocuments().stream().map(Document::getId).toList());

    if (isWithTeams) {
      // Add Teams
      scenarioFileExport.setTeams(scenario.getTeams());
      mapper.addMixIn(Team.class,
          isWithPlayers ? ExerciseExportMixins.Team.class : ExerciseExportMixins.EmptyTeam.class);
      scenarioTags.addAll(scenario.getTeams().stream().flatMap(team -> team.getTags().stream()).toList());
    }

    if (isWithPlayers) {
      // Add players
      List<User> players = scenario.getTeams().stream().flatMap(team -> team.getUsers().stream()).distinct().toList();
      scenarioFileExport.setUsers(players);
      mapper.addMixIn(User.class, ExerciseExportMixins.User.class);
      scenarioTags.addAll(players.stream().flatMap(user -> user.getTags().stream()).toList());
      // organizations
      List<Organization> organizations = players.stream().map(User::getOrganization).filter(Objects::nonNull).toList();
      scenarioFileExport.setOrganizations(organizations);
      mapper.addMixIn(Organization.class, ExerciseExportMixins.Organization.class);
      scenarioTags.addAll(organizations.stream().flatMap(org -> org.getTags().stream()).toList());
    } else {
      mapper.addMixIn(ExerciseFileExport.class, ScenarioExportMixins.ScenarioWithoutPlayers.class);
    }

    // Add Injects
    mapper.addMixIn(Inject.class, ExerciseExportMixins.Inject.class);
    scenarioFileExport.setInjects(scenario.getInjects());
    scenarioTags.addAll(scenario.getInjects().stream().flatMap(inject -> inject.getTags().stream()).toList());

    // Add Articles
    mapper.addMixIn(Article.class, ExerciseExportMixins.Article.class);
    scenarioFileExport.setArticles(scenario.getArticles());
    // Add Channels
    mapper.addMixIn(Channel.class, ExerciseExportMixins.Channel.class);
    List<Channel> channels = scenario.getArticles().stream().map(Article::getChannel).distinct().toList();
    scenarioFileExport.setChannels(channels);
    documentIds.addAll(channels.stream().flatMap(channel -> channel.getLogos().stream()).map(Document::getId).toList());

    // Add Challenges
    mapper.addMixIn(Challenge.class, ExerciseExportMixins.Challenge.class);
    List<Challenge> challenges = fromIterable(this.challengeService.getScenarioChallenges(scenario));
    scenarioFileExport.setChallenges(challenges);
    scenarioTags.addAll(challenges.stream().flatMap(challenge -> challenge.getTags().stream()).toList());
    documentIds.addAll(
        challenges.stream().flatMap(challenge -> challenge.getDocuments().stream()).map(Document::getId).toList());

    // Tags
    scenarioFileExport.setTags(scenarioTags.stream().distinct().toList());
    mapper.addMixIn(Tag.class, ExerciseExportMixins.Tag.class);

    // Build the response
    String infos = "(" +
        (isWithTeams ? "with_teams" : "no_teams") +
        " & " +
        (isWithPlayers ? "with_players" : "no_players") +
        " & " +
        (isWithVariableValues ? "with_variable_values" : "no_variable_values")
        + ")";
    String zipName = (scenario.getName() + "_" + now().toString()) + "_" + infos + ".zip";
    response.addHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + zipName);
    response.addHeader(HttpHeaders.CONTENT_TYPE, "application/zip");
    response.setStatus(HttpServletResponse.SC_OK);
    ZipOutputStream zipExport = new ZipOutputStream(response.getOutputStream());
    ZipEntry zipEntry = new ZipEntry(scenario.getName() + ".json");
    zipEntry.setComment(EXPORT_ENTRY_SCENARIO);
    zipExport.putNextEntry(zipEntry);
    zipExport.write(mapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(scenarioFileExport));
    zipExport.closeEntry();
    // Add the documents
    documentIds.stream().distinct().forEach(docId -> {
      Document doc = this.documentRepository.findById(docId).orElseThrow();
      Optional<InputStream> docStream = this.fileService.getFile(doc);
      if (docStream.isPresent()) {
        try {
          ZipEntry zipDoc = new ZipEntry(doc.getTarget());
          zipDoc.setComment(EXPORT_ENTRY_ATTACHMENT);
          byte[] data = docStream.get().readAllBytes();
          zipExport.putNextEntry(zipDoc);
          zipExport.write(data);
          zipExport.closeEntry();
        } catch (IOException e) {
          log.log(Level.SEVERE, e.getMessage(), e);
        }
      }
    });
    zipExport.finish();
    zipExport.close();
  }

  // -- TEAMS --

  public Iterable<Team> addTeams(@NotBlank final String scenarioId, @NotNull final List<String> teamIds) {
    Scenario scenario = this.scenario(scenarioId);
    List<Team> teams = scenario.getTeams();
    List<Team> teamsToAdd = fromIterable(this.teamRepository.findAllById(teamIds));
    List<String> existingTeamIds = teams.stream().map(Team::getId).toList();
    teams.addAll(teamsToAdd.stream().filter(t -> !existingTeamIds.contains(t.getId())).toList());
    scenario.setTeams(teams);
    scenario.setUpdatedAt(now());
    return teamsToAdd;
  }

  public Iterable<Team> removeTeams(@NotBlank final String scenarioId, @NotNull final List<String> teamIds) {
    Scenario scenario = this.scenario(scenarioId);
    List<Team> teams = scenario.getTeams().stream().filter(team -> !teamIds.contains(team.getId())).toList();
    scenario.setTeams(new ArrayList<>() {{
      addAll(teams);
    }});
    this.updateScenario(scenario);
    // Remove all association between users / exercises / teams
    teamIds.forEach(this.scenarioTeamUserRepository::deleteTeamFromAllReferences);
    return teamRepository.findAllById(teamIds);
  }

  public Scenario enablePlayers(@NotBlank final String scenarioId, @NotBlank final String teamId,
      @NotNull final List<String> playerIds) {
    Scenario scenario = this.scenario(scenarioId);
    Team team = this.teamRepository.findById(teamId).orElseThrow();
    playerIds.forEach(playerId -> {
      ScenarioTeamUser scenarioTeamUser = new ScenarioTeamUser();
      scenarioTeamUser.setScenario(scenario);
      scenarioTeamUser.setTeam(team);
      scenarioTeamUser.setUser(this.userRepository.findById(playerId).orElseThrow());
      this.scenarioTeamUserRepository.save(scenarioTeamUser);
    });
    return scenario;
  }

  public Scenario disablePlayers(@NotBlank final String scenarioId, @NotBlank final String teamId,
      @NotNull final List<String> playerIds) {
    playerIds.forEach(playerId -> {
      ScenarioTeamUserId scenarioTeamUserId = new ScenarioTeamUserId();
      scenarioTeamUserId.setScenarioId(scenarioId);
      scenarioTeamUserId.setTeamId(teamId);
      scenarioTeamUserId.setUserId(playerId);
      this.scenarioTeamUserRepository.deleteById(scenarioTeamUserId);
    });
    return this.scenario(scenarioId);
  }

}
