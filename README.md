# Edrevel AI – Adaptive Learning Path Builder

## 1. Project Overview

The Edrevel AI Adaptive Learning Path Builder is a full-stack assessment project designed to help learners receive personalized learning recommendations based on their scores and learning context.

## 2. Technologies Used

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

## 3. Features

- Learning Path Builder user interface
- Backend REST API for learning-path operations
- AI-powered personalized learning recommendations
- Score-based recommendations using the learner's learning context
- API testing using Postman

## 4. Project Structure

```text
edrevel-ai-assessment-/
├── adaptive-learning-builder/
│   ├── src/
│   ├── pom.xml
│   └── mvnw
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
├── screenshots/
├── README.md
└── pom.xml
```

## 5. Prerequisites

Install the following:
- Java and Maven
- Node.js and npm
- Git
- Google Gemini API key

## 6. Run the Backend

Open a terminal in the Spring Boot project directory:

```bash
cd adaptive-learning-builder
```

Configure the `GEMINI_API_KEY` environment variable before running the application.

In PowerShell, for the current terminal session:

```powershell
$env:GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
```

Run the backend:

```bash
mvn spring-boot:run
```

The backend runs at:

`http://localhost:8080`

## 7. Run the Frontend

Open a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite in the terminal.

## 8. API Testing

### AI Recommendation API

**Method:** POST

**Endpoint:**

`http://localhost:8080/api/ai/recommendation`

**Sample request:**

```json
{
  "score": 75,
  "learningContext": "Java fundamentals"
}
```

**Verified result:** `200 OK`

The API returned a personalized learning recommendation for the supplied score and learning context.

### Get Learning Paths

**Method:** GET

**Endpoint:**

`http://localhost:8080/api/learning-paths`

**Verified result:** `200 OK`

The endpoint returned an empty JSON array (`[]`) when no learning paths were saved.

**Note:** PUT and DELETE API operations have not yet been verified.

## 9. Build and Verification

### Backend

```bash
mvn clean package
```

### Frontend

```bash
npm run build
```

### Verification Checklist

- [x] AI recommendation endpoint tested successfully
- [x] GET learning-paths endpoint tested successfully
- [ ] PUT endpoint testing
- [ ] DELETE endpoint testing
- [ ] Final frontend and backend integration verification

## 10. Screenshots

See the `screenshots/` directory for the available project and API testing screenshots.

## 11. Security

- Do not commit API keys or other secrets to GitHub.
- Configure the Gemini API key through an environment variable.
- Replace the placeholder API key with your own key locally.

## 12. Author

**Akila M**

Full Stack Developer Assessment – NilaApps / Edrevel AI
