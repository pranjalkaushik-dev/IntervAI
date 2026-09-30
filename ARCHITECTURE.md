# IntervAI — System Architecture & Technical Design

This document details the architectural principles, component interactions, security mechanisms, and data topologies that power the **IntervAI** technical interview platform.

---

## 🏛️ High-Level System Architecture

```
                                  ┌───────────────────────────────┐
                                  │      Client Web Application    │
                                  │   (React 19 + Vite @ 5179)    │
                                  └──────────────┬────────────────┘
                                                 │
                     HTTP REST / JSON            │            WebSocket (Socket.IO)
         ┌───────────────────────────────────────┴────────────────────────────────────────┐
         │                                                                                │
         ▼                                                                                ▼
┌─────────────────────────────────┐                                            ┌──────────────────────────────────┐
│       Backend API Server        │                                            │       Socket.IO Gateway          │
│    (Express + Node.js @ 5001)   │◄──────────────────────────────────────────►│      (Port 5001 Stateful)        │
└────────┬──────────────┬─────────┘                                            └────────────────┬─────────────────┘
         │              │                                                                       │
         │              │ HTTP Proxy                                                            │ Signaling & Events
         │              ▼                                                                       ▼
         │       ┌────────────────────────────────┐                            ┌──────────────────────────────────┐
         │       │    Judge0 Sandbox Engine       │                            │     WebRTC Mesh / Dual-Cam       │
         │       │     (https://ce.judge0.com)    │                            │    Peer-to-Peer Audio/Video      │
         │       └────────────────────────────────┘                            └──────────────────────────────────┘
         │
         ├────────────────────────────────────────┐
         │ Internal HTTP POST                     │
         ▼                                        ▼
┌─────────────────────────────────┐      ┌────────────────────────────────┐
│      AI Monitoring Engine       │      │        MongoDB Database        │
│   (TypeScript / LangChain 5050) │      │     (Atlas / Replica Set)      │
└────────┬────────────────────────┘      └────────────────────────────────┘
         │
         ▼ Google Generative AI API
┌─────────────────────────────────┐
│     Google Gemini 3.6 Flash     │
└─────────────────────────────────┘
```

---

## 🧩 Core Architecture Subsystems

### 1. Real-Time Collaboration & Token-Based Coding Control

In collaborative technical interviews, concurrent typing conflicts can lead to code corruption. IntervAI implements a **Server-Side Token-Controlled Mutex**:

- **Room Initialization**: When an interview session starts, the room owner (Company) holds or controls the coding token.
- **Requesting Token**: Candidates emit `coding:token:request`.
- **Granting Access**: The interviewer grants access via `coding:token:grant` with the target `userId` and `socketId`.
- **Server Enforcement**: When `code-change` events are received, the server validates:
  ```javascript
  if (currentToken && currentToken.holderUserId !== userId) {
    socket.emit('coding:token:rejected', { message: 'Read-only access' });
    return;
  }
  ```
- **Broadcasting Updates**: Valid code changes update the in-memory room map and are broadcast to room peers (`code-update`).

### 2. Dual-Camera WebRTC Verification Pipeline

To combat off-screen assistance, IntervAI provides secondary-device proctoring using WebRTC:

1. **Pairing Token Generation**: Candidate requests a pairing token (`POST /api/monitoring/dual-camera/token`).
2. **QR Code Pairing**: A secure, short-lived JWT token (`type: "DUAL_CAM_PAIRING"`, 15-minute expiration) is encoded into a QR code on the desktop interface.
3. **Mobile Onboarding**: The candidate scans the QR code on a mobile device, opening `/dual-camera?token=...`.
4. **Signaling Handshake**: The secondary device authenticates to the Socket.IO gateway with the pairing token and establishes a WebRTC peer connection directly with the interviewer's dashboard.
5. **Continuous Stream**: The secondary camera provides an over-the-shoulder side view of the candidate's desk, hands, and screens.

### 3. Authoritative Judge0 Execution Architecture

Code execution integrity is maintained through authoritative backend proxying:

- **Information Isolation**: Test cases with `isHidden: true` are stored exclusively in MongoDB and are **never transmitted to the candidate's browser**.
- **Execution Flow**:
  1. Candidate submits solution via `POST /api/coding/submit`.
  2. The backend retrieves the problem's authoritative test suite from MongoDB.
  3. The backend iterates through test cases, dispatching execution jobs to the Judge0 sandbox engine.
  4. Execution outputs (stdout, execution time, memory) are compared against authoritative expected outputs.
  5. Test results and candidate source code are forwarded to the AI service for qualitative evaluation.

