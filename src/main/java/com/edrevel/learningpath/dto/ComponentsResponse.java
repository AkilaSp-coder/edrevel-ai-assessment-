package com.edrevel.learningpath.dto;

import java.util.List;

public record ComponentsResponse(
        List<ComponentDto> items,
        int totalCount
) {
}