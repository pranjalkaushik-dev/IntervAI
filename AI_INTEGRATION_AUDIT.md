# AI Integration Audit

## Scope and result

This audit traces AI-facing frontend flows through the Express/Socket.IO backend, the internal `ai-monitoring` HTTP service, Gemini calls, persistence, and UI result handling. It distinguishes Gemini-backed operations from local computer-vision/browser monitoring and from features that are only partially implemented.

**Overall:** the main AI workflows have connected request, persistence, and display paths, but a full production end-to-end pass was not possible in this environment. No Gemini key or MongoDB-backed browser session was used. The AI service's authentication and unavailable-model responses were smoke-tested; all end-to-end/model-dependent rows remain **partially integrated** until exercised with a configured model and real interview participants.

## Integration matrix

| AI feature | Frontend entry point | Backend route/event | AI service/model call | Persistence | Result displayed | Test result |
|---|---|---|---|---|---|---|
| Interview question generation | `client/src/components/interview/AIQuestionGeneratorModal.jsx` | `POST /api/questions/generate-ai`; optional save via `POST /api/questions/bulk` | `/api/ai/generate-questions` → configured Gemini model; structured question response is validated and quality-checked | Generated questions are shown in the modal; saved questions are inserted into the selected interview | Generated question list, selection, save confirmation, and request errors | **Partially integrated** — service question-generation tests pass, but no live Gemini/API/database/UI flow was run |
| AI mock-interview questions | `client/src/pages/MockInterviewsPage.jsx`, interview setup in `client/src/pages/InterviewRoomPage.jsx` | `POST /api/interviews/mock` | `/api/ai/generate-questions` → Gemini; curated fallback is used when generation fails | Questions and source (`AI` or `FALLBACK`) plus interview generation status/message are saved | Candidate sees the questions and an explicit fallback notice when applicable | **Partially integrated** — fallback behavior and existing service tests are covered; full mock creation was not run against MongoDB/Gemini |
| Resume parsing and resume-based questions | `client/src/components/interview/ResumeUploadPanel.jsx`; interviewer action in `client/src/components/interview/InterviewReportPanel.jsx` | `POST /api/interviews/:id/resume/upload`; `POST /api/interviews/:id/resume/generate-questions` or `POST /api/questions/generate-ai` | `/api/ai/parse-resume` and `/api/ai/generate-questions` → Gemini | Extracted profile, `aiParsingStatus`, and message are stored on the interview; generated questions are stored as interview questions | Parsed profile or explicit unavailable message; generated questions receive a save confirmation | **Partially integrated** — parser validation/failure tests pass; file upload and model-backed question creation were not run end-to-end |
| Interviewer adaptive assistant | `client/src/components/interview/InterviewAssistantPanel.jsx` | `POST /api/ai/interview-assistant`; then `POST /api/interviews/:id/adaptive-turn` | Evaluates the supplied answer and generates a follow-up using Gemini | Evaluated interviewer-entered turns are stored on the interview | Scores, recommendation, feedback, and a locally advanced next question | **Partially integrated** — returned turn is persisted, but generated follow-ups do not automatically advance the shared candidate question index; answer entry is manual |
| Candidate text/MCQ answer evaluation | `client/src/components/interview/QuestionResponsePanel.jsx` | `POST /api/interviews/:id/text-submit`; asynchronous `answer:evaluated` Socket.IO event | `/api/ai/interview-assistant` → answer evaluation and adaptive assistant | `Answer` and pending/completed evaluation are persisted; completed turn is reflected in the interview | Pending, completed, or failed status and actual evaluation scores/summary; early socket results are buffered until the answer ID arrives | **Partially integrated** — AI service tests pass, but candidate/interviewer socket delivery with MongoDB and Gemini was not exercised |
| Coding solution feedback | `client/src/components/interview/EditorPane.jsx`, `client/src/components/interview/MonitorPanel.jsx` | `POST /api/coding/submit` | `/api/ai/coding-evaluation` → Gemini; backend supplies server-derived test results | Submission stores authoritative test results, feedback, and `aiFeedbackStatus` | Actual feedback/complexity metrics or an unavailable status | **Partially integrated** — service evaluation tests pass; Judge0 + Gemini + persisted UI flow was not run |
| System-design evaluation | `client/src/components/interview/SystemDesignCanvas.jsx` | `POST /api/interviews/:id/system-design/submit`; `GET /api/interviews/:id/system-design/evaluation`; optional `system-design:change` updates | `/api/ai/system-design-evaluation` → Gemini; response is parsed and Zod-validated | Canvas state, submission, evaluation, and `aiEvaluationStatus` are stored | Scores, strengths, bottlenecks, and suggestions, or a saved-but-unavailable message | **Partially integrated** — new response-validation and model-failure tests pass; no persisted browser submission was run |
| Interview report and AI summary | `client/src/components/interview/InterviewReportPanel.jsx`, `client/src/pages/InterviewReportPage.jsx` | `POST /api/interviews/:id/complete` builds a report; `POST /api/interviews/:id/report/generate` regenerates; `GET /api/interviews/:id/report` retrieves | `/api/ai/final-report` → Gemini; backend uses measured scores and falls back to a metrics-based summary | Report metrics, summary, and `aiSummaryStatus` are saved | The UI distinguishes a Gemini-generated summary from a metrics-based fallback | **Partially integrated** — failure paths are explicit and report persistence is implemented; report generation was not run with MongoDB/Gemini |
| Live camera-based candidate monitoring | `client/src/components/interview/CvProctoringPanel.jsx` (kept mounted by `MonitorPanel.jsx`) | Candidate emits `monitoring:violation`; `POST /api/monitoring/violations` is the REST equivalent | Local MediaPipe face/object/face-landmark models; this does **not** call Gemini or the AI HTTP service | Violation events are persisted as `ViolationLog` records when the authenticated candidate is in an active interview | Local detection state and last event on the candidate; persisted alerts feed the interviewer monitor | **Partially integrated** — authenticated active-candidate persistence is wired; camera permissions, MediaPipe runtime, and a two-browser recipient flow were not tested |
| Browser visibility events | `client/src/components/interview/MonitorPanel.jsx` | `monitoring:violation` → server validation/persistence → `violation-alert` | No AI model call; the live page reports tab-hidden events only | Persisted as a violation log | Candidate receives persistence errors; interviewer sees persisted alerts | **Partially integrated** — event path is implemented but not verified in a live Socket.IO session |
| Broader browser/media monitoring (fullscreen exit, copy/paste, camera/mic track changes) | No live frontend entry point found; `ai-monitoring/src/browser-monitoring/monitor.ts` and `src/proctoring/session.ts` are standalone modules | No route or live event wiring found for these module callbacks | No Gemini call; standalone browser event monitor only | No production persistence path found | Not displayed by the interview UI | **Missing** — the standalone module's tests do not mean the live interview runs it |
| Secondary-camera AI analysis / suspicious-behavior classification | Secondary camera pairing UI and WebRTC signaling exist; no AI analysis entry point found | `/api/monitoring/dual-camera/token` and `dual-camera:*` signaling events | No AI/model call found | Video stream is not persisted as an AI result; no secondary-camera evaluation record found | Video connection state may be shown; no AI finding is displayed | **Missing** as an AI feature — pairing/signaling is not analysis. No Gemini-based behavior/violation classification is implemented |
| AI service status indicator | `client/src/pages/AdminSystemPage.jsx` | Admin system status route queries AI service `GET /health` | No model invocation; health reports process and configuration presence | Not persisted | Shows configuration state for service, key presence, and shared-token configuration | **Partially integrated** — smoke-tested status reports configuration only; it is not evidence that Gemini is reachable or that an interview feature succeeded |

