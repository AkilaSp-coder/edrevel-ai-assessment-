package com.edrevel.learningpath.service;

import com.edrevel.learningpath.dto.ComponentDto;
import com.edrevel.learningpath.dto.ComponentsResponse;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class ComponentService {

    public ComponentsResponse getAvailableComponents() {

        ComponentDto mathAssessment = new ComponentDto(
                "cmp-assess-math-1",
                "Math Module 1 Assessment",
                "Baseline math diagnostic used to route learners.",
                "assessment",
                35,
                Map.of(
                        "assessment",
                        Map.of(
                                "maxScore", 100,
                                "passingScore", 50
                        )
                )
        );

        ComponentDto mathEasy = new ComponentDto(
                "cmp-unit-math-2-easy",
                "Math Module 2 - Easy",
                "Foundational math remediation unit.",
                "unit",
                35,
                Map.of(
                        "unit",
                        Map.of(
                                "recommendedMinutes", 30
                        )
                )
        );

        List<ComponentDto> items = List.of(
                mathAssessment,
                mathEasy
        );

        return new ComponentsResponse(
                items,
                items.size()
        );
    }
}