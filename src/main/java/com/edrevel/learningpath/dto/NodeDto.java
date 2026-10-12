package com.edrevel.learningpath.dto;

import java.util.Map;

public record NodeDto(
        String id,
        String componentId,
        String type,
        String label,
        String description,
        PositionDto position,
        Map<String, Object> config
) {
}