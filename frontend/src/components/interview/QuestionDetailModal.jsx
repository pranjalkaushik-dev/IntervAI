import React, { useState } from 'react';
import {
  X,
  BookOpen,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Layers,
  Sparkles,
  KeyRound,
  FileText,
  Send,
  Eye,
  Check
} from 'lucide-react';

export default function QuestionDetailModal({
  question,
  onClose,
  isCompany = false
}) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [mcqSubmitted, setMcqSubmitted] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [answerSubmitted, setAnswerSubmitted] = useState(false);

  if (!question) return null;

  const isMcq = question.type === 'MCQ';
  const isTheory = question.type === 'TEXT' || question.type === 'THEORY';
  const isSystemDesign = question.type === 'SYSTEM_DESIGN';
  const isCoding = question.type === 'CODING';

  const handleCheckMcq = (e) => {
    e.preventDefault();
    if (selectedOption === null) return;
    setMcqSubmitted(true);
  };

  const handleAnswerSubmit = (e) => {
    e.preventDefault();
    if (!userAnswer.trim()) return;
    setAnswerSubmitted(true);
  };

  return (
    <div className="ia-modal-backdrop">
      <div className="ia-modal max-w-2xl bg-white rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="ia-modal-head px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
              {isMcq ? (
                <HelpCircle size={16} />
              ) : isSystemDesign ? (
                <Layers size={16} />
              ) : isCoding ? (
                <BookOpen size={16} />
              ) : (
                <FileText size={16} />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {question.title || 'Technical Question'}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100/60 text-blue-700">
                  {question.type || 'Question'}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200/60 text-slate-700">
                  {question.topic || 'General'}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                    String(question.difficulty).toLowerCase() === 'easy'
                      ? 'bg-emerald-100/60 text-emerald-700'
                      : String(question.difficulty).toLowerCase() === 'hard'
                      ? 'bg-rose-100/60 text-rose-700'
                      : 'bg-amber-100/60 text-amber-700'
                  }`}
                >
                  {question.difficulty || 'Medium'}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-800 flex-1">
          {/* Question Prompt */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Question Prompt
            </span>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium leading-relaxed whitespace-pre-wrap">
              {question.prompt}
            </div>
          </div>

          {/* MCQ Practice Section */}
          {isMcq && Array.isArray(question.options) && (
            <div className="space-y-3 pt-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Select Option:
              </span>
              <div className="space-y-2">
                {question.options.map((opt, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrect = isCompany && question.correctOptionIndex === idx;

                  return (
                    <label
                      key={idx}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/50 text-blue-900 font-semibold'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      } ${isCorrect ? 'border-emerald-500 bg-emerald-50/40' : ''}`}
                    >
                      <input
                        type="radio"
                        name="mcq-option"
                        checked={isSelected}
                        onChange={() => {
                          setSelectedOption(idx);
                          setMcqSubmitted(false);
                        }}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="flex-1">{opt}</span>
                      {isCorrect && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                          Correct Answer (Interviewer View)
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>

              {!isCompany && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleCheckMcq}
                    disabled={selectedOption === null}
                    className="ia-primary-btn disabled:opacity-50"
                  >
                    <Check size={14} /> Check Answer
                  </button>

                  {mcqSubmitted && (
                    <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs">
                      Answer checked! Option {String.fromCharCode(65 + selectedOption)} recorded in
                      practice session.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Theory / Conceptual Question Practice */}
          {isTheory && (
            <div className="space-y-3 pt-2">
              {isCompany && Array.isArray(question.expectedKeywords) && question.expectedKeywords.length > 0 && (
                <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-amber-800 font-bold text-[11px] uppercase tracking-wide">
                    <KeyRound size={13} />
                    <span>Evaluation Criteria & Expected Keywords (Company Private)</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {question.expectedKeywords.map((kw, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white text-amber-900 border border-amber-300"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Practice Answer Draft:
                </span>
                <textarea
                  value={userAnswer}
                  onChange={(e) => {
                    setUserAnswer(e.target.value);
                    setAnswerSubmitted(false);
                  }}
                  placeholder="Draft your explanation, technical reasoning, and trade-offs here..."
                  rows={6}
                  className="w-full p-3.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-xs focus:outline-none focus:border-blue-500 resize-none font-sans leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Words: {userAnswer.trim() ? userAnswer.trim().split(/\s+/).length : 0}
                </span>
                <button
                  type="button"
                  onClick={handleAnswerSubmit}
                  disabled={!userAnswer.trim()}
                  className="ia-primary-btn disabled:opacity-50"
                >
                  <Send size={14} /> Submit Practice Draft
                </button>
              </div>

              {answerSubmitted && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>Your practice draft has been saved to your practice session history!</span>
                </div>
              )}
            </div>
          )}

          {/* System Design Architecture Practice */}
          {isSystemDesign && (
            <div className="space-y-3 pt-2">
              <div className="p-3.5 rounded-lg bg-blue-50/70 border border-blue-200 space-y-1 text-blue-900">
                <b className="text-xs">Architecture & System Design Guide</b>
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  Focus on high-level architecture: functional vs non-functional requirements, API
                  design, data schemas, caching layer, messaging queues, and scaling bottlenecks.
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  System Architecture Outline / Notes:
                </span>
                <textarea
                  value={userAnswer}
                  onChange={(e) => {
                    setUserAnswer(e.target.value);
                    setAnswerSubmitted(false);
                  }}
                  placeholder="1. Requirements & Scale Estimations&#10;2. High-Level Components (Load Balancer, API Gateway, Services)&#10;3. Data Storage (SQL vs NoSQL, Sharding)&#10;4. Caching & Message Queues&#10;5. Reliability & Disaster Recovery"
                  rows={8}
                  className="w-full p-3.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-xs focus:outline-none focus:border-blue-500 resize-none font-mono leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Characters: {userAnswer.length}
                </span>
                <button
                  type="button"
                  onClick={handleAnswerSubmit}
                  disabled={!userAnswer.trim()}
                  className="ia-primary-btn disabled:opacity-50"
                >
                  <Send size={14} /> Save Architecture Plan
                </button>
              </div>

              {answerSubmitted && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>Architecture plan saved for practice review!</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end shrink-0">
          <button type="button" onClick={onClose} className="ia-outline-btn">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
