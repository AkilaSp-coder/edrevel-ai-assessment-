# Edrevel AI – Adaptive Learning Path Builder

## Project Overview
A full-stack learning platform assessment project designed to help learners create learning paths based on their learning context and performance. The project includes a React frontend and a Spring Boot backend, with an AI recommendation feature integrated using the Google Gemini API.

## Technologies Used

### Frontend
- React
- TypeScript
- Vite
- HTML and CSS

### Backend
- Java
- Spring Boot
- Maven
- REST APIs

### AI Integration
- Google Gemini API
- JSON-based API requests and responses

### Development and Testing Tools
- Visual Studio Code
- Git and GitHub
- Postman

## Features
- Learning path management
- REST API endpoints for creating and retrieving learning paths
- AI recommendation endpoint based on score and learning context
- React-based user interface
- Frontend and backend integration

## Project Structure
- `frontend/` – React and TypeScript frontend
- `adaptive-learning-builder/` – Spring Boot backend
- `README.md` – Project documentation

## Prerequisites
- Java and Maven
- Node.js and npm
- Google Gemini API key for AI recommendations

## Run the Backend
1. Open a terminal.
2. Navigate to the backend directory:

   `cd adaptive-learning-builder`

3. Configure the `GEMINI_API_KEY` environment variable.
4. Start the application:

   `mvn spring-boot:run`

The backend runs on `http://localhost:8080`, provided the port is available.

## Run the Frontend
1. Open another terminal.
2. Navigate to the frontend directory:

   `cd frontend`

3. Install dependencies:

   `npm install`

4. Start the development server:

   `npm run dev`

Open the local URL displayed in the terminal, typically `http://localhost:5174`.

## AI Recommendation API
**Endpoint:** `POST /api/ai/recommendation`

Example request:

```json
{
  "score": 75,
  "learningContext": "Java fundamentals"
}
```

The endpoint is intended to return an AI-generated recommendation. Successful execution depends on valid Gemini API configuration and model availability.

## Verification
- Start the backend and frontend.
- Verify that the frontend loads.
- Test the learning path endpoints.
- Test the AI recommendation endpoint.



## Repository
https://github.com/AkilaSp-coder/edrevel-ai-assessment-
