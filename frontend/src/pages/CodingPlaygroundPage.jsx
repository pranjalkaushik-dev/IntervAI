import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Send,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Cpu,
  Code2,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Terminal,
  FileCode,
  Copy,
  Check,
  History,
  Sparkles,
  Layers
} from 'lucide-react';
import questionApi from '../api/questionApi';
import { CodeEditor } from '../components/CodeEditor';
import { SUPPORTED_LANGUAGES } from '../constants/languages';

export default function CodingPlaygroundPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Left panel navigation tab: 'description' or 'submissions'
  const [leftTab, setLeftTab] = useState('description');
  const [pastSubmissions, setPastSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // Editor states
  const [selectedLanguage, setSelectedLanguage] = useState(SUPPORTED_LANGUAGES[1]); // JavaScript default
  const [code, setCode] = useState('');
  const [editorTheme, setEditorTheme] = useState('light');

  // Bottom Console states
  const [consoleHeight, setConsoleHeight] = useState('h-64'); // 'h-64' or 'h-10' (collapsed) or 'h-96'
  const [isConsoleCollapsed, setIsConsoleCollapsed] = useState(false);
  const [activeConsoleTab, setActiveConsoleTab] = useState('test1'); // 'test1', 'test2', 'custom', 'output', 'evaluation'
  const [customInput, setCustomInput] = useState('');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionMetrics, setExecutionMetrics] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null);

  // Copy status feedback
  const [copiedIdx, setCopiedIdx] = useState(null);

  const loadPastSubmissions = useCallback(async (qId) => {
    try {
      setLoadingSubmissions(true);
      const res = await questionApi.getPracticeSubmissions(qId);
      const data = res?.data?.data || res?.data || {};
      setPastSubmissions(Array.isArray(data.submissions) ? data.submissions : []);
    } catch {
      setPastSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  }, []);

  useEffect(() => {
    async function loadQuestion() {
      try {
        setLoading(true);
        setError('');
        const res = await questionApi.getById(id);
        const q = res?.data?.question || res?.question || (res?.data?._id ? res.data : null);
        if (!q) throw new Error('Question not found or response invalid');
        setQuestion(q);

        const initialCode = q.starterCode?.trim() || selectedLanguage.starterCode;
        setCode(initialCode);

        // Preload custom input from first example if available
        if (q.examples && q.examples[0]?.input) {
          setCustomInput(q.examples[0].input);
        }

        loadPastSubmissions(q._id);
      } catch (err) {
        setError(err?.response?.data?.message || err.message || 'Failed to load question details.');
      } finally {
        setLoading(false);
      }
    }
    loadQuestion();
  }, [id, loadPastSubmissions]);

  // Global Ctrl+Enter shortcut to run code
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunCode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleLanguageChange = (lang) => {
    setSelectedLanguage(lang);
    if (!code || code === selectedLanguage.starterCode) {
      setCode(lang.starterCode);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset code editor to default starter code?')) {
      const resetCode = question?.starterCode?.trim() || selectedLanguage.starterCode;
      setCode(resetCode);
      setOutput('');
      setSubmissionResult(null);
    }
  };

  const handleCopyInput = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const handleRunCode = async () => {
    if (isRunning || !question) return;
    setIsRunning(true);
    setIsConsoleCollapsed(false);
    setActiveConsoleTab('output');
    setOutput('Compiling and executing code in sandbox...');
    setSubmissionResult(null);

    let stdinToUse = customInput;
    if (activeConsoleTab === 'test1' && question.examples?.[0]?.input) {
      stdinToUse = question.examples[0].input;
    } else if (activeConsoleTab === 'test2' && question.examples?.[1]?.input) {
      stdinToUse = question.examples[1].input;
    }

    try {
      const res = await questionApi.runPracticeCode({
        questionId: question._id,
        sourceCode: code,
        languageId: selectedLanguage.id,
        stdin: stdinToUse
      });

      const data = res?.data?.data || res?.data || {};
      const statusDesc = data.status?.description || 'Executed';

      let combinedOutput = '';
      if (data.stdout) combinedOutput += data.stdout;
      if (data.compileOutput) combinedOutput += `\n[Compile Output]\n${data.compileOutput}`;
      if (data.stderr) combinedOutput += `\n[Error Output]\n${data.stderr}`;
      if (!combinedOutput.trim()) combinedOutput = `Program exited with status: ${statusDesc}`;

      setOutput(combinedOutput.trim());
      setExecutionMetrics({
        status: statusDesc,
        time: data.time ? `${data.time}s` : '0.0s',
        memory: data.memory ? `${data.memory} KB` : '0 KB'
      });
    } catch (err) {
      setOutput(`Execution error: ${err?.response?.data?.message || err.message}`);
      setExecutionMetrics({ status: 'Error', time: '-', memory: '-' });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitPractice = async () => {
    if (isSubmitting || !question) return;
    setIsSubmitting(true);
    setIsConsoleCollapsed(false);
    setActiveConsoleTab('evaluation');
    setOutput('Running test suite against sample test cases...');

    try {
      const res = await questionApi.submitPracticeCode({
        questionId: question._id,
        sourceCode: code,
        languageId: selectedLanguage.id,
        languageName: selectedLanguage.monacoLang
      });

      const data = res?.data?.data || res?.data || {};
      setSubmissionResult(data);

      let summary = `Practice Evaluation: ${data.status} (Score: ${data.score}%)\n`;
      summary += `Passed ${data.passedCount} of ${data.totalCount} sample test cases.\n\n`;

      if (Array.isArray(data.testResults)) {
        data.testResults.forEach((tc, idx) => {
          summary += `--- Case ${idx + 1}: ${tc.passed ? 'PASSED ✓' : 'FAILED ✗'} ---\n`;
          if (tc.input) summary += `Input:    ${tc.input}\n`;
          if (tc.expectedOutput) summary += `Expected: ${tc.expectedOutput}\n`;
          if (tc.actualOutput) summary += `Actual:   ${tc.actualOutput}\n`;
          if (tc.error) summary += `Error:    ${tc.error}\n`;
          summary += `\n`;
        });
      }

      setOutput(summary.trim());
      loadPastSubmissions(question._id);
    } catch (err) {
      setOutput(`Submission evaluation error: ${err?.response?.data?.message || err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-600 font-semibold">Loading practice workspace…</span>
        </div>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-slate-200 p-6 space-y-4">
          <div className="flex items-center gap-2 text-rose-600 font-semibold text-sm">
            <AlertCircle size={20} />
            <span>Workspace Error</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {error || 'Question details could not be loaded.'}
          </p>
          <button
            onClick={() => navigate('/questions')}
            className="w-full h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to Question Bank
          </button>
        </div>
      </div>
    );
  }

  const examplesToRender = Array.isArray(question.examples) && question.examples.length > 0
    ? question.examples
    : [
        {
          input: 'nums = [2, 7, 11, 15], target = 9',
          output: '[0, 1]',
          explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
        }
      ];

  const constraintsToRender = Array.isArray(question.constraints) && question.constraints.length > 0
    ? question.constraints
    : [
        'Memory Limit: 256 MB',
        'Time Limit: 2.0 seconds',
        'Standard input/output via standard streams'
      ];

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden font-sans">
      {/* Top Header Bar */}
      <header className="h-12 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 shadow-2xs z-10">
        {/* Left: Back & Breadcrumb */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/questions')}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md px-2.5 py-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft size={13} />
            <span>Question Bank</span>
          </button>

          <span className="text-slate-300">|</span>

          <div className="flex items-center gap-2">
            <h1 className="text-xs font-bold text-slate-900 truncate max-w-sm sm:max-w-md">
              {question.title || 'Coding Practice Problem'}
            </h1>

            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                String(question.difficulty).toLowerCase() === 'easy'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : String(question.difficulty).toLowerCase() === 'hard'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {question.difficulty || 'Medium'}
            </span>

            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {question.topic || 'Algorithms'}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 hidden lg:inline mr-2">
            Sandbox Practice &bull; Isolated Execution
          </span>

          <button
            onClick={handleRunCode}
            disabled={isRunning || isSubmitting}
            className="h-8 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-50 transition-all cursor-pointer"
            title="Execute current code on Judge0 (Ctrl + Enter)"
          >
            <Play size={12} fill="currentColor" />
            <span>{isRunning ? 'Running…' : 'Run Code'}</span>
          </button>

          <button
            onClick={handleSubmitPractice}
            disabled={isRunning || isSubmitting}
            className="h-8 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-50 transition-all cursor-pointer"
            title="Evaluate solution against sample test cases"
          >
            <Send size={12} />
            <span>{isSubmitting ? 'Evaluating…' : 'Submit'}</span>
          </button>
        </div>
      </header>

      {/* Main Two-Pane Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* ========================================================
            LEFT PANE: Problem Description & Submissions
            ======================================================== */}
        <div className="w-1/2 border-r border-slate-200 bg-white flex flex-col overflow-hidden">
          {/* Tab Navigation Ribbon */}
          <div className="h-10 bg-slate-50 border-b border-slate-200 px-4 flex items-center gap-4 shrink-0">
            <button
              onClick={() => setLeftTab('description')}
              className={`h-full flex items-center gap-1.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                leftTab === 'description'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <BookOpen size={14} />
              <span>Description</span>
            </button>

            <button
              onClick={() => setLeftTab('submissions')}
              className={`h-full flex items-center gap-1.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                leftTab === 'submissions'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <History size={14} />
              <span>Past Submissions</span>
              {pastSubmissions.length > 0 && (
                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-bold">
                  {pastSubmissions.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab Body: Description */}
          {leftTab === 'description' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Title & Category Header */}
              <div>
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                  Technical Problem
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-1 leading-snug">
                  {question.title || 'Coding Practice Problem'}
                </h2>
              </div>

              {/* Main Problem Prompt */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                  {question.prompt || 'Write a program to solve the technical specification.'}
                </div>
              </div>

              {/* Examples Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-blue-600" />
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Examples
                  </span>
                </div>

                <div className="space-y-3">
                  {examplesToRender.map((ex, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-2.5 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                          Example {idx + 1}
                        </span>
                        {ex.input && (
                          <button
                            type="button"
                            onClick={() => handleCopyInput(ex.input, idx)}
                            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded px-1.5 py-0.5 shadow-2xs transition-colors cursor-pointer"
                            title="Copy Input"
                          >
                            {copiedIdx === idx ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                            <span>{copiedIdx === idx ? 'Copied' : 'Copy'}</span>
                          </button>
                        )}
                      </div>

                      <div className="space-y-1.5 font-mono text-xs">
                        <div className="p-2 rounded bg-white border border-slate-200/80">
                          <span className="text-slate-400 font-semibold select-none">Input: </span>
                          <span className="text-slate-900 font-medium">{ex.input || '—'}</span>
                        </div>
                        <div className="p-2 rounded bg-white border border-slate-200/80">
                          <span className="text-slate-400 font-semibold select-none">Output: </span>
                          <span className="text-slate-900 font-medium">{ex.output || ex.expected || '—'}</span>
                        </div>
                        {ex.explanation && (
                          <div className="text-[11px] text-slate-600 font-sans pt-1">
                            <span className="font-semibold text-slate-700">Explanation: </span>
                            {ex.explanation}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Constraints Section */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Constraints & Targets
                </span>
                <ul className="space-y-1.5">
                  {constraintsToRender.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                      <span className="text-blue-500 mt-1 font-bold">&bull;</span>
                      <code className="bg-slate-100 border border-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-mono text-[11px]">
                        {c}
                      </code>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Tab Body: Past Submissions */}
          {leftTab === 'submissions' && (
            <div className="flex-1 overflow-y-auto p-5">
              {loadingSubmissions ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
                  <span>Loading submission history…</span>
                </div>
              ) : pastSubmissions.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs space-y-2">
                  <History size={28} className="mx-auto text-slate-300" />
                  <p className="font-semibold text-slate-600">No submissions yet</p>
                  <p className="text-slate-400 max-w-xs mx-auto">
                    Click "Submit" in the top bar to evaluate your solution against test cases.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pastSubmissions.map((sub, idx) => (
                    <div
                      key={sub._id || idx}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              sub.status === 'PASSED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {sub.status === 'PASSED' ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                            {sub.status}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            Score: {sub.score ?? 0}%
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(sub.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {sub.executionTime ? `${sub.executionTime}s` : '0.0s'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Cpu size={11} />
                          {sub.memory ? `${sub.memory} KB` : '0 KB'}
                        </span>
                        <span className="text-slate-400 uppercase text-[10px] font-bold">
                          {sub.languageName || 'Code'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========================================================
            RIGHT PANE: Monaco Code Editor & Bottom Console
            ======================================================== */}
        <div className="w-1/2 flex flex-col bg-white overflow-hidden">
          {/* Monaco Editor Component */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            <CodeEditor
              code={code}
              onChange={setCode}
              selectedLanguage={selectedLanguage}
              onLanguageChange={handleLanguageChange}
              theme={editorTheme}
              onThemeChange={setEditorTheme}
              onRunCode={handleRunCode}
              isRunning={isRunning || isSubmitting}
              onResetCode={handleReset}
              showRunButton={false}
            />
          </div>

          {/* Bottom Interactive Execution Console */}
          <div
            className={`border-t border-slate-200 bg-slate-900 text-slate-100 flex flex-col shrink-0 transition-all duration-150 ${
              isConsoleCollapsed ? 'h-9' : consoleHeight
            }`}
          >
            {/* Console Tab Bar */}
            <div className="h-9 bg-slate-950 border-b border-slate-800 px-3 flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center gap-1">
                {/* Test 1 Tab */}
                <button
                  type="button"
                  onClick={() => {
                    setIsConsoleCollapsed(false);
                    setActiveConsoleTab('test1');
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    activeConsoleTab === 'test1' && !isConsoleCollapsed
                      ? 'bg-slate-800 text-blue-400 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Case 1
                </button>

                {/* Test 2 Tab */}
                {question.examples?.[1] && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsConsoleCollapsed(false);
                      setActiveConsoleTab('test2');
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                      activeConsoleTab === 'test2' && !isConsoleCollapsed
                        ? 'bg-slate-800 text-blue-400 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Case 2
                  </button>
                )}

                {/* Custom Input Tab */}
                <button
                  type="button"
                  onClick={() => {
                    setIsConsoleCollapsed(false);
                    setActiveConsoleTab('custom');
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    activeConsoleTab === 'custom' && !isConsoleCollapsed
                      ? 'bg-slate-800 text-blue-400 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Custom Input
                </button>

                {/* Output Tab */}
                <button
                  type="button"
                  onClick={() => {
                    setIsConsoleCollapsed(false);
                    setActiveConsoleTab('output');
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    activeConsoleTab === 'output' && !isConsoleCollapsed
                      ? 'bg-slate-800 text-emerald-400 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Terminal size={12} />
                  <span>Output</span>
                </button>

                {/* Evaluation Results Tab */}
                {submissionResult && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsConsoleCollapsed(false);
                      setActiveConsoleTab('evaluation');
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                      activeConsoleTab === 'evaluation' && !isConsoleCollapsed
                        ? 'bg-slate-800 text-purple-400 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <CheckCircle2 size={12} />
                    <span>Evaluation ({submissionResult.score}%)</span>
                  </button>
                )}
              </div>

              {/* Console Sizing / Collapse Control */}
              <div className="flex items-center gap-2">
                {executionMetrics && (
                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mr-2">
                    <span className="text-slate-300 font-semibold">{executionMetrics.status}</span>
                    <span>&bull;</span>
                    <span>{executionMetrics.time}</span>
                    <span>&bull;</span>
                    <span>{executionMetrics.memory}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsConsoleCollapsed(!isConsoleCollapsed)}
                  className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 cursor-pointer"
                  title={isConsoleCollapsed ? 'Expand Console' : 'Collapse Console'}
                >
                  {isConsoleCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
            </div>

            {/* Console Content Area */}
            {!isConsoleCollapsed && (
              <div className="flex-1 overflow-auto p-3 font-mono text-xs">
                {/* Case 1 */}
                {activeConsoleTab === 'test1' && (
                  <div className="space-y-2 text-slate-300">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Sample Case 1 Input:
                    </span>
                    <pre className="p-2.5 bg-slate-950 rounded border border-slate-800 text-slate-200 whitespace-pre-wrap select-all">
                      {question.examples?.[0]?.input || 'No standard input provided'}
                    </pre>
                  </div>
                )}

                {/* Case 2 */}
                {activeConsoleTab === 'test2' && (
                  <div className="space-y-2 text-slate-300">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Sample Case 2 Input:
                    </span>
                    <pre className="p-2.5 bg-slate-950 rounded border border-slate-800 text-slate-200 whitespace-pre-wrap select-all">
                      {question.examples?.[1]?.input || 'No standard input provided'}
                    </pre>
                  </div>
                )}

                {/* Custom Input */}
                {activeConsoleTab === 'custom' && (
                  <div className="h-full flex flex-col space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Custom Stdin (Input passed to your program):
                    </span>
                    <textarea
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="Type custom input values here..."
                      className="flex-1 w-full bg-slate-950 text-slate-200 p-2.5 rounded border border-slate-800 focus:outline-none focus:border-blue-500 font-mono text-xs resize-none"
                    />
                  </div>
                )}

                {/* Output */}
                {activeConsoleTab === 'output' && (
                  <div className="space-y-2">
                    <pre className="text-slate-200 whitespace-pre-wrap leading-relaxed select-text font-mono">
                      {output || 'Run your code to see the sandbox output here.'}
                    </pre>
                  </div>
                )}

                {/* Evaluation Results */}
                {activeConsoleTab === 'evaluation' && (
                  <div className="space-y-3">
                    {submissionResult ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                          <span
                            className={`font-bold text-xs ${
                              submissionResult.status === 'PASSED' ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            Status: {submissionResult.status} (Score: {submissionResult.score}%)
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            Passed {submissionResult.passedCount} / {submissionResult.totalCount} tests
                          </span>
                        </div>

                        {Array.isArray(submissionResult.testResults) && (
                          <div className="space-y-2 pt-1">
                            {submissionResult.testResults.map((tc, i) => (
                              <div
                                key={i}
                                className={`p-2.5 rounded border text-[11px] space-y-1 ${
                                  tc.passed
                                    ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                                    : 'bg-rose-950/30 border-rose-800/60 text-rose-200'
                                }`}
                              >
                                <div className="font-bold flex items-center justify-between">
                                  <span>Test Case {i + 1}</span>
                                  <span>{tc.passed ? 'PASSED ✓' : 'FAILED ✗'}</span>
                                </div>
                                {tc.input && (
                                  <div>
                                    <span className="text-slate-400">Input: </span>
                                    <code>{tc.input}</code>
                                  </div>
                                )}
                                {tc.expectedOutput && (
                                  <div>
                                    <span className="text-slate-400">Expected: </span>
                                    <code>{tc.expectedOutput}</code>
                                  </div>
                                )}
                                {tc.actualOutput && (
                                  <div>
                                    <span className="text-slate-400">Actual: </span>
                                    <code>{tc.actualOutput}</code>
                                  </div>
                                )}
                                {tc.error && (
                                  <div className="text-rose-400">
                                    <span>Error: </span>
                                    <code>{tc.error}</code>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-400">Click "Submit" to run the full test suite.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
