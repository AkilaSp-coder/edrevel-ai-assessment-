package com.edrevel.learningpath.controller;

import com.edrevel.learningpath.dto.LearningPathRequest;
import com.edrevel.learningpath.model.LearningPath;
import com.edrevel.learningpath.service.LearningPathService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/learning-paths")
public class LearningPathController {

    private final LearningPathService service;

    public LearningPathController(LearningPathService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<LearningPath> create(
            @RequestBody LearningPathRequest request
    ) {
        LearningPath saved = service.save(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(saved);
    }

    @GetMapping
    public ResponseEntity<List<LearningPath>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    
@GetMapping("/{id}")
public ResponseEntity<LearningPath> getById(
        @PathVariable Long id
) {
    return ResponseEntity.ok(service.getById(id));
}


    @PutMapping("/{id}")
public ResponseEntity<LearningPath> update(
        @PathVariable Long id,
        @RequestBody LearningPathRequest request
) {
    try {
        return ResponseEntity.ok(service.update(id, request));
    } catch (NoSuchElementException e) {
        return ResponseEntity.notFound().build();
    }
}

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id
    ) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
    
@ExceptionHandler(NoSuchElementException.class)
public ResponseEntity<String> handleNotFound(NoSuchElementException ex) {
    return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(ex.getMessage());
}

}