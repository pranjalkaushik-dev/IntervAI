import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Video, BookOpen, BarChart3, Settings, LogOut, Users, Code2, ShieldCheck, Bell, ChevronDown, ClipboardList, Sparkles, Shield, Building2, UserCog } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const studentItems=[
 {label:'Dashboard',path:'/dashboard',icon:LayoutDashboard},{label:'My Tests',path:'/interviews',icon:Video},{label:'Practice Rooms',path:'/rooms',icon:Code2},{label:'Mock Interviews',path:'/practice',icon:Sparkles},{label:'Reports',path:'/reports',icon:BarChart3},{label:'Settings',path:'/settings',icon:Settings}
];
const companyItems=[
 {label:'Dashboard',path:'/dashboard',icon:LayoutDashboard},{label:'Tests & Interviews',path:'/interviews',icon:Video},{label:'Questions',path:'/questions',icon:BookOpen},{label:'Students',path:'/students',icon:Users},{label:'Analytics',path:'/analytics',icon:BarChart3},{label:'Settings',path:'/settings',icon:Settings}
];
const adminItems=[
 {label:'Overview',path:'/admin',icon:LayoutDashboard},{label:'User Management',path:'/admin/users',icon:UserCog},{label:'Companies',path:'/admin/companies',icon:Building2},{label:'Platform Analytics',path:'/admin/analytics',icon:BarChart3},{label:'System Settings',path:'/settings',icon:Settings}
];
const initials=n=>(n||'User').split(/\s+/).filter(Boolean).map(x=>x[0]).slice(0,2).join('').toUpperCase()||'U';
const active=(loc,path)=>loc.pathname===path||(path!=='/dashboard'&&loc.pathname.startsWith(path+'/'));
export default function AppShell({children}){
 const {user,logout,isCompany,isAdmin}=useAuth(); const loc=useLocation(); const nav=useNavigate();
 const items=isAdmin?adminItems:isCompany?companyItems:studentItems; const role=isAdmin?'Admin':isCompany?'Company':'Student'; const current=items.find(i=>active(loc,i.path));
 const out=()=>{logout();nav('/login',{replace:true})};
 return <div className="ref-app-shell">
  <aside className="ref-app-sidebar">
   <Link to={isAdmin?'/admin':'/dashboard'} className="ref-app-brand"><span className="ref-app-brand-mark"><Code2 size={17}/></span><span>Interv<span>AI</span></span></Link>
   <div className="ref-app-profile"><div className="ref-app-avatar">{initials(user?.fullName)}</div><div className="ref-app-profile-copy"><strong>{user?.fullName||'User'}</strong><span>{role}</span></div><ChevronDown size={14} className="ref-app-muted-icon"/></div>
   <nav className="ref-app-nav"><div className="ref-app-nav-label">{isAdmin?'Administration':isCompany?'Company Workspace':'Student Workspace'}</div>{items.map(({label,path,icon:Icon})=><Link key={path} to={path} className={`ref-app-nav-item ${active(loc,path)?'active':''}`}><Icon size={17}/><span>{label}</span></Link>)}</nav>
   <div className="ref-app-sidebar-bottom"><div className="ref-app-integrity"><ShieldCheck size={17}/><div><strong>Interview integrity</strong><span>Protected sessions</span></div></div><div className={`ref-app-role-badge ${isAdmin?'admin':isCompany?'company':'student'}`}><Shield size={14}/><span>RBAC: {role}</span></div><button type="button" className="ref-app-nav-item" onClick={out}><LogOut size={17}/><span>Logout</span></button></div>
  </aside>
  <div className="ref-app-main"><header className="ref-app-topbar"><div className="ref-app-title-group"><strong>IntervAI</strong><span>{isAdmin?'Administrator Dashboard':isCompany?'Company Dashboard':'Student Dashboard'}</span></div><div className="ref-app-top-actions"><div className="ref-app-breadcrumb">Workspace <span>/</span> <b>{current?.label||'Room'}</b></div><button className="ref-app-icon-btn" aria-label="Notifications"><Bell size={18}/><i/></button><button className="ref-app-user-chip" onClick={()=>nav('/settings')}><span className="ref-app-avatar small">{initials(user?.fullName)}</span><span><strong>{user?.fullName||'User'}</strong><small>{role}</small></span><ChevronDown size={14}/></button></div></header><main className="ref-app-content">{children}</main></div>
 </div>;
}
