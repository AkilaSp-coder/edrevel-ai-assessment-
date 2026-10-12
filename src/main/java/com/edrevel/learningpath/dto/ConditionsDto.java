package com.edrevel.learningpath.dto;

import java.util.List;

public record ConditionsDto(
        String operator,
        List<RuleDto> rules
) {
}