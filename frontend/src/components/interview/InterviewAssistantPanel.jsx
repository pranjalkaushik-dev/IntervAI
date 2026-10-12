import React, { useEffect, useState } from 'react';
import codingApi from '../../api/codingApi';
import reportApi from '../../api/reportApi';

export default function InterviewAssistantPanel({
  interviewId,
  currentQuestion = '',
  expectedKeywords = [],
  interviewType = 'TEXT',
  difficulty = 'MEDIUM',
  initialTurns = [],
}) {
  const [question, setQuestion] = useState(currentQuestion);
  const [currentDifficulty, setCurrentDifficulty] = useState(difficulty);
  const [currentKeywords, setCurrentKeywords] = useState(expectedKeywords);
  const [currentType, setCurrentType] = useState(interviewType);
  const [answer, setAnswer] = useState('');
  const [previousTurns, setPreviousTurns] = useState(initialTurns);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setQuestion(currentQuestion);
    setResult(null);
    setAnswer('');
    setError('');
    setCurrentDifficulty(difficulty);
    setCurrentKeywords(expectedKeywords);
    setCurrentType(interviewType);
  }, [currentQuestion, difficulty, expectedKeywords, interviewType]);

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
        candidateAnswer: answer.trim(),
        expectedKeywords: currentKeywords,
        interviewType: currentType,
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
        setCurrentKeywords([]);
        setCurrentType('TEXT');
      }

      try {
        await reportApi.recordTurn(interviewId, {
          question,
          candidateAnswer: answer.trim(),
          technicalScore: data.evaluation.technicalScore,
          communicationScore: data.evaluation.communicationScore,
          summary: data.evaluation.summary,
        });
      } catch (persistError) {
        setError(
          `AI feedback was generated but could not be saved: ${
            persistError?.response?.data?.message ||
            persistError?.message ||
            'Please try again.'
          }`
        );
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
    <section className="h-full flex flex-col border-l border-arena-border bg-white">
      <div className="px-4 py-3 border-b border-arena-border bg-slate-50/60">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              AI Interview Assistant
            </div>
            <h3 className="mt-0.5 text-sm font-bold text-slate-900 font-display">
              Adaptive Interview
            </h3>
          </div>

          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            GEMINI • {currentDifficulty}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!question ? (
          <div className="rounded-lg border border-arena-border bg-slate-50 p-4 text-center">
            <div className="text-xs font-semibold text-slate-800">
              Waiting for interview question
            </div>

            <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
              The AI assistant will become available when a question is
              attached to this interview.
            </p>
          </div>
        ) : (
          <>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Question
              </div>

              <p className="text-xs text-slate-800 font-medium leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                {question}
              </p>
            </div>

            <div>
              <label
                htmlFor="ai-interview-answer"
                className="text-[10px] font-semibold uppercase tracking-wider text-slate-500"
              >
                Candidate Answer
              </label>

              <textarea
                id="ai-interview-answer"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Type or transcribe candidate response..."
                rows={5}
                disabled={loading}
                className="mt-1.5 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 disabled:opacity-60"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 font-medium">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !answer.trim()}
              className="w-full rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
            >
              {loading ? 'Analyzing with Gemini...' : 'Submit Answer'}
            </button>

            {result?.evaluation && (
              <div className="space-y-3 border-t border-arena-border pt-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-2 text-center">
                    <div className="text-[10px] text-slate-500 uppercase font-medium">
                      Technical
                    </div>
                    <div className="mt-0.5 text-sm font-bold text-slate-900">
                      {result.evaluation.technicalScore}/100
                    </div>
                  </div>

                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-2 text-center">
                    <div className="text-[10px] text-slate-500 uppercase font-medium">
                      Communication
                    </div>
                    <div className="mt-0.5 text-sm font-bold text-slate-900">
                      {result.evaluation.communicationScore}/100
                    </div>
                  </div>

                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-2 text-center">
                    <div className="text-[10px] text-slate-500 uppercase font-medium">
                      Decision
                    </div>
                    <div className="mt-0.5 text-xs font-bold text-emerald-600">
                      {result.evaluation.recommendation || '—'}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Feedback
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    {result.evaluation.summary}
                  </p>
                </div>

                {result.assistant?.message && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">
                      AI Follow-up
                    </div>

                    <p className="mt-1 text-xs text-blue-950 leading-relaxed">
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
