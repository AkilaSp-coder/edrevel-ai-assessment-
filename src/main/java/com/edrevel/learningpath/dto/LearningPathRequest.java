package com.edrevel.learningpath.dto;

import java.util.List;

public record LearningPathRequest(
        String id,
        String name,
        String description,
        String status,
        Integer version,
        CanvasDto canvas,
        List<NodeDto> nodes,
        List<EdgeDto> edges
) {
}