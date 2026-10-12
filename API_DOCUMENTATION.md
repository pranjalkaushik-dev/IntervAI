# IntervAI — API Documentation & WebSocket Events

Complete reference for the REST APIs and WebSocket protocols powering IntervAI.

---

## 🔑 Authentication & Authorization

All private endpoints require a Bearer token in the `Authorization` header:

```http
Authorization: Bearer <jwt_token>
```

Tokens are obtained via the `/api/auth/login` or `/api/auth/register` endpoints.

---

## 📡 REST API Reference

### 1. Authentication (`/api/auth`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register a new Student/Candidate account. Returns JWT. |
| `POST` | `/api/auth/login` | Public | Authenticate existing user with email and password. Returns JWT. |
| `GET` | `/api/auth/me` | Private | Retrieve current authenticated user profile. |

#### Request Example (`POST /api/auth/login`):
```json
{
  "email": "testinterviewer@example.com",
  "password": "Password123!"
}
```

---

### 2. Interviews (`/api/interviews`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/interviews` | Company | Create a new interview session. Generates room code. |
| `GET` | `/api/interviews` | Private | List interviews associated with the authenticated user. |
| `GET` | `/api/interviews/room/:roomCode` | Private | Retrieve interview preview details by room code. |
| `POST` | `/api/interviews/join` | Private | Join an interview room. Returns access status (`canEnterRoom`). |
| `POST` | `/api/interviews/:id/start` | Company | Change interview status `CREATED` -> `ACTIVE`. |
| `POST` | `/api/interviews/:id/complete` | Company | Conclude interview `ACTIVE` -> `COMPLETED` and generate final report. |
| `POST` | `/api/interviews/:id/cancel` | Company | Cancel a scheduled interview session. |
| `GET` | `/api/interviews/:id` | Private | Fetch detailed interview object by MongoDB ID. |
| `PUT` | `/api/interviews/:id/notes` | Company | Update private interviewer notes. |
| `GET` | `/api/interviews/:id/report` | Private | Retrieve generated AI evaluation report. |
| `POST` | `/api/interviews/:id/report/generate`| Private | Re-generate final AI report on demand. |
| `GET` | `/api/interviews/dashboard-summary` | Company | Retrieve high-level interviewer dashboard metrics. |
| `GET` | `/api/interviews/students` | Company | List all candidate accounts with interview history. |
| `GET` | `/api/interviews/analytics` | Company | Retrieve platform-wide aggregate performance metrics. |
| `POST` | `/api/interviews/:id/system-design/state` | Private | Save whiteboard nodes, edges, and notes. |
| `GET` | `/api/interviews/:id/system-design/state` | Private | Retrieve persisted whiteboard architecture state. |
| `POST` | `/api/interviews/:id/system-design/submit` | Interview candidate | Save architecture and request AI evaluation; response includes `aiEvaluationStatus` (`COMPLETED` or `FAILED`). |
| `POST` | `/api/interviews/:id/text-submit` | Interview candidate | Save answer, asynchronously evaluate it, and receive `answer:evaluated` with `COMPLETED` or `FAILED` status. |
| `POST` | `/api/interviews/:id/adaptive-turn` | Owning interviewer | Persist the interviewer assistant's evaluated answer turn. |
| `POST` | `/api/interviews/:id/resume/upload` | Interview participant | Save an uploaded resume; response includes `aiParsingStatus`. |
| `POST` | `/api/interviews/:id/resume/generate-questions` | Owning company | Generate and persist resume-based questions. |
| `GET` | `/api/interviews/:id/report` | Private participant | Retrieve persisted interview metrics and AI-summary status. |
| `POST` | `/api/interviews/:id/report/generate` | Owning company/admin | Generate measured report metrics and attempt an AI summary. |
| `POST` | `/api/ai/interview-assistant` | Authenticated user | Evaluate an answer and return an adaptive follow-up; the caller persists the evaluated turn separately. |

---

### 3. Coding & Code Execution (`/api/coding`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/coding/languages` | Public | List Judge0 supported languages and runtime IDs. |
| `POST` | `/api/coding/run` | Private | Execute code in Judge0 sandbox against custom or sample stdin. |
| `POST` | `/api/coding/submit` | Private | Submit solution for authoritative hidden test-case grading & AI evaluation. |
| `GET` | `/api/coding/submissions/:interviewId` | Private | List all code submissions for a specific interview session. |

#### Request Example (`POST /api/coding/run`):
```json
{
  "sourceCode": "console.log('Hello World');",
  "languageId": 63,
  "stdin": ""
}
```

---

