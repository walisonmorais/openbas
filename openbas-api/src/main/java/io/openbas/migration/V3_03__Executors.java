package io.openbas.migration;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.hypersistence.utils.hibernate.type.array.StringArrayType;
import io.openbas.annotation.Queryable;
import jakarta.persistence.Column;
import lombok.Getter;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
import org.hibernate.annotations.Type;
import org.springframework.stereotype.Component;

import java.sql.Connection;
import java.sql.Statement;

@Component
public class V3_03__Executors extends BaseJavaMigration {

  @Override
  public void migrate(Context context) throws Exception {
    Connection connection = context.getConnection();
    Statement select = connection.createStatement();
    // Create table
    select.execute("""
          CREATE TABLE executors (
            executor_id varchar(255) not null constraint executor_pkey primary key,
            executor_created_at timestamp not null default now(),
            executor_updated_at timestamp not null default now(),
            executor_name varchar(255) not null,
            executor_type varchar(255) not null,
            executor_platforms text[],
            executor_doc text
          );
          CREATE INDEX idx_executors on executors (executor_id);
          CREATE UNIQUE INDEX executors_unique on executors (executor_type);
     """);
    select.execute("ALTER TABLE injectors DROP column injector_simulation_agent;");
    select.execute("ALTER TABLE injectors DROP column injector_simulation_agent_platforms;");
    select.execute("ALTER TABLE injectors DROP column injector_simulation_agent_doc;");
    select.execute("ALTER TABLE injectors_contracts ADD injector_contract_needs_executor bool default false;");
    select.execute("DELETE FROM collectors WHERE collector_type = 'openbas_caldera'");
  }
}