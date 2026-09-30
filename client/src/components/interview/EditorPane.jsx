import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import codingApi from '../../api/codingApi';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { DEFAULT_CODE } from '../../data/defaultProblem';
import {
  Play,
  Send,
  RotateCcw,
  Terminal,
  Clock,
  Cpu,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  Users,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

const LANGUAGE_IDS = {
  python: 71,
  javascript: 63,
  typescript: 74,
  cpp: 54,
};

export default function EditorPane({
  roomCode,
  interviewId,
  interview,
  question,
  onCodeRun,
  onAiEvaluation,
}) {
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(DEFAULT_CODE['javascript']);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [executionMetrics, setExecutionMetrics] = useState(null);
  const [activeConsoleTab, setActiveConsoleTab] = useState('test1');
  const [consoleHeight, setConsoleHeight] = useState('h-44');

  // Token access state
  const [currentToken, setCurrentToken] = useState(null);
  const [hasEditAccess, setHasEditAccess] = useState(true);
  const [accessRequested, setAccessRequested] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);

  const { socket } = useSocket();
  const { user, isCompany } = useAuth();

  const myUserId = String(user?.id || user?._id || '');

  // Socket Code & Token Synchronisation
  useEffect(() => {
    if (!socket) return;

    const handleCodeUpdate = (data) => {
      if (data?.code !== undefined && data.code !== code) {
        setCode(data.code);
      }
    };

    const handleRoomState = (data) => {
      if (data?.code !== undefined && data.code !== null) {
        setCode(data.code);
      }
      if (data?.token) {
        setCurrentToken(data.token);
        setHasEditAccess(data.token.holderUserId === myUserId);
      }
    };

    const handleTokenUpdate = (data) => {
      const token = data?.token || null;
      setCurrentToken(token);
      if (token) {
        setHasEditAccess(token.holderUserId === myUserId);
        if (token.holderUserId === myUserId) setAccessRequested(false);
      } else {
        // If token released, anyone can edit or claim
        setHasEditAccess(true);
      }
    };

    const handleTokenRequested = ({ requester, currentToken: token }) => {
      if (requester?.userId !== myUserId) {
        setPendingRequests((prev) => {
          if (prev.some((r) => r.userId === requester.userId)) return prev;
          return [...prev, requester];
        });
      }
    };

    const handleTokenRejected = ({ message }) => {
      setHasEditAccess(false);
      setOutput(message || 'You currently have read-only access.');
    };

    socket.on('code-update', handleCodeUpdate);
    socket.on('code:change', handleCodeUpdate);
    socket.on('code:sync', handleCodeUpdate);
    socket.on('room-state', handleRoomState);
    socket.on('coding:token:update', handleTokenUpdate);
    socket.on('coding:token:requested', handleTokenRequested);
    socket.on('coding:token:rejected', handleTokenRejected);

    return () => {
      socket.off('code-update', handleCodeUpdate);
      socket.off('code:change', handleCodeUpdate);
      socket.off('code:sync', handleCodeUpdate);
      socket.off('room-state', handleRoomState);
      socket.off('coding:token:update', handleTokenUpdate);
      socket.off('coding:token:requested', handleTokenRequested);
      socket.off('coding:token:rejected', handleTokenRejected);
    };
  }, [socket, code, myUserId]);

  const requestCodingToken = () => {
    if (!socket || !roomCode) return;
    setAccessRequested(true);
    socket.emit('coding:token:request', { roomId: roomCode });
  };

  const grantCodingToken = (requester) => {
    if (!socket || !roomCode) return;
    socket.emit('coding:token:grant', {
      roomId: roomCode,
      targetUserId: requester.userId,
      targetUserName: requester.userName,
      targetSocketId: requester.socketId
    });
    setPendingRequests((prev) => prev.filter((r) => r.userId !== requester.userId));
  };

  const releaseCodingToken = () => {
    if (!socket || !roomCode) return;
    socket.emit('coding:token:release', { roomId: roomCode });
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    if (socket && roomCode) {
      socket.emit('code-change', { roomId: roomCode, code: newCode });
      socket.emit('code:change', { roomId: roomCode, code: newCode });
    }
  };

  const handleLanguageChange = (e) => {
    const selected = e.target.value;
    setLanguage(selected);
    const template = DEFAULT_CODE[selected] || '// Write your solution\n';
    setCode(template);
    if (socket && roomCode) {
      socket.emit('code-change', { roomId: roomCode, code: template });
      socket.emit('code:change', { roomId: roomCode, code: template });
    }
  };

  const handleRunCode = async () => {
    if (isRunning) return;

    setIsRunning(true);
    setOutput('Sending code to Judge0...');

    try {
      const response = await codingApi.runCode({
        sourceCode: code,
        languageId: LANGUAGE_IDS[language] || 63,
        stdin: '',
      });

      const data = response?.data || {};

      const stdout = data.stdout || '';
      const stderr = data.stderr || '';
      const compileOutput = data.compileOutput || '';
      const status = data.status?.description || 'Unknown';

      let runOutput = '';

      if (stdout) {
        runOutput += stdout;
      }

      if (compileOutput) {
        runOutput += `\nCompile output:\n${compileOutput}`;
      }

      if (stderr) {
        runOutput += `\nError:\n${stderr}`;
      }

      if (!runOutput.trim()) {
        runOutput = `Execution finished with status: ${status}`;
      }

      setOutput(runOutput.trim());

      setExecutionMetrics({
        status,
        runtime: data.time ? `${data.time}s` : '-',
        memory: data.memory ? `${data.memory} KB` : '-',
        casesPassed: '-',
      });

      if (onCodeRun) {
        onCodeRun({
          language,
          code,
          runtime: data.time,
          memory: data.memory,
          status,
          stdout,
          stderr,
        });
      }
    } catch (error) {
      console.error('[EditorPane] Code execution failed:', error);
      setOutput(`Execution failed: ${error.message}`);
      setExecutionMetrics({
        status: 'ERROR',
        runtime: '-',
        memory: '-',
        casesPassed: '-',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitSolution = async () => {
    if (isRunning) return;

    if (!interviewId) {
      setOutput('Cannot submit: interview ID is missing.');
      return;
    }

    setIsRunning(true);
    setOutput('Running final submission...');

    try {
      const submitResponse = await codingApi.submitCode({
        interviewId,
        questionId: question?._id || null,
        question: question?.prompt || '',
        sourceCode: code,
        languageId: LANGUAGE_IDS[language] || 63,
        languageName: language
      });

      const data = submitResponse?.data || {};
      const submission = data.submission || data;

      // Forward the real Gemini evaluation to InterviewRoomPage.
      if (submission?.aiFeedback && onAiEvaluation) {
        onAiEvaluation(submission.aiFeedback);
      }

      setOutput(
        [
          'Submission saved successfully.',
          '',
          `Status: ${submission.status || 'UNKNOWN'}`,
          `Score: ${submission.score ?? 0}`,
          `Submission ID: ${submission.submissionId || submission._id || '—'}`,
        ].join('\n')
      );

      const passedCount = submission.testResults?.filter((t) => t.passed)?.length || 0;
      const totalCount = submission.testResults?.length || 1;

      setExecutionMetrics({
        status: submission.status || 'UNKNOWN',
        runtime: submission.testResults?.[0]?.executionTime ? `${submission.testResults[0].executionTime}s` : '-',
        memory: submission.testResults?.[0]?.memory ? `${submission.testResults[0].memory} KB` : '-',
        casesPassed: `${passedCount} / ${totalCount}`,
      });
    } catch (error) {
      console.error('[EditorPane] Submission failed:', error);

      setOutput(
        `Submission failed: ${error?.response?.data?.message || error?.message || 'Unknown error'}`
      );
    } finally {
      setIsRunning(false);
    }
  };

  // Generate line numbers
  const linesCount = code.split('\n').length;
  const lineNumbers = Array.from({ length: Math.max(linesCount, 25) }, (_, i) => i + 1);

  return (
    <div className="h-full flex flex-col bg-arena-bg text-slate-100 font-sans overflow-hidden">
      {/* Pending Coding Access Requests Banner */}
      {pendingRequests.length > 0 && hasEditAccess && (
        <div className="bg-amber-950/80 border-b border-amber-500/50 px-3 py-1.5 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>
              <strong>{pendingRequests[0].userName}</strong> requested coding access.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => grantCodingToken(pendingRequests[0])}
              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium"
            >
              Grant
            </button>
            <button
              onClick={() => setPendingRequests((prev) => prev.slice(1))}
              className="px-2 py-0.5 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded text-xs"
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Editor Sub-Header / Ribbon */}
      <div className="h-10 bg-arena-surface border-b border-arena-border px-3 flex items-center justify-between shrink-0 gap-3">
        {/* Left: Language selector & Token access */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-arena-dim font-medium">Lang:</span>
            <select
              value={language}
              onChange={handleLanguageChange}
              className="px-2 py-1 text-xs bg-arena-panel border border-arena-border rounded text-white focus:outline-none focus:border-arena-blue font-mono"
            >
              <option value="javascript">JavaScript (Node 20)</option>
              <option value="python">Python 3.11</option>
              <option value="cpp">C++ (GCC 13)</option>
              <option value="typescript">TypeScript 5</option>
            </select>
          </div>

          {/* Token-based editing status pill */}
          <div className="hidden sm:flex items-center gap-1.5">
            {hasEditAccess ? (
              <button
                onClick={releaseCodingToken}
                className="px-2.5 py-0.5 rounded-full border border-emerald-800/80 bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/50 text-[10px] font-medium flex items-center gap-1.5 transition-colors"
                title="Click to release coding access to peers"
              >
                <Unlock className="w-3 h-3 text-emerald-400" />
                <span>You have EDIT ACCESS (Click to Release)</span>
              </button>
            ) : accessRequested ? (
              <span className="px-2.5 py-0.5 rounded-full border border-amber-800/80 bg-amber-950/40 text-amber-400 text-[10px] font-medium flex items-center gap-1.5">
                <Clock className="w-3 h-3 animate-spin text-amber-400" />
                <span>Coding access requested...</span>
              </span>
            ) : (
              <button
                onClick={requestCodingToken}
                className="px-2.5 py-0.5 rounded-full border border-arena-border bg-arena-panel text-arena-dim hover:text-white hover:border-amber-500/50 text-[10px] font-medium flex items-center gap-1.5 transition-colors"
              >
                <Lock className="w-3 h-3 text-amber-400" />
                <span>Request Coding Access (READ-ONLY)</span>
              </button>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCodeChange(DEFAULT_CODE[language] || '')}
            className="p-1.5 rounded text-arena-dim hover:text-white hover:bg-arena-panel transition-colors"
            title="Reset code template"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <Button
            variant="success"
            size="xs"
            onClick={handleRunCode}
            isLoading={isRunning}
            icon={Play}
          >
            Run Code
          </Button>

          <Button
            variant="primary"
            size="xs"
            onClick={handleSubmitSolution}
            icon={Send}
          >
            Submit
          </Button>
        </div>
      </div>

      {/* Editor Body with Gutter */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Line Numbers Gutter */}
        <div className="w-10 bg-arena-surface/40 border-r border-arena-border/50 select-none py-3 px-1 text-right font-mono text-[11px] text-arena-dim/60 leading-relaxed overflow-hidden">
          {lineNumbers.map((n) => (
            <div key={n}>{n}</div>
          ))}
        </div>

        {/* Code Textarea Workspace */}
        <div className="flex-1 relative h-full">
          <textarea
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            spellCheck={false}
            readOnly={!hasEditAccess}
            className={`w-full h-full p-3 font-mono text-xs text-slate-100 bg-arena-bg resize-none outline-none leading-relaxed code-editor-font ${
              !hasEditAccess ? 'opacity-85 cursor-not-allowed' : ''
            }`}
          />

          {!hasEditAccess && (
            <div className="absolute top-3 right-3 bg-arena-surface/90 border border-arena-border px-3 py-1 rounded text-[11px] text-amber-400 shadow-md">
              Peer is editing • View-only mode
            </div>
          )}
        </div>
      </div>

      {/* Execution Console & Test Output Pane (Bottom) */}
      <div className={`${consoleHeight} bg-arena-surface border-t border-arena-border flex flex-col shrink-0 transition-all duration-150`}>
        {/* Console Header Bar */}
        <div className="h-8 bg-arena-panel border-b border-arena-border px-3 flex items-center justify-between text-xs text-slate-300 shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 font-semibold text-slate-200">
              <Terminal className="w-3.5 h-3.5 text-blue-400" />
              <span>Execution Sandbox</span>
            </span>

            {executionMetrics && (
              <div className="flex items-center gap-2 text-[11px] font-mono ml-2">
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {executionMetrics.status} ({executionMetrics.casesPassed})
                </span>
                <span className="text-arena-border">|</span>
                <span className="text-arena-muted flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {executionMetrics.runtime}
                </span>
                <span className="text-arena-border">|</span>
                <span className="text-arena-muted flex items-center gap-1">
                  <Cpu className="w-3 h-3" />
                  {executionMetrics.memory}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setConsoleHeight(consoleHeight === 'h-44' ? 'h-64' : 'h-44')
              }
              className="text-arena-dim hover:text-white p-1 rounded"
              title="Toggle console height"
            >
              {consoleHeight === 'h-44' ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={() => {
                setOutput('');
                setExecutionMetrics(null);
              }}
              className="text-[11px] text-arena-dim hover:text-white"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Console Output Stream */}
        <div className="flex-1 p-3 overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed select-text">
          {output ? (
            <pre className="whitespace-pre-wrap text-emerald-400/90">{output}</pre>
          ) : (
            <div className="text-arena-dim text-xs italic flex items-center gap-2">
              <span>Ready. Click &quot;Run Code&quot; or press Ctrl+Enter to execute test cases.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
