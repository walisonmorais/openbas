package io.openbas.utils;

import io.openbas.utils.schema.PropertySchema;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Root;
import jakarta.validation.constraints.NotNull;

import java.util.Optional;

import static org.springframework.util.StringUtils.hasText;

public class JpaUtils {

  public static <T> Expression<String> toPath(
      @NotNull final PropertySchema propertySchema,
      @NotNull final Root<T> root,
      @NotNull final CriteriaBuilder cb) {
    // Join
    if (propertySchema.getJoinTable() != null) {
      PropertySchema.JoinTable joinTable = propertySchema.getJoinTable();
      return root.join(joinTable.getJoinOn(), JoinType.LEFT).get(Optional.ofNullable(propertySchema.getPropertyRepresentative()).orElse("id"));
    }
    // Search on child
    else if (propertySchema.isFilterable() && hasText(propertySchema.getPropertyRepresentative())) {
      return root.get(propertySchema.getName()).get(propertySchema.getPropertyRepresentative());
      // Direct property
    } else {
      return root.get(propertySchema.getName());
    }
  }

}
