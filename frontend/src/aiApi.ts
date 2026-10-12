const AI_API_URL = 'http://localhost:8080/api/ai/recommendation';

export async function getAIRecommendation(
  score: number,
  learningContext: string
): Promise<string> {
  const response = await fetch(AI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ score, learningContext }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.details || data.error || 'AI recommendation failed');
  }

  return data.recommendation;
}