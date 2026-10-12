
package com.edrevel.learningpath.dto;

public record EvaluationResponse(
        String currentNodeId,
        String nextNodeId,
        String reason,
        boolean completed
) {
}
