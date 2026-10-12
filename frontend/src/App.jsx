import React from 'react';
import { useParams } from 'react-router-dom';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/common/ProtectedRoute';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import InterviewerDashboard from './pages/InterviewerDashboard';
import CandidateDashboard from './pages/CandidateDashboard';
import CandidateJoinPage from './pages/CandidateJoinPage';
import CandidateWaitingRoom from './pages/CandidateWaitingRoom';
import InterviewRoomPage from './pages/InterviewRoomPage';
import QuestionBankPage from './pages/QuestionBankPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import MockInterviewsPage from './pages/MockInterviewsPage';
import CodingRoomsPage from './pages/CodingRoomsPage';
import CandidatesPage from './pages/CandidatesPage';
import InterviewReportPage from './pages/InterviewReportPage';
import DualCameraPairPage from './pages/DualCameraPairPage';
import AdminDashboard from './pages/AdminDashboard';
import InterviewsPage from './pages/InterviewsPage';
import CreateInterviewPage from './pages/CreateInterviewPage';
import InterviewDetailsPage from './pages/InterviewDetailsPage';
import InterviewRoomByIdRoute from './pages/InterviewRoomByIdRoute';
import ReportsPage from './pages/ReportsPage';
import AdminReportsPage from './pages/AdminReportsPage';
import AdminSystemPage from './pages/AdminSystemPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminCompaniesPage from './pages/AdminCompaniesPage';
import AdminAnalyticsPage from './pages/AdminAnalyticsPage';
// Layout
import AppShell from './components/layout/AppShell';

// DashboardRoute: Renders role-based dashboard inside AppShell
function DashboardRoute() {
  const { isCompany, isAdmin } = useAuth();
  return (
    <AppShell>
      {isAdmin ? <AdminDashboard /> : isCompany ? <InterviewerDashboard /> : <CandidateDashboard />}
    </AppShell>
  );
}

// AuthRedirect: Redirects authenticated users away from login/landing
function LegacyReportRedirect() {
  const { id } = useParams();
  return <Navigate to={`/reports/${id}`} replace />;
}

function AuthRedirect({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-arena-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-arena-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/"
        element={
          <AuthRedirect>
            <LandingPage />
          </AuthRedirect>
        }
      />
      <Route
        path="/login"
        element={
          <AuthRedirect>
            <LoginPage />
          </AuthRedirect>
        }
      />

      <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><AppShell><AdminDashboard /></AppShell></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['ADMIN']}><AppShell><AdminUsersPage /></AppShell></ProtectedRoute>} />
      <Route path="/admin/companies" element={<ProtectedRoute allowedRoles={['ADMIN']}><AppShell><AdminCompaniesPage /></AppShell></ProtectedRoute>} />
      <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['ADMIN']}><AppShell><AdminAnalyticsPage /></AppShell></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminReportsPage /></ProtectedRoute>} />
      <Route path="/admin/system" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminSystemPage /></ProtectedRoute>} />

      {/* Protected: Dashboard (role-adaptive) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardRoute />
          </ProtectedRoute>
        }
      />

      {/* Protected: Interviews list */}
      <Route
        path="/interviews"
        element={
          <ProtectedRoute>
            <AppShell>
              <InterviewsPage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route path="/interviews/create" element={<ProtectedRoute allowedRoles={['COMPANY']}><CreateInterviewPage /></ProtectedRoute>} />
      <Route path="/interviews/:id/room" element={<ProtectedRoute><InterviewRoomByIdRoute /></ProtectedRoute>} />
      <Route path="/interviews/:id" element={<ProtectedRoute><InterviewDetailsPage /></ProtectedRoute>} />

      {/* Protected: Join Room */}
      <Route
        path="/join"
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <AppShell>
              <CandidateJoinPage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/waiting/:roomCode"
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <CandidateWaitingRoom />
          </ProtectedRoute>
        }
      />

      {/* Protected: Collaborative Interview Room (full-screen, no sidebar) */}
      <Route
        path="/room/:roomCode"
        element={
          <ProtectedRoute>
            <InterviewRoomPage />
          </ProtectedRoute>
        }
      />

      {/* Protected: Question Bank (Company only) */}
      <Route
        path="/questions"
        element={
          <ProtectedRoute allowedRoles={['COMPANY']}>
            <AppShell>
              <QuestionBankPage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route path="/students" element={<ProtectedRoute allowedRoles={['COMPANY']}><AppShell><CandidatesPage /></AppShell></ProtectedRoute>} />
      <Route path="/candidates" element={<Navigate to="/students" replace />} />

      {/* Protected: Analytics (Company only) */}
      <Route
        path="/analytics"
        element={
          <ProtectedRoute allowedRoles={['COMPANY']}>
            <AppShell>
              <AnalyticsPage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      {/* Protected: Practice & Mock Interviews */}
      <Route
        path="/practice"
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <AppShell>
              <MockInterviewsPage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      {/* Protected: Coding Rooms */}
      <Route
        path="/rooms"
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <AppShell>
              <CodingRoomsPage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      {/* Protected: Interview Report */}
      <Route
        path="/reports"
        element={
          <ProtectedRoute allowedRoles={['STUDENT', 'COMPANY']}>
            <ReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/:id"
        element={
          <ProtectedRoute>
            <AppShell>
              <InterviewReportPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route path="/report/:id" element={<LegacyReportRedirect />} />

      {/* Secondary camera pairing uses its signed pairing token and does not require the main JWT. */}
      <Route path="/dual-camera" element={<DualCameraPairPage />} />

      {/* Protected: Settings */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AppShell>
              <SettingsPage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      {/* Fallback: Redirect unknown routes to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
