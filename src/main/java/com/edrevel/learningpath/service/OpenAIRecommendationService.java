
package com.edrevel.learningpath.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import java.util.List;
import java.util.Map;

@Service
public class OpenAIRecommendationService {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;

    public OpenAIRecommendationService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.apiKey = System.getenv("GEMINI_API_KEY");

        this.restClient = RestClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com/v1beta")
                .build();
    }

    
public List<Map<String, Object>> generateLearningPath(String userPrompt) {
    if (apiKey == null || apiKey.isBlank()) {
        throw new IllegalStateException(
                "GEMINI_API_KEY environment variable is not set");
    }

    String prompt = """
            Create a useful learning path based on this request:
            %s

            Return ONLY valid JSON. Do not use Markdown fences.
            Use this exact structure:
            {
              "nodes": [
                {
                  "type": "unit",
                  "title": "Introduction",
                  "description": "Learning objectives"
                },
                {
                  "type": "unit",
                  "title": "Core Concepts",
                  "description": "Explain the main concepts"
                },
                {
                  "type": "assessment",
                  "title": "Knowledge Check",
                  "description": "Test understanding",
                  "questions": [
                    {
                      "id": 1,
                      "question": "Example question?",
                      "options": ["Option A", "Option B", "Option C", "Option D"],
                      "correctAnswer": 1
                    }
                  ]
                }
              ]
            }

            Requirements:
            - Generate 3 to 6 relevant learning nodes.
            - Include at least one assessment node.
            - Use only unit or assessment as the node type.
            - Each assessment question must have four options.
            - correctAnswer must be the zero-based index of the correct option.
            - Make content specific to the user's requested topic.
            """.formatted(userPrompt);

    Map<String, Object> request = Map.of(
            "contents", List.of(
                    Map.of("parts", List.of(
                            Map.of("text", prompt)
                    ))
            ),
            "generationConfig", Map.of(
                    "responseMimeType", "application/json"
            )
    );

    JsonNode response = callGemini(request);
    String text = response == null ? "" :
            response.path("candidates").path(0)
                    .path("content").path("parts")
                    .path(0).path("text").asText("");

    if (text.isBlank()) {
        throw new IllegalStateException(
                "Gemini returned an empty learning path");
    }

    try {
        JsonNode root = objectMapper.readTree(text);
        JsonNode nodes = root.path("nodes");

        if (!nodes.isArray() || nodes.isEmpty()) {
            throw new IllegalStateException(
                    "Gemini response contains no learning nodes");
        }

        List<Map<String, Object>> result =
                objectMapper.convertValue(
                        nodes,
                        new com.fasterxml.jackson.core.type.TypeReference<
                                List<Map<String, Object>>>() {}
                );

        return result;
    } catch (Exception e) {
        throw new IllegalStateException(
                "Could not parse Gemini learning path JSON", e);
    }
    
}

public String generateRecommendation(int score, String learningContext) {
    if (score < 0 || score > 100) {
        throw new IllegalArgumentException(
                "Score must be between 0 and 100");
    }

    String context = (learningContext == null
            || learningContext.isBlank())
            ? "General learning"
            : learningContext;

    if (apiKey == null || apiKey.isBlank()) {
        throw new IllegalStateException(
                "GEMINI_API_KEY environment variable is not set");
    }

    String prompt = """
            You are an adaptive learning assistant.
            Give a concise, encouraging recommendation based on the score.

            Score: %d out of 100
            Learning context: %s

            Suggest what the learner should do next.
            """.formatted(score, context);

    Map<String, Object> request = Map.of(
            "contents", List.of(
                    Map.of("parts", List.of(
                            Map.of("text", prompt)
                    ))
            )
    );

    JsonNode response = callGemini(request);
    if (response == null) {
        throw new IllegalStateException("Empty response from Gemini");
    }

    for (JsonNode part : response.path("candidates")
            .path(0).path("content").path("parts")) {
        String text = part.path("text").asText("");
        if (!text.isBlank()) {
            return text;
        }
    }

    throw new IllegalStateException(
            "No recommendation text returned by Gemini");
}

private JsonNode callGemini(Map<String, Object> request) {
    for (int attempt = 0; attempt < 3; attempt++) {
        try {
            return restClient.post()
                    .uri("/models/gemini-3.8-flash:generateContent?key={key}", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(JsonNode.class);

        } catch (RestClientResponseException e) {
            int status = e.getStatusCode().value();

            boolean retryable =
                    status == 429 ||
                    status == 500 ||
                    status == 502 ||
                    status == 503 ||
                    status == 504;

            if (!retryable || attempt == 2) {
                throw e;
            }

            try {
                Thread.sleep(1000L * (1L << attempt));
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException(
                        "Gemini retry was interrupted", interrupted
                );
            }
        }
    }

    throw new IllegalStateException(
            "Gemini request failed after retries"
    );
}


}
