# IntervAI — Interview Operational Workflow & Scoring Guide

A comprehensive guide to conducting, participating in, and evaluating technical interviews on IntervAI.

---

## 👔 1. Interviewer (Company) Guide

### Step 1: Pre-Interview Configuration
1. Log in to your Company account at [http://localhost:5179/login](http://localhost:5179/login).
2. Click **Create Interview** from the main dashboard.
3. Configure interview parameters:
   - **Title & Description**: e.g., *"Staff Systems Engineer Assessment"*.
   - **Duration**: Target session time in minutes (default: 60).
   - **Monitoring Policy**: Toggle Fullscreen requirement, Tab-switch detection, Copy-paste restrictions, and Max Violation threshold.
4. Attach questions:
   - Choose pre-existing questions from your **Question Bank**.
   - Or click **Generate with AI** to create new questions via Gemini matching target role, skills, and mode (`DSA`, `CORE_CS`, `PROJECT`, `MIXED`).
5. Finalize creation and copy the generated room code (`INT-XXXXXX`).

### Step 2: Live Room Orchestration
1. When ready, click **Start Session** on the interview card (`CREATED` -> `ACTIVE`).
2. Enter the live room. The synchronized workspace provides:
   - **Monaco Code Editor**: Real-time collaborative IDE.
   - **Question Navigator**: Switch between coding problems, MCQs, and text challenges.
   - **Token Controller**: Grant and revoke editing access to candidate.
   - **System Design Tab**: Collaborative whiteboard for architecture discussions.
   - **Private Company Notes**: Take real-time notes that persist to MongoDB.
   - **Integrity Event Feed**: Live alerts if the candidate blurs the window, switches tabs, or hides their camera.

### Step 3: Concluding Session & AI Reporting
1. Click **End Interview**. The session status updates to `COMPLETED`.
2. The platform automatically aggregates:
   - All code submissions and test execution outcomes.
   - Timestamped integrity logs and severity classifications.
   - Real-time candidate communications and interviewer notes.
3. Gemini processes these metrics to generate the **Final Interview Report** with radar charts, topic breakdowns, and an AI executive summary.

---

## 🎓 2. Candidate (Student) Guide

### Step 1: Registration & Hardware Check
1. Register an account at [http://localhost:5179/login?tab=register](http://localhost:5179/login?tab=register).
2. Enter your assigned **Room Code** (e.g., `INT-9D821C`) on your Candidate Dashboard.
3. Enter the **System Verification Screen**:
   - Complete browser camera and microphone permissions check.
   - Accept the proctoring guidelines and fullscreen mode prompt.
   - Optional: Scan the on-screen QR code with your smartphone to link your secondary camera.

### Step 2: Waiting Room
- While the session status is `CREATED`, candidates remain in the Waiting Room.
- The interface automatically monitors session state and unlocks access the moment the interviewer clicks **Start Session**.

### Step 3: In-Interview Experience
- **Live Coding**: Write your algorithm in Monaco Editor. Request edit access if the editor is in read-only mode.
- **Run Tests**: Execute your code against sample inputs using **Run Code** (powered by Judge0).
- **Submit**: Click **Submit Solution** for authoritative scoring against hidden test cases.
- **Live Chat**: Communicate with your interviewer via the real-time chat panel.
- **System Design**: Collaborate on architecture diagrams when requested.

---

## 🛡️ 3. Proctoring & Anti-Cheating Standards

IntervAI employs multi-layered proctoring rules enforced through browser hooks and MediaPipe vision models:

| Violation Code | Trigger Condition | Severity | Penalty |
|---|---|---|---|
| `TAB_HIDDEN` | Candidate unfocuses window or switches browser tab | High | -10 Integrity Score |
| `FULLSCREEN_EXIT` | Candidate exits required fullscreen mode | Medium | -5 Integrity Score |
| `NO_FACE` | Primary webcam detects no face for > 5 consecutive seconds | High | -10 Integrity Score |
| `MULTIPLE_FACES` | More than one face detected in camera viewport | High | -15 Integrity Score |
| `PROHIBITED_OBJECT` | Computer vision detects mobile phones or unauthorized hardware | High | -20 Integrity Score |
| `COPY` / `PASTE` | Copy-paste activity detected inside editor when disabled | Low | -2 Integrity Score |

*All violations include precise UTC timestamps and metadata, accessible in the post-interview report for manual audit.*

---

## 📊 4. Scoring & Measurement Rubric

IntervAI computes five quantitative dimensions for every completed interview:

$$\text{Overall Score} = (0.40 \times \text{Technical}) + (0.30 \times \text{Coding}) + (0.15 \times \text{Communication}) + (0.15 \times \text{Integrity})$$

1. **Coding Score (0–100)**: Percentage of authoritative test cases passed across all coding questions.
2. **Technical Score (0–100)**: AI evaluation of algorithm efficiency, data structure choices, and time/space complexity.
3. **Communication Score (0–100)**: AI measurement of reasoning clarity, documentation, and chat responsiveness.
4. **Integrity Score (0–100)**: Base 100 minus cumulative violation penalties.
5. **Overall Score (0–100)**: Weighted composite benchmark.
