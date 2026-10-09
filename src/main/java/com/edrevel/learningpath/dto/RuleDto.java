package com.edrevel.learningpath.dto;

import java.util.Map;

public record RuleDto(
        String id,
        String sourceType,
        String sourceNodeId,
        String metric,
        String operator,
        Object value,
        Map<String, Object> range
) {
}