## Monitoring behavior and boundaries

- The live page's camera checks run in the candidate's browser using MediaPipe. The AI service does not receive camera frames or classify candidate conduct.
- Browser-tab visibility is wired to violation persistence. The separate browser monitor's fullscreen, copy/paste, and media-track handlers are not mounted by the interview page.
- Violation persistence derives the student identity from authenticated REST/socket credentials and requires the active interview candidate. Socket-originated events also require the authenticated socket to have joined the matching room. Student retrieval is limited to that student's records; owner/admin access is checked.
- CV monitoring is mounted independently of the selected monitor tab, but is cleaned up when the interview component unmounts. Camera/model startup and failure are surfaced in the candidate UI.
- Secondary-camera WebRTC signaling does not feed a model and must not be described as AI monitoring.
- The adaptive assistant returns and stores interviewer-entered turns, but its generated next question is local to the assistant UI rather than a shared candidate question transition.

## Configuration and failure handling

- The browser calls the main backend; it does not call the AI service directly.
- The backend uses `AI_MONITORING_URL` and the shared `AI_SERVICE_TOKEN`; the AI service requires the matching bearer token on every `/api/ai/*` operation. Configure the same unpredictable secret in `server/.env` and `ai-monitoring/.env`.
- The Gemini client uses `GEMINI_API_KEY` and `GEMINI_MODEL` (default `gemini-3-flash-preview`). `/health` reports whether these settings are present, not whether a live model request succeeds.
- Backend calls use a 30-second timeout. AI-service errors are returned generically rather than exposing the model prompt or provider error. Resume, system-design, coding, and report paths retain their non-AI data where designed and expose an unavailable/failure status rather than claiming AI success.
- Resume parsing sends extracted resume text to the configured Gemini provider. The AI service truncates the prompt input; it does not log the prompt or return it to clients.

