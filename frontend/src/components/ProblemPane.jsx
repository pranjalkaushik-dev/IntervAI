import React from 'react';
import { BookOpen, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { DEFAULT_PROBLEM } from '../data/defaultProblem';

export const ProblemPane = ({ problem = DEFAULT_PROBLEM, isCollapsed, onToggleCollapse }) => {
  if (isCollapsed) {
    return (
      <div className="problem-collapsed-bar" onClick={onToggleCollapse} title="Expand Problem Description">
        <ChevronRight size={18} />
        <span className="vertical-text">Problem Statement</span>
      </div>
    );
  }

  return (
    <aside className="problem-pane">
      <div className="problem-header">
        <div className="problem-title-row">
          <BookOpen size={18} className="text-accent" />
          <h2 className="problem-title">{problem.title}</h2>
          <button 
            className="collapse-btn" 
            onClick={onToggleCollapse} 
            title="Collapse Panel"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        <div className="problem-meta">
          <span className={`difficulty-badge diff-${problem.difficulty.toLowerCase()}`}>
            {problem.difficulty}
          </span>
          <span className="tag-badge">Technical Interview</span>
          <span className="tag-badge">Data Structures</span>
        </div>
      </div>

      <div className="problem-content">
        <div className="description-section">
          <p className="problem-desc-text">{problem.description}</p>
        </div>

        {/* Examples */}
        <div className="examples-section">
          <h3 className="section-subtitle">Examples</h3>
          {problem.examples.map((ex, i) => (
            <div key={i} className="example-card">
              <div className="example-title">Example {i + 1}:</div>
              <div className="example-row">
                <span className="example-key">Input:</span>
                <code>{ex.input}</code>
              </div>
              <div className="example-row">
                <span className="example-key">Output:</span>
                <code>{ex.output}</code>
              </div>
              {ex.explanation && (
                <div className="example-row">
                  <span className="example-key">Explanation:</span>
                  <span className="example-explanation">{ex.explanation}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Constraints */}
        {problem.constraints && (
          <div className="constraints-section">
            <h3 className="section-subtitle">Constraints</h3>
            <ul className="constraints-list">
              {problem.constraints.map((c, i) => (
                <li key={i}>
                  <code>{c}</code>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
};
