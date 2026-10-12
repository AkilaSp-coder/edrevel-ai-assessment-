package com.edrevel.learningpath.controller;

import com.edrevel.learningpath.dto.ComponentsResponse;
import com.edrevel.learningpath.service.ComponentService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/api/components")
public class ComponentController {

    private final ComponentService componentService;

    public ComponentController(ComponentService componentService) {
        this.componentService = componentService;
    }

    @GetMapping
    public ComponentsResponse getAvailableComponents() {
        return componentService.getAvailableComponents();
    }
}