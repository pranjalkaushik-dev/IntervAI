# IntervAI — Collaborative Coding & AI-Assisted Technical Interview Platform

> **NIE Information Science & Engineering — Major Project (Batch B-2)**  
> An enterprise-grade, end-to-end technical interview platform combining real-time collaborative coding, authoritative Judge0 code execution, Gemini-powered AI evaluation, CV & browser proctoring, WebRTC dual-camera verification, system design whiteboard, and automated reporting.

---

## 🚀 Overview

IntervAI transforms technical hiring and skill assessment with a synchronized workspace for interviewers and candidates:

- **Real-Time Code Collaboration:** Token-controlled concurrent editing with Monaco Editor and Socket.IO.
- **Authoritative Judge0 Execution:** Sandboxed code execution supporting multiple languages (Python, JavaScript, TypeScript, C++, Java, C) with hidden test-case validation.
- **Adaptive AI Interviewer:** Powered by Google Gemini (`gemini-3.6-flash`), dynamically evaluating responses, adjusting difficulty, and asking context-aware follow-up questions.
- **Full-Spectrum Proctoring:** Computer vision face verification (MediaPipe), tab-switch tracking, fullscreen enforcement, prohibited object detection, and secondary mobile-camera pairing over WebRTC.
- **System Design Canvas:** Interactive node-and-edge whiteboard for software architecture interviews with real-time sync and AI evaluation.
- **Automated AI Final Reports:** Comprehensive measurement of technical correctness, coding speed, communication skills, and integrity compliance with instant executive summaries.

---

## 🏗️ Architecture & Services

The platform consists of three core services running concurrently:

| Service | Port / URL | Tech Stack | Purpose |
|---|---|---|---|
| **Frontend Client** | `http://localhost:5179` | React 19, Vite, TailwindCSS, Monaco Editor | Responsive web app with RBAC dashboards, live interview room, and waiting room |
| **Backend API** | `http://localhost:5001` | Node.js, Express, Socket.IO, Mongoose, JWT | REST API, real-time collaboration gateway, Judge0 proxy, proctoring persistence |
| **AI Monitoring** | `http://localhost:5050` | Node.js, TypeScript, LangChain, Google Gemini GenAI | AI evaluation, adaptive interview questions, resume parsing, architecture analysis |
| **Database** | MongoDB Atlas / Local `27017` | MongoDB 7+ | Normalized document persistence for users, interviews, submissions, violations, and reports |

> *Note: Port `5001` is used instead of `5000` because macOS commonly reserves port 5000 for AirPlay Receiver/ControlCenter.*

---

## 👥 Role-Based Access Control (RBAC)

The application provides tailored experiences based on three distinct roles:

1. **`COMPANY` (Interviewer)**
   - Create, schedule, and configure interviews with custom proctoring rules.
   - Question bank management and AI-powered question generator.
   - Live interview controls: start/end sessions, grant coding tokens, take private notes.
   - View candidate directory, integrity violation feeds, and AI final reports.

2. **`STUDENT` (Candidate)**
   - Public self-registration and profile management.
   - Join interviews via room code (`INT-XXXXXX`).
   - Hardware check & waiting room with automatic entry when the session goes live.
   - Collaborative code editor, Judge0 test runner, system design whiteboard, and live chat.
   - Secondary mobile-camera pairing via QR code.

3. **`ADMIN` (Platform Administrator)**
   - User account lifecycle management and company provisioning.
   - System analytics, report auditing, and platform health status.

---

## ⚡ Quick Start & Setup

### Prerequisites
- **Node.js**: `>= 20.19.0`
- **npm**: `>= 10.0.0`
- **MongoDB**: Active MongoDB Atlas cluster or local MongoDB instance running on port `27017`.
- **Google Gemini API Key**: For AI evaluation and question generation.

### 1. Automated Start (All Services)

Run the root development launcher:

```bash
chmod +x start-dev.sh
./start-dev.sh
```

### 2. Manual Service Setup

#### Backend API
```bash
cd server
cp .env.example .env
# Configure MONGODB_URI and JWT_SECRET
npm install
npm run dev
```

#### AI Monitoring Service
```bash
cd ai-monitoring
cp .env.example .env
# Set GEMINI_API_KEY and GEMINI_MODEL=gemini-3.6-flash
npm install
npm run dev
```

#### Frontend Client
```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Open [http://localhost:5179](http://localhost:5179) in your browser.

---

## ⚙️ Environment Configuration

### Backend (`server/.env`)
```ini
PORT=5001
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/intervai
JWT_SECRET=your-secure-random-jwt-secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5179
AI_MONITORING_URL=http://localhost:5050
JUDGE0_API_URL=https://ce.judge0.com
JUDGE0_API_KEY=
NODE_ENV=development
PUBLIC_CLIENT_URL=http://localhost:5179
```

### AI Service (`ai-monitoring/.env`)
```ini
AI_MONITORING_PORT=5050
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.6-flash
CLIENT_URL=http://localhost:5179
```

### Frontend (`client/.env`)
```ini
VITE_API_URL=http://localhost:5001
VITE_SOCKET_URL=http://localhost:5001
VITE_AI_MONITORING_URL=http://localhost:5050
```

---

## 🔄 End-to-End Interview Flow

1. **Schedule**: Interviewer creates an interview with duration, questions, and monitoring parameters. System generates a unique room code (e.g., `INT-9D821C`).
2. **Waiting Room**: Candidate enters the room code, completes camera/mic hardware checks, and waits in a verified state while the session is `CREATED`.
3. **Start**: Interviewer clicks **Start Session** (`CREATED` -> `ACTIVE`). Candidate is admitted immediately.
4. **Collaboration**:
   - Both participants connect via authenticated Socket.IO rooms.
   - Interviewer grants coding control via a tokenized permission system.
   - Monaco Editor synchronizes keystrokes, cursors, and language selection.
5. **Code Execution**: Candidate runs solutions against sample cases via Judge0. Upon submission, backend validates hidden test cases authoritatively.
6. **AI Evaluation**: Gemini evaluates algorithm complexity, code quality, and technical correctness.
7. **Proctoring**: Real-time violation logs (tab blur, multiple faces, absent candidate) stream over WebSockets and persist to MongoDB.
8. **Completion**: Interviewer clicks **End Interview** (`ACTIVE` -> `COMPLETED`).
9. **Final Report**: The system compiles technical scores, coding benchmarks, integrity scores, and an AI executive summary.

---

## 📚 Detailed Documentation

- 📐 **[System Architecture](ARCHITECTURE.md)**: Deep dive into Socket.IO token control, WebRTC signaling, Judge0 sandbox, and data models.
- 📡 **[API Documentation](API_DOCUMENTATION.md)**: Complete REST API and WebSocket event contracts.
- 🎯 **[Interview Workflow](INTERVIEW_WORKFLOW.md)**: Step-by-step operational handbook for interviewers and candidates.
- 💻 **[Frontend Guide](client/README.md)**: Component hierarchy, state management, and styling specifications.
