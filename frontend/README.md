# IntervAI — Frontend Web Application

The frontend client for IntervAI is built with **React 19**, **Vite**, and **TailwindCSS**, delivering a responsive, low-latency interview interface with Monaco Editor and WebRTC integration.

---

## 💻 Tech Stack

- **Framework**: React 19 + Vite
- **Styling**: TailwindCSS 3.4 + Custom Glassmorphism Theme (Dark Slate & Indigo)
- **Editor**: `@monaco-editor/react` (4.7.0)
- **Real-Time Client**: `socket.io-client` (4.8.3)
- **Icons**: `lucide-react`
- **Vision Models**: `@mediapipe/tasks-vision`
- **Routing**: `react-router-dom` (6.30.6)

---

## 📁 Project Directory Structure

```
client/
├── src/
│   ├── api/                     # Centralized API service clients (Axios)
│   │   ├── authApi.js           # Authentication & user profile
│   │   ├── interviewApi.js      # Interview lifecycle & management
│   │   ├── codingApi.js         # Judge0 runs, submissions & languages
│   │   ├── monitoringApi.js     # Violations & dual-cam tokens
│   │   └── adminApi.js          # User & company administration
│   ├── components/
│   │   ├── common/              # Shared UI (Navbar, ProtectedRoute, Modal, Button)
│   │   ├── interview/           # Live room components (EditorPane, ChatPanel, VideoGrid)
│   │   ├── system-design/       # Whiteboard canvas & architecture tools
│   │   └── dualcam/             # Secondary camera pairing components
│   ├── context/                 # Global state providers
│   │   ├── AuthContext.jsx      # Session management & user roles
│   │   └── SocketContext.jsx    # Real-time WebSocket connection provider
│   ├── pages/                   # Application views
│   │   ├── LoginPage.jsx        # Unified Login & Register flow
│   │   ├── CandidateDashboard.jsx # Student interview portal
│   │   ├── InterviewsPage.jsx   # Interviewer management dashboard
│   │   ├── InterviewRoomPage.jsx# Live synchronized interview workspace
│   │   ├── InterviewReportPage.jsx # AI performance & analytics report
│   │   ├── DualCameraPage.jsx   # Mobile over-the-shoulder camera feed
│   │   └── AdminDashboard.jsx   # Administrator management portal
│   ├── App.jsx                  # Route definitions & guards
│   ├── main.jsx                 # Application entry point
│   └── index.css                # Global CSS tokens and component utilities
├── vite.config.js               # Vite build configuration
└── package.json
```

---

## 🛡️ Routing & Route Protection

All routes are declared in `src/App.jsx` and guarded with role-based access rules via `ProtectedRoute.jsx`:

- **Public Routes**: `/` (Landing), `/login` (Sign in / Sign up), `/dual-camera` (Mobile pairing).
- **Candidate Protected**: `/dashboard`, `/practice`, `/waiting-room`.
- **Interviewer Protected**: `/interviews`, `/interviews/new`, `/questions`, `/candidates`, `/analytics`.
- **Admin Protected**: `/admin`, `/admin/users`, `/admin/companies`.
- **Shared Live Room**: `/room/:roomCode` (Access validated server-side by interview participation).

---

## ⚙️ Environment Variables

Create `.env` in the `client/` directory:

```ini
# Development Environment
VITE_API_URL=http://localhost:5001
VITE_SOCKET_URL=http://localhost:5001
```

---

## 🛠️ Available Scripts

In the `client` directory:

```bash
# Start local development server (runs on http://localhost:5179)
npm run dev

# Compile production bundle
npm run build

# Preview production build locally
npm run preview

# Run fast code linting via Oxlint
npm run lint
```