### 4. AI Evaluation & Adaptive Interview Pipeline

The AI Monitoring service (`ai-monitoring`) leverages Google Gemini (`gemini-3.6-flash`) with LangChain structured output parsing:

```
[Candidate Code / Answer]
         │
         ▼
[Answer Evaluation Chain] ─────────► [Technical Score (0-100)]
         │                            [Communication Score (0-100)]
         │                            [Strengths & Actionable Improvements]
         ▼
[Adaptive Turn Generator] ─────────► [Follow-Up Decision: FOLLOW_UP | NEXT_QUESTION]
                                      [Difficulty Adjustment: EASY | MEDIUM | HARD]
                                      [Targeted Context-Aware Follow-Up Prompt]
```

- **Resilience & Rate-Limiting**: The engine incorporates exponential backoff retries (`withRetry`) to gracefully handle API quota windows without dropping user sessions.
- **Final Report Generation**: Upon interview conclusion, the backend compiles candidate submissions, test outcomes, proctoring violations, and interviewer notes into a unified payload for Gemini to generate a cohesive factual summary.

---

## 🗄️ Database Schema & Data Models

All entities are managed via Mongoose schemas under MongoDB:

### Entity Relationship Model

```
 ┌──────────────┐         1:N         ┌───────────────┐
 │     User     ├────────────────────►│   Interview   │
 └──────┬───────┘                     └───────┬───────┘
        │                                     │
        │ 1:N                          1:N    │
        ├──────────────────────┐       ┌──────┴──────────────────────┐
        ▼                      ▼       ▼                             ▼
┌───────────────┐      ┌───────────────┐      ┌──────────────┐      ┌─────────────────┐
│ Submission    │      │ ViolationLog  │      │   Question   │      │ InterviewReport │
└───────────────┘      └───────────────┘      └──────────────┘      └─────────────────┘
```

### Schema Summary

1. **`User`** (`modules/auth/auth.model.js`)
   - `fullName`, `email`, `passwordHash` (bcrypt with salt factor 10).
   - `accountRole`: `STUDENT` | `COMPANY` | `ADMIN`.
   - `isActive`, `avatarUrl`.

2. **`Interview`** (`modules/interviews/interview.model.js`)
   - `roomCode`: Unique indexed code (`INT-XXXXXX`).
   - `status`: `CREATED` | `WAITING` | `ACTIVE` | `COMPLETED` | `CANCELLED`.
   - `participants`: Array of `{ user, role, joinedAt, leftAt }`.
   - `settings`: `requireFullscreen`, `allowCopyPaste`, `enableCameraPrototype`, `maxViolations`.
   - `companyNotes`: Text notes saved by the interviewer.
   - `studentResume`: Parsed resume text, detected skills, and metadata.

3. **`Submission`** (`modules/coding/submission.model.js`)
   - `interviewId`, `questionId`, `studentId`.
   - `sourceCode`, `languageId`, `status` (`PASSED` | `FAILED` | `ERROR`).
   - `score`, `testResults`, `aiFeedback`.

4. **`ViolationLog`** (`modules/monitoring/violation.model.js`)
   - `interviewId`, `studentId`, `violationType` (`TAB_HIDDEN`, `NO_FACE`, `MULTIPLE_FACES`, `PROHIBITED_OBJECT`, `FULLSCREEN_EXIT`).
   - `severity`: `LOW` | `MEDIUM` | `HIGH`.
   - `metadata`, `timestamp`.

5. **`InterviewReport`** (`modules/interviews/report.model.js`)
   - `interviewId`, `studentId`.
   - `technicalScore`, `codingScore`, `communicationScore`, `integrityScore`, `overallScore`.
   - `aiSummary`, `strengths`, `improvements`, `topicBreakdown`.

---

## 🔒 Security Architecture

1. **Stateless JWT Authentication**: Signed tokens with 7-day expiration carrying authenticated user ID and role claims.
2. **Authoritative Socket.IO Middleware**: Every WebSocket connection is authenticated against MongoDB; unauthenticated or guest sockets are strictly rejected.
3. **Privilege Separation**: Public registration assigns strictly `STUDENT` roles. Elevated accounts (`COMPANY`, `ADMIN`) must be provisioned through administrator endpoints.
4. **Sandboxed Code Execution**: User code never runs on the application server. All execution occurs within isolated Judge0 containers with CPU and memory limits.
5. **No Client Secret Exposure**: API keys (Gemini, Judge0) and MongoDB credentials exist solely in server-side `.env` files.
