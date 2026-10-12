import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Users,
  Code2,
  Brain,
  Video,
  ChevronRight,
  Sparkles,
  Terminal,
  FileCheck2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="ref-landing bg-white min-h-screen">
      {/* Navigation */}
      <nav className="ref-nav sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <Link to="/" className="ref-brand">
          <span className="ref-brand-mark">
            <Code2 size={16} />
          </span>
          <span>
            Interv<span>AI</span>
          </span>
        </Link>

        <div className="ref-nav-links">
          <a href="#features">Capabilities</a>
          <a href="#how">Workflow</a>
          <a href="#for-recruiters">For Teams</a>
          <a href="#for-candidates">For Candidates</a>
        </div>

        <div className="ref-nav-actions">
          {user ? (
            <Link className="ref-nav-primary" to="/dashboard">
              Open Workspace <ArrowRight size={14} className="ml-1" />
            </Link>
          ) : (
            <>
              <Link className="ref-nav-outline" to="/login">
                Log in
              </Link>
              <Link className="ref-nav-primary" to="/login?tab=register">
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="ref-hero">
        <div className="ref-hero-inner">
          <div className="ref-hero-copy">
            <div className="ref-eyebrow">
              <Sparkles size={13} />
              <span>Technical Interview & Assessment Platform</span>
            </div>

            <h1>
              Structured interviews.<br />
              <em>Objective evaluations.</em>
            </h1>

            <p>
              IntervAI provides engineering teams with a unified workspace for live
              coding interviews, sandboxed compiler execution, automated proctoring telemetry,
              and AI-assisted candidate evaluation.
            </p>

            <div className="ref-actions">
              <Link
                className="ref-primary-cta"
                to={user ? '/dashboard' : '/login?tab=register'}
              >
                <span>{user ? 'Go to Dashboard' : 'Start Evaluating'}</span>
                <ArrowRight size={15} />
              </Link>
              <a className="ref-demo-cta" href="#features">
                <span>Explore Capabilities</span>
              </a>
            </div>

            <div className="ref-trust-row">
              <span>
                <CheckCircle2 size={14} /> Synchronized Code Editor
              </span>
              <span>
                <CheckCircle2 size={14} /> Sandboxed Test Runner
              </span>
              <span>
                <CheckCircle2 size={14} /> Structured Evaluation
              </span>
            </div>
          </div>

          {/* Believable Product Preview */}
          <div className="ref-hero-art" aria-label="IntervAI session preview">
            <div className="ref-preview-card">
              <div className="ref-preview-top">
                <div className="ref-preview-dots">
                  <span />
                  <span />
                  <span />
                  <b className="ref-preview-title ml-2">Session: Senior Software Engineer</b>
                </div>
                <span className="ref-preview-pill">Active Interview</span>
              </div>

              <div className="ref-preview-content">
                <div className="ref-preview-meta">
                  <div>
                    <div className="ref-preview-problem">
                      Problem 1: LRU Cache Implementation
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Data Structures &bull; Target Time: O(1) Get / Put
                    </div>
                  </div>
                  <span className="ref-preview-tag">Medium &bull; 45m</span>
                </div>

                <div className="ref-preview-code-box">
                  <div><span className="kw">class</span> LRUCache &#123;</div>
                  <div>&nbsp;&nbsp;<span className="fn">constructor</span>(capacity) &#123;</div>
                  <div>&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">this</span>.capacity = capacity;</div>
                  <div>&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">this</span>.map = <span className="kw">new</span> Map();</div>
                  <div>&nbsp;&nbsp;&#125;</div>
                  <div>&nbsp;&nbsp;<span className="fn">get</span>(key) &#123; <span className="str">/* O(1) hash lookup & reorder */</span> &#125;</div>
                  <div>&#125;</div>
                </div>

                <div className="ref-preview-stats">
                  <div className="ref-preview-stat-card">
                    <span>Judge0 Tests</span>
                    <b className="text-emerald-700">5 / 5 Passed</b>
                  </div>
                  <div className="ref-preview-stat-card">
                    <span>Time Complexity</span>
                    <b className="text-blue-700">O(1) Optimal</b>
                  </div>
                  <div className="ref-preview-stat-card">
                    <span>Quality Score</span>
                    <b className="text-purple-700">92 / 100</b>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section id="features" className="ref-section">
        <div className="ref-section-heading">
          <span>Core Capabilities</span>
          <h2>Everything needed for rigorous technical interviews.</h2>
          <p>
            From scheduled invitations and collaborative coding to automated sandboxed execution
            and comprehensive scorecard generation.
          </p>
        </div>

        <div className="ref-feature-grid">
          <Feature
            icon={Code2}
            title="Real-Time Collaborative Editor"
            text="Peer-synchronized coding environment with syntax highlighting, line guttering, and configurable language runtimes."
          />
          <Feature
            icon={Terminal}
            title="Sandboxed Code Execution"
            text="Integrated Judge0 execution engine runs solutions against public and private test cases with standard I/O feedback."
          />
          <Feature
            icon={Brain}
            title="AI-Assisted Evaluation"
            text="Automated algorithmic complexity estimation, corner case scrutiny, and structured rubric suggestions via Gemini."
          />
          <Feature
            icon={ShieldCheck}
            title="Integrity Telemetry"
            text="Optional browser tab focus tracking, MediaPipe computer vision, and secondary mobile camera WebRTC pairing."
          />
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how" className="ref-how">
        <div className="ref-section-heading">
          <span>Workflow</span>
          <h2>A structured three-step assessment lifecycle.</h2>
          <p>
            Designed to save engineering time while giving candidates an authentic, fair environment to demonstrate their abilities.
          </p>
        </div>

        <div className="ref-steps">
          <Step
            n="01"
            title="Configure Assessment"
            text="Select technical questions from the question bank or generate customized role scenarios with AI. Define time limits and integrity parameters."
          />
          <Step
            n="02"
            title="Conduct Live Session"
            text="Interviewers and candidates join a secure room via unique session code. Write code collaboratively, run test suites, and communicate seamlessly."
          />
          <Step
            n="03"
            title="Generate Performance Report"
            text="Access automated reports with evaluated test scores, Big-O complexity metrics, candidate strengths, and structured talking points."
          />
        </div>
      </section>

      {/* Dedicated Information for Hiring Teams & Candidates */}
      <section id="for-recruiters" className="ref-section bg-white">
        <div className="ref-section-heading mb-8">
          <span>Role-Specific Value</span>
          <h2>Built for both interviewers and candidate experience.</h2>
        </div>

        <div className="ref-audience-grid">
          <div className="ref-audience-card">
            <span className="ref-audience-badge">
              <Users size={13} />
              <span>For Engineering Teams & Recruiters</span>
            </span>
            <h3>Standardize technical screening without operational friction.</h3>
            <p>
              Replace disconnected video calls, Google Docs, and third-party compilers with a dedicated, professional workspace.
            </p>
            <ul>
              <li>
                <CheckCircle2 size={14} /> Maintain uniform question banks and difficulty standards
              </li>
              <li>
                <CheckCircle2 size={14} /> Eliminate candidate setup delays with browser-based execution
              </li>
              <li>
                <CheckCircle2 size={14} /> Receive verified integrity logs and telemetry alongside code submissions
              </li>
              <li>
                <CheckCircle2 size={14} /> Export structured scorecards directly for hiring committee reviews
              </li>
            </ul>
          </div>

          <div id="for-candidates" className="ref-audience-card">
            <span className="ref-audience-badge">
              <FileCheck2 size={13} />
              <span>For Candidates & Students</span>
            </span>
            <h3>Demonstrate problem-solving in a realistic coding environment.</h3>
            <p>
              Experience the same tooling used in actual enterprise interviews, with peer mock rooms and automated skill feedback.
            </p>
            <ul>
              <li>
                <CheckCircle2 size={14} /> Instant zero-config execution across Python, JavaScript, Java, and C++
              </li>
              <li>
                <CheckCircle2 size={14} /> Clear test case outputs and execution diagnostics
              </li>
              <li>
                <CheckCircle2 size={14} /> Transparent pre-flight device checks for audio, camera, and connection
              </li>
              <li>
                <CheckCircle2 size={14} /> Dedicated mock interview rooms to practice with peers under timed conditions
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="ref-footer">
        <div className="flex items-center gap-2">
          <b>
            Interv<span>AI</span>
          </b>
          <span className="text-slate-400">&bull;</span>
          <span>Technical Interview & Assessment Platform</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <Link to="/login" className="hover:text-slate-800 transition-colors">
            Interviewer Login
          </Link>
          <span>&bull;</span>
          <Link to="/login?tab=register" className="hover:text-slate-800 transition-colors">
            Register Account
          </Link>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon: Icon, title, text }) {
  return (
    <article className="ref-feature">
      <span className="ref-feature-icon">
        <Icon size={19} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function Step({ n, title, text }) {
  return (
    <article className="ref-step">
      <strong>{n}</strong>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </article>
  );
}
