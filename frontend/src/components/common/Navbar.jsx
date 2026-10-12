import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Code2, ArrowRight, Shield, LogOut } from 'lucide-react';
import Button from '../ui/Button';

export default function Navbar() {
  const { user, logout, isCompany } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  if (isAuthPage) return null;

  return (
    <nav className="w-full bg-arena-surface/80 backdrop-blur-md border-b border-arena-border sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-subtle-rim">
              <Code2 className="w-4 h-4" />
            </div>
            <span className="font-display font-bold text-base tracking-tight text-white">
              IntervAI
            </span>
            <span className="text-[10px] font-mono text-arena-muted border border-arena-border px-1.5 py-0.5 rounded bg-arena-panel">
              v2.0
            </span>
          </Link>

          {/* Marketing links */}
          <div className="hidden md:flex items-center gap-5 text-xs text-arena-muted">
            <a href="/#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="/#proctoring" className="hover:text-white transition-colors">
              Dual-Camera Proctoring
            </a>
            <a href="/#ai-eval" className="hover:text-white transition-colors">
              AI Complexity Engine
            </a>
            <a href="/#architecture" className="hover:text-white transition-colors">
              Architecture
            </a>
          </div>
        </div>

        {/* User / Auth Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <Link to="/dashboard">
                <Button variant="secondary" size="sm">
                  Go to {isCompany ? 'Company' : 'Student'} Console
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout} icon={LogOut}>
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link to="/join">
                <Button variant="outline" size="sm">
                  Join with Code
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/login?tab=register">
                <Button variant="primary" size="sm" icon={ArrowRight}>
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
