import React, { useState } from 'react';
import { Terminal, Keyboard, Clock, Cpu, Trash2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export const OutputConsole = ({ 
  executionResult, 
  isRunning, 
  stdin, 
  onStdinChange, 
  onClearOutput 
}) => {
  const [activeTab, setActiveTab] = useState('output'); // 'output' | 'input'

  const getStatusBadge = () => {
    if (isRunning) {
      return (
        <span className="status-badge running">
          <span className="spin-dot"></span>
          Compiling & Executing...
        </span>
      );
    }

    if (!executionResult) {
      return <span className="status-badge idle">Ready to run</span>;
    }

    const desc = executionResult.status?.description || 'Executed';
    const isAccepted = desc.toLowerCase().includes('accepted');
    const isError = desc.toLowerCase().includes('error') || desc.toLowerCase().includes('wrong');

    return (
      <span className={`status-badge ${isAccepted ? 'accepted' : isError ? 'error' : 'warning'}`}>
        {isAccepted ? <CheckCircle2 size={13} /> : isError ? <XCircle size={13} /> : <AlertTriangle size={13} />}
        {desc}
      </span>
    );
  };

  return (
    <div className="console-container">
      <div className="console-header">
        <div className="console-tabs">
          <button 
            className={`console-tab ${activeTab === 'output' ? 'active' : ''}`}
            onClick={() => setActiveTab('output')}
          >
            <Terminal size={15} />
            <span>Output</span>
          </button>
          <button 
            className={`console-tab ${activeTab === 'input' ? 'active' : ''}`}
            onClick={() => setActiveTab('input')}
          >
            <Keyboard size={15} />
            <span>Custom Input (stdin)</span>
            {stdin.trim() && <span className="input-indicator"></span>}
          </button>
        </div>

        <div className="console-actions">
          {getStatusBadge()}

          {executionResult?.time && (
            <span className="metric-pill" title="Execution Time">
              <Clock size={12} />
              {executionResult.time}s
            </span>
          )}

          {executionResult?.memory > 0 && (
            <span className="metric-pill" title="Memory Used">
              <Cpu size={12} />
              {executionResult.memory} KB
            </span>
          )}

          {executionResult?.via && (
            <span className="via-pill" title="Execution Routing">
              {executionResult.via}
            </span>
          )}

          <button 
            className="clear-btn" 
            onClick={onClearOutput} 
            title="Clear Console"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="console-body">
        {activeTab === 'output' ? (
          <div className="output-terminal">
            {isRunning ? (
              <div className="terminal-loading">
                <div className="spinner"></div>
                <p>Sending code to Judge0 Compiler API...</p>
                <span className="loading-sub">Testing test cases and streaming output</span>
              </div>
            ) : !executionResult ? (
              <div className="terminal-placeholder">
                <Terminal size={28} className="terminal-icon" />
                <p>Press "Run Code" to compile and execute with Judge0.</p>
                <span>Live output, compilation errors, and runtime stats will appear here.</span>
              </div>
            ) : (
              <div className="terminal-content">
                {executionResult.compileOutput && (
                  <div className="terminal-section compile-error">
                    <div className="section-tag">COMPILATION ERROR</div>
                    <pre>{executionResult.compileOutput}</pre>
                  </div>
                )}

                {executionResult.stderr && (
                  <div className="terminal-section standard-error">
                    <div className="section-tag">STANDARD ERROR (stderr)</div>
                    <pre>{executionResult.stderr}</pre>
                  </div>
                )}

                {executionResult.stdout ? (
                  <div className="terminal-section standard-output">
                    <div className="section-tag">STANDARD OUTPUT (stdout)</div>
                    <pre>{executionResult.stdout}</pre>
                  </div>
                ) : (
                  !executionResult.compileOutput && !executionResult.stderr && (
                    <div className="terminal-empty">
                      Program finished successfully with no output to stdout.
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="input-panel">
            <textarea
              className="stdin-textarea"
              placeholder="Enter standard input (stdin) for your program here... e.g.
5
10 20 30 40 50"
              value={stdin}
              onChange={(e) => onStdinChange(e.target.value)}
              spellCheck="false"
            />
          </div>
        )}
      </div>
    </div>
  );
};
