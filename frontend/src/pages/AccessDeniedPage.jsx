import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function AccessDeniedPage() {
  const location = useLocation();
  return (
    <div className="ref-access-denied">
      <div className="ref-access-card">
        <div className="ref-access-icon"><ShieldAlert size={25} /></div>
        <span className="ref-app-kicker">403 • RBAC</span>
        <h1>Access restricted</h1>
        <p>Your account role does not have permission to open <code>{location.pathname}</code>.</p>
        <Link to="/dashboard" className="ref-app-primary-btn"><ArrowLeft size={15} /> Return to dashboard</Link>
      </div>
    </div>
  );
}
