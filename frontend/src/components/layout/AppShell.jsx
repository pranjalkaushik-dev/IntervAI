import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Video,
  BookOpen,
  BarChart3,
  Settings,
  LogOut,
  Users,
  Code2,
  FileText,
  Sparkles,
  Building2,
  UserCog,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const studentItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'My Interviews', path: '/interviews', icon: Video },
  { label: 'Coding Rooms', path: '/rooms', icon: Code2 },
  { label: 'Mock Practice', path: '/practice', icon: Sparkles },
  { label: 'Performance Reports', path: '/reports', icon: FileText },
  { label: 'Settings', path: '/settings', icon: Settings },
];

const companyItems = [
  { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Interviews', path: '/interviews', icon: Video },
  { label: 'Question Bank', path: '/questions', icon: BookOpen },
  { label: 'Candidates', path: '/students', icon: Users },
  { label: 'Analytics', path: '/analytics', icon: BarChart3 },
  { label: 'Settings', path: '/settings', icon: Settings },
];

const adminItems = [
  { label: 'Overview', path: '/admin', icon: LayoutDashboard },
  { label: 'Users', path: '/admin/users', icon: UserCog },
  { label: 'Companies', path: '/admin/companies', icon: Building2 },
  { label: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
  { label: 'System Settings', path: '/settings', icon: Settings },
];

const initials = (name) =>
  (name || 'User')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

const isActiveRoute = (location, path) => {
  if (location.pathname === path) return true;
  if (path === '/students' && (location.pathname === '/candidates' || location.pathname.startsWith('/candidates/'))) return true;
  if (path === '/interviews' && location.pathname.startsWith('/reports/')) return true;
  if (path !== '/dashboard' && path !== '/admin' && location.pathname.startsWith(path + '/')) return true;
  return false;
};

export default function AppShell({ children }) {
  const { user, logout, isCompany, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const items = isAdmin ? adminItems : isCompany ? companyItems : studentItems;
  const roleName = isAdmin ? 'Admin' : isCompany ? 'Company' : 'Candidate';
  const currentItem = items.find((item) => isActiveRoute(location, item.path));

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="ref-app-shell">
      {/* Clean, Non-intrusive Sidebar */}
      <aside className="ref-app-sidebar">
        <Link to={isAdmin ? '/admin' : '/dashboard'} className="ref-app-brand">
          <span className="ref-app-brand-mark">
            <Code2 size={16} />
          </span>
          <span>
            Interv<span>AI</span>
          </span>
        </Link>

        <nav className="ref-app-nav">
          <div className="ref-app-nav-label">
            {isAdmin ? 'Administration' : isCompany ? 'Interview Platform' : 'Candidate Workspace'}
          </div>
          {items.map(({ label, path, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`ref-app-nav-item ${isActiveRoute(location, path) ? 'active' : ''}`}
            >
              <Icon size={16} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        {/* Compact Account Footer without decorative green banner */}
        <div className="ref-app-sidebar-bottom">
          <div className="p-2 mb-2 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <div className="text-xs font-semibold text-slate-900 truncate">
                {user?.fullName || 'User'}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                {roleName} &bull; {user?.email}
              </div>
            </div>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
              {roleName}
            </span>
          </div>

          <button
            type="button"
            className="ref-app-nav-item hover:text-rose-600 hover:bg-rose-50 transition-colors"
            onClick={handleLogout}
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="ref-app-main">
        <header className="ref-app-topbar">
          <div className="ref-app-title-group">
            <strong>IntervAI</strong>
            <span>
              {isAdmin ? 'Administration' : isCompany ? 'Company Workspace' : 'Candidate Workspace'}
            </span>
          </div>

          <div className="ref-app-top-actions">
            <div className="ref-app-breadcrumb">
              Workspace <span>/</span> <b>{currentItem?.label || 'Overview'}</b>
            </div>

            <button
              className="ref-app-user-chip"
              onClick={() => navigate('/settings')}
              title="Account Settings"
            >
              <span className="ref-app-avatar small">{initials(user?.fullName)}</span>
              <span>
                <strong>{user?.fullName || 'User'}</strong>
                <small>{roleName}</small>
              </span>
            </button>
          </div>
        </header>

        <main className="ref-app-content">{children}</main>
      </div>
    </div>
  );
}