### Local environment audit (2026-10-10)

Environment values were checked without printing secret contents:

- `server/.env` exists and has `AI_MONITORING_URL` configured to `http://localhost:5050`; `AI_SERVICE_TOKEN` is configured and exactly matches the AI service token.
- `ai-monitoring/.env` exists and has a non-placeholder `GEMINI_API_KEY`; `GEMINI_MODEL` is explicitly set to `gemini-3.6-flash` (the documented default `gemini-3-flash-preview` applies only when it is unset).
- The client `.env` had an unused `VITE_AI_MONITORING_URL`; it was removed. Frontend source only reads `VITE_API_URL` and `VITE_SOCKET_URL`, and the checked production bundle contained no Gemini key/token markers.
- Backend `dotenv.config()` was moved before route/controller imports so module-level AI service URL constants see values from `server/.env`.
- On the latest readiness check, the backend was restarted on port 5001, MongoDB Atlas connected successfully, and legacy role/status normalization completed. The React development server responds on port 5179.
- The AI service runs on port 5050 and `/health` reports `CONFIGURED`. The AI-service token was synchronized to the existing backend token (no credential was printed or newly generated). An unauthenticated AI request returned `401`; a synthetic request authenticated with the backend-configured token returned `200` with structured resume output, exercising Gemini. Missing/mismatched-token and missing-Gemini-key failure paths were also verified using an isolated test instance; they returned `401` and generic `503`, respectively.

**Current readiness:** backend, frontend, AI service, MongoDB, and direct backend-token-to-AI/Gemini authentication checks pass. A fully authenticated browser interview workflow (including app-user login/permissions and UI result rendering), provider/model error behavior, and timeout behavior remain unverified. Keep the shared token out of all `VITE_*` variables. Local `.env` files remain git-ignored, and no credential values were printed.

## Confirmed fixes in this audit

- Aligned interviewer-assistant payload names and persisted turns; corrected system-design notes and API response-envelope handling.
- Removed fabricated resume-parser/system-design output and exposed parsing/evaluation status.
- Made coding feedback derive from backend-authoritative test results and persist its availability status.
- Made asynchronous answer-event handling tolerate an event arriving before the HTTP response and removed duplicate backend socket emission.
- Removed duplicate report generation at interview completion and made report fallback text/status explicit on interviewer and report-page surfaces.
- Marked mock questions as AI or curated fallback, and surface the fallback state.
- Protected internal AI-service routes with a shared backend-only token and made monitoring violations depend on authenticated active interview participation.
- Corrected candidate monitoring labels/status so camera permission or local detection does not imply a Gemini analysis.
- Corrected answer-submission failure UI so a failed submission is not presented as an evaluation still running.

## Verification evidence and limitations

- AI service: **34 test files, 187 tests passed** (includes parser and system-design failure/validation coverage added during this audit).
- AI service TypeScript typecheck: passed.
- Client production build: passed. Vite reports existing bundle/chunk-size and ineffective-dynamic-import warnings.
- Client lint: passed with warnings; warnings include pre-existing unused imports and React-hook/state-effect diagnostics, including touched files. No lint failure occurred.
- AI service smoke test without Gemini credentials: `/health` returned `200` with `DEGRADED` and configuration flags; unauthenticated AI request returned `401`; authenticated request with no configured Gemini key returned generic `503`.
- Backend changed JavaScript files passed `node --check`; `git diff --check` passed.
- Not verified: live Gemini responses; MongoDB persistence with real records; full browser journey for question generation, resume upload, system-design/coding/report workflows; camera permission/model loading; two-browser Socket.IO alerts or WebRTC pairing. These rows are therefore not marked **verified**.
