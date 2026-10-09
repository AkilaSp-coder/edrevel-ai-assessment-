package com.edrevel.learningpath.service;

import java.util.List;
import java.util.NoSuchElementException;

import com.edrevel.learningpath.dto.LearningPathRequest;
import com.edrevel.learningpath.model.LearningPath;
import com.edrevel.learningpath.repository.LearningPathRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.stereotype.Service;

@Service
public class LearningPathService {

    private final LearningPathRepository repository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public LearningPathService(LearningPathRepository repository) {
        this.repository = repository;
    }

    public LearningPath save(LearningPathRequest request) {
        try {
            LearningPath learningPath = new LearningPath();

            learningPath.setName(request.name());
            learningPath.setDescription(request.description());
            learningPath.setStatus(request.status());

            learningPath.setVersion(
                    request.version() != null
                            ? request.version()
                            : 1
            );

            learningPath.setPayload(
                    objectMapper.writeValueAsString(request)
            );

            return repository.save(learningPath);

        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException(
                    "Unable to serialize learning path",
                    e
            );
        }
    }

    public List<LearningPath> getAll() {
        return repository.findAll();
    }

    public LearningPath getById(Long id) {
        return repository.findById(id)
                .orElseThrow(() ->
                        new NoSuchElementException(
                                "Learning path not found with id: " + id
                        )
                );
    }

    public LearningPath update(
            Long id,
            LearningPathRequest request
    ) {

        try {
            LearningPath learningPath = repository.findById(id)
                    .orElseThrow(() ->
                            new NoSuchElementException(
                                    "Learning path not found with id: " + id
                            )
                    );

            learningPath.setName(request.name());
            learningPath.setDescription(request.description());
            learningPath.setStatus(request.status());

            learningPath.setVersion(
                    request.version() != null
                            ? request.version()
                            : learningPath.getVersion()
            );

            learningPath.setPayload(
                    objectMapper.writeValueAsString(request)
            );

            return repository.save(learningPath);

        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException(
                    "Unable to serialize learning path",
                    e
            );
        }
    }

    public void delete(Long id) {

        if (!repository.existsById(id)) {
            throw new NoSuchElementException(
                    "Learning path not found with id: " + id
            );
        }

        repository.deleteById(id);
    }
}