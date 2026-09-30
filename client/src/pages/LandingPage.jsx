import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Play, CheckCircle2, ShieldCheck, Users, Code2, Brain,
  Video, Sparkles, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { user, isCompany } = useAuth();

  return (
    <div className="ref-landing">
      <section className="ref-hero">
        <nav className="ref-nav">
          <Link to="/" className="ref-brand">
            <span className="ref-brand-mark"><Code2 size={15}/></span>
            <span>Interv<span>AI</span></span>
          </Link>

          <div className="ref-nav-links">
            <a href="#features">Features</a>
            <a href="#how">How It Works</a>
            <a href="#recruiters">For Recruiters</a>
            <a href="#students">For Students</a>
          </div>

          <div className="ref-nav-actions">
            {user ? (
              <Link className="ref-nav-outline" to="/dashboard">Open Workspace</Link>
            ) : (
              <>
                <Link className="ref-nav-outline" to="/login">Log in</Link>
                <Link className="ref-nav-primary" to="/login?tab=register">Get Started</Link>
              </>
            )}
          </div>
        </nav>

        <div className="ref-hero-inner">
          <div className="ref-hero-copy">
            <div className="ref-eyebrow">
              <span>Practice</span><i>•</i><span>Get Interview Ready</span><i>•</i><span>Ace Your Future</span>
            </div>

            <h1>
              Real Interviews.<br/>
              <em>Smarter Outcomes.</em>
            </h1>

            <p>
              An AI-assisted platform for technical interview preparation,
              evaluation and collaborative learning.
            </p>

            <div className="ref-actions">
              <Link className="ref-primary-cta" to={user ? "/dashboard" : "/login?tab=register"}>
                Get Started <ArrowRight size={16}/>
              </Link>
              <a className="ref-demo-cta" href="#features">
                <Play size={13} fill="currentColor"/> Watch Demo
              </a>
            </div>

            <div className="ref-trust-row">
              <span><CheckCircle2/> Real-time collaboration</span>
              <span><CheckCircle2/> AI-assisted evaluation</span>
              <span><CheckCircle2/> Secure proctoring</span>
            </div>
          </div>

          <div className="ref-hero-art" aria-label="IntervAI live interview preview">
            <div className="ref-art-photo"/>
            <div className="ref-art-window">
              <div className="ref-window-bar">
                <span/><span/><span/>
                <b>IntervAI Live Session</b>
                <small><i/> LIVE</small>
              </div>
              <div className="ref-window-content">
                <div className="ref-code">
                  <div><span className="kw">function</span> twoSum(nums, target) {'{'}</div>
                  <div>&nbsp;&nbsp;<span className="fn">const</span> map = <span className="fn">new</span> Map();</div>
                  <div>&nbsp;&nbsp;<span className="kw">for</span> (let i = 0; i &lt; nums.length; i++) {'{'}</div>
                  <div>&nbsp;&nbsp;&nbsp;&nbsp;<span className="fn">const</span> complement = target - nums[i];</div>
                  <div>&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">if</span> (map.has(complement))</div>
                  <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="fn">return</span> [map.get(complement), i];</div>
                  <div>&nbsp;&nbsp;{'}'}</div>
                  <div>{'}'}</div>
                </div>
                <div className="ref-student-card">
                  <div className="ref-student-avatar">R</div>
                  <strong>Student</strong>
                  <span><i/> LIVE</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="ref-stats">
          <div><strong>10K+</strong><span>Students Practicing</span></div>
          <div><strong>500+</strong><span>Companys</span></div>
          <div><strong>50+</strong><span>Companies</span></div>
          <div><strong>95%</strong><span>Placement Readiness</span></div>
        </div>
      </section>

      <section id="features" className="ref-section">
        <div className="ref-section-heading">
          <span>Everything you need</span>
          <h2>One workspace for the complete interview lifecycle.</h2>
          <p>From scheduling and collaborative coding to AI feedback and integrity monitoring.</p>
        </div>

        <div className="ref-feature-grid">
          <Feature icon={Brain} title="AI Evaluation" text="Code quality, complexity analysis and actionable feedback."/>
          <Feature icon={Code2} title="Real-time Collaboration" text="Companys and students solve problems together."/>
          <Feature icon={ShieldCheck} title="Interview Proctoring" text="Browser and computer-vision monitoring for secure sessions."/>
          <Feature icon={Users} title="Practice Rooms" text="Peer-to-peer mock interviews and collaborative learning."/>
        </div>
      </section>

      <section id="how" className="ref-how">
        <div className="ref-section-heading">
          <span>How it works</span>
          <h2>Everything needed from invitation to interview report.</h2>
        </div>
        <div className="ref-steps">
          <Step n="01" title="Create an interview" text="Select questions, duration and integrity settings."/>
          <Step n="02" title="Collaborate live" text="Code, chat, run tests and communicate in one room."/>
          <Step n="03" title="Review with AI" text="Receive structured evaluation and proctoring insights."/>
        </div>
      </section>

      <section id="recruiters" className="ref-audience">
        <div><Sparkles size={18}/><span>For Recruiters</span></div>
        <h2>Run structured technical interviews without switching tools.</h2>
        <p>Create sessions, collaborate in real time, monitor integrity and review AI-assisted reports from one workspace.</p>
      </section>

      <section id="students" className="ref-audience light">
        <div><Video size={18}/><span>For Students</span></div>
        <h2>Practice the interview environment before the real one.</h2>
        <p>Join mock rooms, solve coding problems with peers and receive structured feedback.</p>
      </section>

      <footer className="ref-footer">
        <b>Interv<span>AI</span></b>
        <span>AI-assisted technical interviews, built for engineering teams.</span>
      </footer>
    </div>
  );
}

function Feature({icon: Icon, title, text}) {
  return (
    <article className="ref-feature">
      <span className="ref-feature-icon"><Icon size={19}/></span>
      <h3>{title}</h3>
      <p>{text}</p>
      <a href="#how">Learn more <ChevronRight size={13}/></a>
    </article>
  );
}

function Step({n, title, text}) {
  return (
    <article className="ref-step">
      <strong>{n}</strong>
      <div><h3>{title}</h3><p>{text}</p></div>
    </article>
  );
}
