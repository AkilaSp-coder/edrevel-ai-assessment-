package com.edrevel.learningpath.dto;

import java.util.Map;

public record ComponentDto(
        String id,
        String title,
        String shortDescription,
        String type,
        Integer approximateDurationMinutes,
        Map<String, Object> metadata
) {
}