### 4. Questions Management (`/api/questions`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/questions/library` | Company | List global and reusable question library. |
| `POST` | `/api/questions` | Company | Create a new interview question (CODING, MCQ, TEXT, SYSTEM_DESIGN). |
| `POST` | `/api/questions/generate-ai` | Company | Generate questions using Gemini; optionally save them to an owned interview. |
| `POST` | `/api/questions/bulk` | Company | Batch create multiple questions. |
| `GET` | `/api/questions/interview/:interviewId` | Private | Fetch all questions attached to an interview. |
| `GET` | `/api/questions/:id` | Private | Fetch a single question by ID. |
| `DELETE` | `/api/questions/:id` | Company | Delete a question from the question library. |

---

### 5. Monitoring & Proctoring (`/api/monitoring`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/monitoring/violations` | Private | Persist a proctoring violation record. |
| `GET` | `/api/monitoring/violations/:interviewId` | Private | Retrieve all violation logs recorded during an interview. |
| `POST` | `/api/monitoring/dual-camera/token` | Private | Generate short-lived pairing token and URL for mobile camera. |

---

### 6. AI Monitoring Engine (`http://localhost:5050`)

The engine is an internal backend dependency. Every `/api/ai/*` request requires `Authorization: Bearer <AI_SERVICE_TOKEN>`; configure the same unpredictable token in `server/.env` and `ai-monitoring/.env`. Do not expose this token or call the AI engine directly from the browser. `/health` is public and reports configuration presence only; it does not prove that Gemini is reachable or that an AI workflow completed.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Report process state and whether Gemini/service authentication configuration is present. |
| `POST` | `/api/ai/generate-questions` | Generate interview questions matching role, skills, mode, and difficulty. |
| `POST` | `/api/ai/coding-evaluation` | Qualitative AI evaluation of submitted code and test performance. |
| `POST` | `/api/ai/interview-assistant` | Contextual adaptive follow-up generator based on candidate answers. |
| `POST` | `/api/ai/final-report` | Produce factual executive summary of interview performance. |
| `POST` | `/api/ai/parse-resume` | Extract structured skills, experience, and contact data from resume text. |
| `POST` | `/api/ai/system-design-evaluation` | Evaluate architectural diagrams, trade-offs, and scalability. |

---

## ⚡ WebSocket (Socket.IO) Events Reference

Socket connection must authenticate using the user's JWT token:
```javascript
const socket = io('http://localhost:5001', {
  auth: { token: '<jwt_token>' }
});
```

### Client -> Server Events

| Event Name | Payload Structure | Description |
|---|---|---|
| `join-room` | `{ roomId: string, interviewId: string }` | Join the real-time interview collaboration room. |
| `code-change` | `{ roomId: string, code: string }` | Emit source code changes (requires active coding token). |
| `coding:token:request` | `{ roomId: string }` | Candidate requests editing privileges. |
| `coding:token:grant` | `{ roomId, targetUserId, targetUserName, targetSocketId }` | Interviewer grants editing privileges to participant. |
| `coding:token:release` | `{ roomId: string }` | Relinquish coding privileges back to room pool. |
| `chat:message` | `{ roomId: string, text: string }` | Send an in-room real-time chat message. |
| `question:change` | `{ roomId: string, questionIndex: number }` | Interviewer synchronizes active question view. |
| `system-design:change` | `{ roomId, nodes, edges, diagramNotes }` | Synchronize whiteboard canvas elements. |
| `monitoring:violation` | `{ interviewId, violationType, severity, metadata }` | Active interview candidate reports a detected CV/browser visibility event; backend validates participant, room, and interview status before persistence. |
| `webrtc:offer` | `{ to: string, offer: RTCSessionDescriptionInit }` | WebRTC audio/video signaling offer. |
| `webrtc:answer` | `{ to: string, answer: RTCSessionDescriptionInit }` | WebRTC audio/video signaling answer. |
| `webrtc:ice-candidate`| `{ to: string, candidate: RTCIceCandidate }` | WebRTC ICE candidate exchange. |

### Server -> Client Events

| Event Name | Payload Structure | Description |
|---|---|---|
| `user-joined` | `{ socketId, userId, userName, role, participants }` | Broadcast when a peer enters the room. |
| `room-state` | `{ code, systemDesign, participants, token }` | Initial synchronized state upon joining. |
| `code-update` | `{ code: string }` | Real-time code update from current token holder. |
| `coding:token:update` | `{ token: { holderUserId, holderUserName } }` | Notifies room of coding token ownership changes. |
| `coding:token:rejected`| `{ message: string }` | Dispatched if user attempts edits without permissions. |
| `chat:message` | `{ id, userId, sender, role, text, timestamp }` | Incoming chat message broadcast to room. |
| `system-design:update`| `{ nodes, edges, diagramNotes }` | Live whiteboard canvas update. |
| `question:change` | `{ questionIndex: number }` | Active question navigation event. |
| `interview:started` | `{ interviewId: string }` | Broadcast to waiting room when session begins. |
| `interview:completed`| `{ interviewId: string }` | Broadcast when session is terminated. |
