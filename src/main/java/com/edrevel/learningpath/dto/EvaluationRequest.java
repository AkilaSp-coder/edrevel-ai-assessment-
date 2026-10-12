
package com.edrevel.learningpath.dto;

public record EvaluationRequest(
        String currentNodeId,
        Integer assessmentScore,
        Integer percentageCompletion
) {
}
