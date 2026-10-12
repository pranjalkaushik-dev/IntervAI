import React, { useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  Play,
  RotateCcw,
  Sun,
  Moon,
  Code,
  Sparkles,
  Type
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../constants/languages';

export const CodeEditor = ({
  code,
  onChange,
  selectedLanguage,
  onLanguageChange,
  theme = 'light',
  onThemeChange,
  onRunCode,
  isRunning = false,
  onResetCode,
  remoteTypingUser,
  showRunButton = false
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

  const currentTheme = theme === 'vs-dark' ? 'vs-dark' : 'light';

  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden select-none">
      {/* Editor Control Toolbar */}
      <div className="h-10 px-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0 gap-3">
        {/* Left Controls: Language Selector & Remote Indicator */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <Code size={13} className="absolute left-2.5 text-slate-500 pointer-events-none" />
            <select
              value={selectedLanguage?.id || 63}
              onChange={(e) => {
                const lang = SUPPORTED_LANGUAGES.find((l) => l.id === Number(e.target.value));
                if (lang && onLanguageChange) onLanguageChange(lang);
              }}
              className="h-7 pl-7 pr-3 text-xs bg-white border border-slate-200 rounded-md text-slate-800 font-mono font-medium hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer shadow-2xs transition-colors"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {remoteTypingUser && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-medium animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
              <span>{remoteTypingUser} is typing...</span>
            </div>
          )}
        </div>

        {/* Right Controls: Font, Theme, Format, Reset */}
        <div className="flex items-center gap-1.5">
          {/* Font Size Selector */}
          <div className="flex items-center bg-white border border-slate-200 rounded-md px-1.5 py-0.5 shadow-2xs">
            <Type size={11} className="text-slate-400 mr-1" />
            <button
              type="button"
              onClick={() => setFontSize((s) => Math.max(12, s - 1))}
              className="w-5 h-5 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded text-xs font-semibold cursor-pointer"
              title="Decrease Font Size"
            >
              -
            </button>
            <span className="text-[11px] font-mono font-semibold text-slate-700 px-1 select-none">
              {fontSize}px
            </span>
            <button
              type="button"
              onClick={() => setFontSize((s) => Math.min(20, s + 1))}
              className="w-5 h-5 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded text-xs font-semibold cursor-pointer"
              title="Increase Font Size"
            >
              +
            </button>
          </div>

          {/* Theme Toggle Button */}
          {onThemeChange && (
            <button
              type="button"
              onClick={() => onThemeChange(currentTheme === 'vs-dark' ? 'light' : 'vs-dark')}
              className="h-7 px-2 flex items-center gap-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-slate-600 hover:text-slate-900 text-xs font-medium shadow-2xs transition-colors cursor-pointer"
              title={`Switch to ${currentTheme === 'vs-dark' ? 'Light' : 'Dark'} Theme`}
            >
              {currentTheme === 'vs-dark' ? (
                <>
                  <Sun size={13} className="text-amber-500" />
                  <span className="text-[11px] hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon size={13} className="text-slate-600" />
                  <span className="text-[11px] hidden sm:inline">Dark</span>
                </>
              )}
            </button>
          )}

          {/* Format Document */}
          <button
            type="button"
            onClick={handleFormatCode}
            className="h-7 px-2 flex items-center gap-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-slate-600 hover:text-slate-900 text-xs font-medium shadow-2xs transition-colors cursor-pointer"
            title="Format Code (Shift + Alt + F)"
          >
            <Sparkles size={12} className="text-blue-600" />
            <span className="text-[11px] hidden sm:inline">Format</span>
          </button>

          {/* Reset Template */}
          {onResetCode && (
            <button
              type="button"
              onClick={onResetCode}
              className="h-7 px-2 flex items-center gap-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-slate-600 hover:text-slate-900 text-xs font-medium shadow-2xs transition-colors cursor-pointer"
              title="Reset to default starter template"
            >
              <RotateCcw size={12} />
              <span className="text-[11px] hidden sm:inline">Reset</span>
            </button>
          )}

          {/* Optional Run Code button (for inline usage) */}
          {showRunButton && onRunCode && (
            <button
              type="button"
              onClick={onRunCode}
              disabled={isRunning}
              className="h-7 px-2.5 flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-2xs disabled:opacity-50 transition-colors cursor-pointer"
              title="Run Code"
            >
              <Play size={11} fill="currentColor" />
              <span>{isRunning ? 'Running…' : 'Run'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Monaco Editor Mount Container */}
      <div className="flex-1 w-full min-h-0 relative bg-white">
        <Editor
          height="100%"
          width="100%"
          language={selectedLanguage?.monacoLang || 'javascript'}
          value={code}
          theme={currentTheme}
          onChange={(value) => onChange(value || '')}
          onMount={handleEditorDidMount}
          loading={
            <div className="h-full w-full flex items-center justify-center bg-slate-50 text-slate-400 text-xs">
              <span className="animate-spin mr-2">⚙</span> Loading Monaco Workspace…
            </div>
          }
          options={{
            fontSize,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Courier New', monospace",
            minimap: { enabled: false },
            automaticLayout: true,
            scrollBeyondLastLine: false,
            lineNumbers: 'on',
            tabSize: 2,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            formatOnPaste: true,
            formatOnType: true,
            bracketPairColorization: { enabled: true },
            padding: { top: 12, bottom: 12 },
            lineDecorationsWidth: 8,
            lineNumbersMinChars: 3,
            renderLineHighlight: 'all',
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;
