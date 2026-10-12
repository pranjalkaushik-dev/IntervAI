import React, { useState } from 'react';
import {
  FileText,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  Code2,
  Cpu,
  Layers,
} from 'lucide-react';

export default function QuestionPane({
  interview,
  question,
  questionIndex = 0,
  totalQuestions = 1,
  onNextQuestion,
  onPrevQuestion,
  onCollapse,
}) {
  const [activeTab, setActiveTab] = useState('description');

  const title = question?.topic || interview?.title || 'Technical Problem';
  const type = question?.type || interview?.interviewType || 'CODING';
  const difficulty = (question?.difficulty || 'MEDIUM').toUpperCase();
  const description =
    question?.prompt ||
    interview?.description ||
    'No problem description has been provided for this assessment.';

  const testCases = question?.testCases || [];

  return (
    <aside className="h-full flex flex-col bg-white text-slate-800 select-none overflow-hidden">
      {/* Pane Header: Problem navigation & collapse control */}
      <div className="h-10 px-3.5 border-b border-[#EEF2F8] bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          {totalQuestions > 1 && (
            <div className="flex items-center gap-1">
              <button
                disabled={questionIndex === 0}
                onClick={onPrevQuestion}
                className="w-6 h-6 rounded border border-[#DFE5EF] bg-white hover:bg-[#F5F7FB] text-[#172033] flex items-center justify-center disabled:opacity-30 transition-colors"
                title="Previous problem"
              >
                <ChevronLeft size={13} />
              </button>
              <span className="text-[11px] font-mono font-bold text-[#172033] px-1">
                {questionIndex + 1} / {totalQuestions}
              </span>
              <button
                disabled={questionIndex === totalQuestions - 1}
                onClick={onNextQuestion}
                className="w-6 h-6 rounded border border-[#DFE5EF] bg-white hover:bg-[#F5F7FB] text-[#172033] flex items-center justify-center disabled:opacity-30 transition-colors"
                title="Next problem"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          )}
          <span className="text-xs font-bold text-[#172033] truncate max-w-[140px]">
            {totalQuestions > 1 ? `Problem ${questionIndex + 1}` : 'Problem'}
          </span>
        </div>

        {onCollapse && (
          <button
            onClick={onCollapse}
            className="w-7 h-7 rounded-md hover:bg-[#F5F7FB] text-[#596579] hover:text-[#172033] flex items-center justify-center transition-colors"
            title="Collapse problem sidebar"
          >
            <PanelLeftClose size={15} />
          </button>
        )}
      </div>

      {/* Problem Title & Meta Strip */}
      <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#EEF2F8]">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              difficulty === 'EASY'
                ? 'bg-[#F0FDF4] text-[#16A34A] border border-[#DCFCE7]'
                : difficulty === 'HARD'
                ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                : 'bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]'
            }`}
          >
            {difficulty}
          </span>

          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EFF4FF] text-[#365FEA] border border-[#DBEAFE]">
            {type}
          </span>
        </div>

        <h2 className="text-sm font-bold text-[#172033] leading-snug">
          {title}
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#EEF2F8] bg-white shrink-0 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('description')}
          className={`flex-1 py-2 text-center font-semibold transition-all border-b-2 ${
            activeTab === 'description'
              ? 'text-[#365FEA] border-[#365FEA] bg-white'
              : 'text-[#596579] border-transparent hover:text-[#172033] hover:bg-[#F8FAFC]'
          }`}
        >
          Statement
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tests')}
          className={`flex-1 py-2 text-center font-semibold transition-all border-b-2 ${
            activeTab === 'tests'
              ? 'text-[#365FEA] border-[#365FEA] bg-white'
              : 'text-[#596579] border-transparent hover:text-[#172033] hover:bg-[#F8FAFC]'
          }`}
        >
          Test Cases ({testCases.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-white text-xs select-text">
        {activeTab === 'description' ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-[#172033] uppercase tracking-wider mb-2">
                Problem Statement
              </h3>
              <div className="text-xs text-[#20242C] leading-relaxed whitespace-pre-wrap font-sans">
                {description}
              </div>
            </div>

            {question?.examples && question.examples.length > 0 && (
              <div className="pt-3 border-t border-[#EEF2F8] space-y-2.5">
                <h3 className="text-xs font-bold text-[#172033] uppercase tracking-wider">
                  Examples
                </h3>
                {question.examples.map((ex, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-[#F8FAFC] border border-[#DFE5EF] space-y-1 font-mono text-[11px]">
                    <div><b className="text-[#596579]">Input:</b> <span className="text-[#172033]">{ex.input}</span></div>
                    <div><b className="text-[#596579]">Output:</b> <span className="text-[#16A34A] font-bold">{ex.output}</span></div>
                    {ex.explanation && (
                      <div className="text-[#596579] font-sans text-[11px] pt-1 italic">
                        {ex.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {question?.constraints && (
              <div className="pt-3 border-t border-[#EEF2F8]">
                <h3 className="text-xs font-bold text-[#172033] uppercase tracking-wider mb-1.5">
                  Constraints
                </h3>
                <div className="text-xs text-[#596579] font-mono whitespace-pre-wrap">
                  {question.constraints}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#172033] uppercase tracking-wider mb-2">
              Validation Cases
            </h3>

            {testCases.length > 0 ? (
              <div className="space-y-2.5">
                {testCases.map((tc, index) => {
                  const isHidden = tc.isHidden || tc.hidden;
                  return (
                    <div
                      key={index}
                      className="p-3 rounded-lg bg-[#F8FAFC] border border-[#DFE5EF] space-y-1.5 font-mono text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#172033]">
                          Case #{index + 1}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-sans font-semibold ${
                            isHidden
                              ? 'bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]'
                              : 'bg-[#F0FDF4] text-[#16A34A] border border-[#DCFCE7]'
                          }`}
                        >
                          {isHidden ? 'Hidden' : 'Public'}
                        </span>
                      </div>

                      <div className="text-[#596579] text-[11px]">
                        Input: <span className="text-[#172033] font-medium">{tc.input || '(empty)'}</span>
                      </div>

                      {!isHidden && (
                        <div className="text-[#596579] text-[11px]">
                          Expected: <span className="text-[#16A34A] font-bold">{tc.expectedOutput || tc.expected || '(empty)'}</span>
                        </div>
                      )}

                      {isHidden && (
                        <div className="text-[11px] italic text-[#D97706]">
                          Output evaluated by automated Judge0 runner
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#DFE5EF] text-xs text-[#596579] text-center">
                Standard problem sandbox active. Run code with sample inputs to test logic.
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
