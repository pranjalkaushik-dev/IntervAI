import React, { useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Play, 
  RotateCcw, 
  Settings2, 
  Sun, 
  Moon, 
  Check, 
  Code, 
  Sparkles,
  Maximize2
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../constants/languages';

export const CodeEditor = ({
  code,
  onChange,
  selectedLanguage,
  onLanguageChange,
  theme,
  onThemeChange,
  onRunCode,
  isRunning,
  onResetCode,
  remoteTypingUser
}) => {
  const editorRef = useRef(null);
  const [fontSize, setFontSize] = useState(14);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
  };

  const handleFormatCode = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
    }
  };

  return (
    <div className="editor-wrapper">
      {/* Editor Control Toolbar */}
      <div className="editor-toolbar">
        <div className="toolbar-left">
          {/* Language Selector */}
          <div className="select-container">
            <Code size={14} className="select-icon" />
            <select
              value={selectedLanguage.id}
              onChange={(e) => {
                const lang = SUPPORTED_LANGUAGES.find(l => l.id === Number(e.target.value));
                if (lang) onLanguageChange(lang);
              }}
              className="custom-select language-select"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Remote Typing Indicator */}
          {remoteTypingUser && (
            <div className="remote-typing-pill">
              <span className="pulse-dot"></span>
              <span>{remoteTypingUser} is typing...</span>
            </div>
          )}
        </div>

        <div className="toolbar-right">
          {/* Font Size */}
          <div className="font-size-control">
            <span className="font-label">Size:</span>
            <button 
              className="font-btn" 
              onClick={() => setFontSize(s => Math.max(12, s - 1))}
              title="Decrease Font Size"
            >
              -
            </button>
            <span className="font-val">{fontSize}</span>
            <button 
              className="font-btn" 
              onClick={() => setFontSize(s => Math.min(22, s + 1))}
              title="Increase Font Size"
            >
              +
            </button>
          </div>

          {/* Theme Toggle */}
          <button 
            className="toolbar-icon-btn" 
            onClick={() => onThemeChange(theme === 'vs-dark' ? 'light' : 'vs-dark')}
            title={`Switch to ${theme === 'vs-dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'vs-dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Format Document */}
          <button 
            className="toolbar-btn" 
            onClick={handleFormatCode} 
            title="Format Code (Shift + Alt + F)"
          >
            <Sparkles size={14} />
            <span>Format</span>
          </button>

          {/* Reset Template */}
          <button 
            className="toolbar-btn" 
            onClick={onResetCode} 
            title="Reset to Language Template"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>

          {/* Run Code Button */}
          <button 
            className={`run-code-btn ${isRunning ? 'loading' : ''}`}
            onClick={onRunCode}
            disabled={isRunning}
            title="Execute Code on Judge0 (Ctrl + Enter)"
          >
            {isRunning ? (
              <>
                <span className="btn-spinner"></span>
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play size={15} fill="currentColor" />
                <span>Run Code</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Monaco Editor Container */}
      <div className="monaco-container">
        <Editor
          height="100%"
          language={selectedLanguage.monacoLang}
          value={code}
          theme={theme}
          onChange={(value) => onChange(value || '')}
          onMount={handleEditorDidMount}
          options={{
            fontSize,
            fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, 'Courier New', monospace",
            minimap: { enabled: false },
            automaticLayout: true,
            scrollBeyondLastLine: false,
            lineNumbers: 'on',
            tabSize: 4,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            formatOnPaste: true,
            formatOnType: true,
            bracketPairColorization: { enabled: true },
            padding: { top: 12, bottom: 12 },
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 3
          }}
        />
      </div>
    </div>
  );
};
