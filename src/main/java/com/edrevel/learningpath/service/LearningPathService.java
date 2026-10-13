package com.edrevel.learningpath.service;

import java.util.List;
import java.util.NoSuchElementException;

import com.edrevel.learningpath.dto.LearningPathRequest;
import com.edrevel.learningpath.model.LearningPath;
import com.edrevel.learningpath.repository.LearningPathRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.stereotype.Service;

import com.edrevel.learningpath.dto.EdgeDto;
import com.edrevel.learningpath.dto.EvaluationRequest;
import com.edrevel.learningpath.dto.EvaluationResponse;
import com.edrevel.learningpath.dto.RuleDto;

import java.util.Comparator;
import java.util.Objects;

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
            learningPath.setStatus(
        request.status() != null && !request.status().isBlank()
                ? request.status()
                : "DRAFT"
);

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
            if (request.status() != null && !request.status().isBlank()) {
    learningPath.setStatus(request.status());
}

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
    
    public EvaluationResponse evaluate(Long id, EvaluationRequest request) {
        if (request == null || request.currentNodeId() == null
                || request.currentNodeId().isBlank()) {
            throw new IllegalArgumentException("currentNodeId is required");
        }

        LearningPath savedPath = getById(id);

        try {
            LearningPathRequest path = objectMapper.readValue(
                    savedPath.getPayload(), LearningPathRequest.class);

            boolean nodeExists = path.nodes() != null
                    && path.nodes().stream()
                    .anyMatch(node -> Objects.equals(
                            node.id(), request.currentNodeId()));

            if (!nodeExists) {
                throw new IllegalArgumentException(
                        "Current node does not exist in this learning path");
            }

            List<EdgeDto> outgoingEdges = path.edges() == null
                    ? List.of()
                    : path.edges().stream()
                    .filter(edge -> Objects.equals(
                            edge.sourceNodeId(), request.currentNodeId()))
                    .toList();

            List<EdgeDto> matchingEdges = outgoingEdges.stream()
                    .filter(edge -> edge.conditions() != null)
                    .filter(edge -> edge.conditions().rules() != null
                            && !edge.conditions().rules().isEmpty())
                    .filter(edge -> matchesConditions(edge, request))
                    .sorted(Comparator.comparing(
                            EdgeDto::priority,
                            Comparator.nullsLast(Integer::compareTo)))
                    .toList();

            EdgeDto selected;

            if (!matchingEdges.isEmpty()) {
                selected = matchingEdges.get(0);
            } else {
                selected = outgoingEdges.stream()
                        .filter(edge -> Boolean.TRUE.equals(edge.isDefault()))
                        .min(Comparator.comparing(
                                EdgeDto::priority,
                                Comparator.nullsLast(Integer::compareTo)))
                        .orElse(null);
            }

            if (selected == null) {
                return new EvaluationResponse(
                        request.currentNodeId(),
                        null,
                        "No matching conditional or default route was found.",
                        true);
            }

            return new EvaluationResponse(
                    request.currentNodeId(),
                    selected.targetNodeId(),
                    matchingEdges.isEmpty()
                            ? "Default route selected."
                            : "Conditional route matched.",
                    false);

        } catch (JsonProcessingException e) {
            throw new IllegalStateException(
                    "Unable to read the saved learning path", e);
        }
    }

    private boolean matchesConditions(
            EdgeDto edge, EvaluationRequest request) {

        var conditions = edge.conditions();
        var rules = conditions.rules();

        if ("OR".equalsIgnoreCase(conditions.operator())) {
            return rules.stream().anyMatch(
                    rule -> matchesRule(rule, request));
        }

        return rules.stream().allMatch(
                rule -> matchesRule(rule, request));
    }

    private boolean matchesRule(
            RuleDto rule, EvaluationRequest request) {

        if (rule == null || rule.metric() == null) {
            return false;
        }

        String metric = rule.metric()
                .replaceAll("[^a-zA-Z]", "")
                .toLowerCase();

        Number actual;

        if (metric.contains("score")) {
            actual = request.assessmentScore();
        } else if (metric.contains("completion")) {
            actual = request.percentageCompletion();
        } else {
            return false;
        }

        if (actual == null) {
            return false;
        }

        double actualValue = actual.doubleValue();

        if (rule.range() != null) {
            Object min = rule.range().get("min");
            Object max = rule.range().get("max");

            if (min != null
                    && actualValue < ((Number) min).doubleValue()) {
                return false;
            }

            return max == null
                    || actualValue <= ((Number) max).doubleValue();
        }

        if (!(rule.value() instanceof Number expected)) {
            return false;
        }

        double expectedValue = expected.doubleValue();

        String operator = rule.operator() == null
                ? ""
                : rule.operator().trim().toLowerCase();

        return switch (operator) {
            case ">", "gt", "greater_than" ->
                    actualValue > expectedValue;
            case ">=", "gte", "greater_than_or_equal" ->
                    actualValue >= expectedValue;
            case "<", "lt", "less_than" ->
                    actualValue < expectedValue;
            case "<=", "lte", "less_than_or_equal" ->
                    actualValue <= expectedValue;
            case "==", "=", "eq", "equals" ->
                    actualValue == expectedValue;
            case "!=", "ne", "not_equals" ->
                    actualValue != expectedValue;
            default -> false;
        };
    }

}