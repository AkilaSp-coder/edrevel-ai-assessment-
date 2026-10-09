package com.edrevel.learningpath.dto;

public record EdgeDto(
        String id,
        String sourceNodeId,
        String targetNodeId,
        String label,
        Integer priority,
        Boolean isDefault,
        ConditionsDto conditions
) {
}