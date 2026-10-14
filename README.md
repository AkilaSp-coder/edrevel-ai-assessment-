# Edrevel AI – Adaptive Learning Path Builder

A full-stack learning application that helps users create learning paths and receive personalized learning recommendations based on assessment scores and learning context.

## Tech Stack

**Frontend**
- React
- TypeScript
- Vite
- CSS

**Backend**
- Java 17
- Spring Boot
- Maven
- REST APIs

**AI Integration**
- Gemini API configuration for AI-powered recommendations

## Project Structure

```text
edrevel-ai-assessment-/
├── adaptive-learning-builder/
│   ├── src/
│   ├── pom.xml
│   └── mvnw.cmd
├── frontend/
│   ├── src/
│   ├── package.json
│   └── README.md
├── screenshots/
├── README.md
└── .gitignore
```

## Prerequisites

- Java 17 or compatible configured JDK
- Node.js and npm
- Git
- Gemini API key for AI recommendation functionality

## Run the Backend

Open a terminal in the project root:

```powershell
cd adaptive-learning-builder
$env:GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
.\mvnw.cmd spring-boot:run
```

The backend runs at:

`http://localhost:8080`

Keep the API key private. Do not commit it to GitHub.

## Run the Frontend

Open a second terminal from the project root:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually:

`http://localhost:5173`

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/ai/recommendation` | Generate a learning recommendation |
| POST | `/api/learning-paths` | Create a learning path |
| GET | `/api/learning-paths` | Retrieve learning paths |
| GET | `/api/learning-paths/{id}` | Retrieve a learning path by ID |

### AI Recommendation Example

**Request**

```json
{
  "score": 75,
  "learningContext": "Java fundamentals"
}
```

Send the request to:

`POST http://localhost:8080/api/ai/recommendation`

Use Postman with `Content-Type: application/json` to verify the endpoint.

## Build and Verification

Build the frontend:

```powershell
cd frontend
npm run build
```

Build and test the backend from the project root:

```powershell
cd adaptive-learning-builder
.\mvnw.cmd clean package
```

## Screenshots

Application and API testing screenshots are available in the `screenshots/` directory.

## Notes

- Start the backend before testing frontend features that depend on the API.
- Configure the required environment variables before using AI recommendations.
- Verify the API response and application behavior locally before submission.
