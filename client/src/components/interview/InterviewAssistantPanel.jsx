import React, { useEffect, useState } from 'react';
import codingApi from '../../api/codingApi';

export default function InterviewAssistantPanel({
  currentQuestion = '',
  expectedKeywords = [],
  interviewType = 'TEXT',
  difficulty = 'MEDIUM',
}) {
  const [question, setQuestion] = useState(currentQuestion);
  const [currentDifficulty, setCurrentDifficulty] = useState(difficulty);
  const [answer, setAnswer] = useState('');
  const [previousTurns, setPreviousTurns] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setQuestion(currentQuestion);
    setResult(null);
    setAnswer('');
    setError('');
    setCurrentDifficulty(difficulty);
  }, [currentQuestion, difficulty]);

  async function handleSubmit() {
    if (!question) {
      setError('No interview question is available yet.');
      return;
    }

    if (!answer.trim()) {
      setError('Please enter an answer first.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await codingApi.interviewAssistant({
        currentQuestion: question,
        studentAnswer: answer.trim(),
        expectedKeywords,
        interviewType,
        difficulty: currentDifficulty,
        previousTurns,
      });

      const data = response?.data;

      if (!data) {
        throw new Error('Invalid AI assistant response.');
      }

      setResult(data);
      setPreviousTurns(data.updatedTurns || []);
      if (data.assistant?.nextDifficulty) setCurrentDifficulty(data.assistant.nextDifficulty);

      if (data.assistant?.nextQuestion) {
        setQuestion(data.assistant.nextQuestion);
      }

      setAnswer('');
    } catch (err) {
      console.error('[InterviewAssistant] Request failed:', err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Unable to get AI interview feedback.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="h-full flex flex-col border-l border-arena-border bg-arena-panel">
      <div className="px-4 py-3 border-b border-arena-border">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-arena-dim">
              AI Interview Assistant
            </div>
            <h3 className="mt-1 text-sm font-bold text-white font-display">
              Adaptive Interview
            </h3>
          </div>

          <span className="px-2 py-1 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">GEMINI • {currentDifficulty}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!question ? (
          <div className="rounded-md border border-arena-border bg-arena-bg p-4 text-center">
            <div className="text-xs font-semibold text-slate-200">
              Waiting for interview question
            </div>

            <p className="mt-1 text-[11px] text-arena-dim leading-relaxed">
              The AI assistant will become available when a question is
              attached to this interview.
            </p>
          </div>
        ) : (
          <>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-arena-dim mb-1">
                Question
              </div>

              <p className="text-xs text-slate-200 leading-relaxed">
                {question}
              </p>
            </div>

            <div>
              <label
                htmlFor="ai-interview-answer"
                className="text-[10px] uppercase tracking-wider text-arena-dim"
              >
                Your Answer
              </label>

              <textarea
                id="ai-interview-answer"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Type your answer..."
                rows={5}
                disabled={loading}
                className="mt-2 w-full resize-none rounded-md border border-arena-border bg-arena-bg px-3 py-2 text-xs text-white placeholder:text-arena-dim outline-none focus:border-blue-500 disabled:opacity-60"
              />
            </div>

            {error && (
              <div className="rounded-md border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !answer.trim()}
              className="w-full rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Analyzing with Gemini...' : 'Submit Answer'}
            </button>

            {result?.evaluation && (
              <div className="space-y-3 border-t border-arena-border pt-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-md bg-arena-bg p-2 text-center">
                    <div className="text-[10px] text-arena-dim">
                      Technical
                    </div>
                    <div className="mt-1 text-sm font-bold text-white">
                      {result.evaluation.technicalScore}/100
                    </div>
                  </div>

                  <div className="rounded-md bg-arena-bg p-2 text-center">
                    <div className="text-[10px] text-arena-dim">
                      Communication
                    </div>
                    <div className="mt-1 text-sm font-bold text-white">
                      {result.evaluation.communicationScore}/100
                    </div>
                  </div>

                  <div className="rounded-md bg-arena-bg p-2 text-center">
                    <div className="text-[10px] text-arena-dim">
                      Decision
                    </div>
                    <div className="mt-1 text-xs font-bold text-emerald-400">
                      {result.evaluation.recommendation || '—'}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase tracking-wider text-arena-dim mb-1">
                    Feedback
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {result.evaluation.summary}
                  </p>
                </div>

                {result.assistant?.message && (
                  <div className="rounded-md border border-blue-500/20 bg-blue-500/10 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-blue-400">
                      AI Follow-up
                    </div>

                    <p className="mt-1 text-xs text-slate-200 leading-relaxed">
                      {result.assistant.message}
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
