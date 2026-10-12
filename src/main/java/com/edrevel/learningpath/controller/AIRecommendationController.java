
package com.edrevel.learningpath.controller;

import com.edrevel.learningpath.service.OpenAIRecommendationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = {
    "http://localhost:5173",
    "http://localhost:5174"
})
public class AIRecommendationController {

    private final OpenAIRecommendationService aiService;

    public AIRecommendationController(
            OpenAIRecommendationService aiService) {
        this.aiService = aiService;
    }

    @PostMapping("/recommendation")
    public ResponseEntity<?> getRecommendation(
            @RequestBody RecommendationRequest request) {

        if (request.score() < 0 || request.score() > 100) {
            return ResponseEntity.badRequest().body(
                    Map.of("error", "Score must be between 0 and 100"));
        }

        try {
            String recommendation = aiService.generateRecommendation(
                    request.score(), request.learningContext());

            return ResponseEntity.ok(
                    Map.of("recommendation", recommendation));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", "AI recommendation failed"));
        }
    }

    
@PostMapping("/generate-path")
public ResponseEntity<?> generatePath(
        @RequestBody PathRequest request) {

    if (request.prompt() == null || request.prompt().isBlank()) {
        return ResponseEntity.badRequest().body(
                Map.of("error", "Prompt is required"));
    }

    try {
        List<Map<String, Object>> nodes =
                aiService.generateLearningPath(request.prompt());

        return ResponseEntity.ok(Map.of("nodes", nodes));

    } catch (Exception e) {
        e.printStackTrace();

        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(
                Map.of(
                        "error", "AI learning path generation failed",
                        "details", e.getMessage() == null
                                ? "Unknown error"
                                : e.getMessage()
                ));
    }
}


    public record RecommendationRequest(
            int score, String learningContext) {}

    public record PathRequest(String prompt) {}
}
