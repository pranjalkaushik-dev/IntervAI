import React, { useState } from 'react';

export default function QuestionPane({ interview, question }) {
  const [activeTab, setActiveTab] = useState('description');

  const title = interview?.title || 'Technical Interview';
  const type = interview?.interviewType || 'TECHNICAL';
  const duration = interview?.durationMinutes || 60;
  const status = interview?.status || 'CREATED';
  const roomCode = interview?.roomCode || '—';
  const description =
    question?.prompt ||
    interview?.description ||
    'No question has been assigned to this interview yet.';

  return (
    <aside className="h-full flex flex-col bg-arena-bg text-slate-100">
      <div className="px-4 py-3 border-b border-arena-border">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-arena-dim">
              Interview
            </div>

            <h2 className="mt-1 text-sm font-bold text-white font-display truncate">
              {title}
            </h2>
          </div>

          <span className="shrink-0 px-2 py-1 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {type}
          </span>
        </div>
      </div>

      <div className="flex border-b border-arena-border">
        <button
          type="button"
          onClick={() => setActiveTab('description')}
          className={`flex-1 px-3 py-2.5 text-xs font-medium transition ${
            activeTab === 'description'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-arena-dim hover:text-slate-200'
          }`}
        >
          Description
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tests')}
          className={`flex-1 px-3 py-2.5 text-xs font-medium transition ${
            activeTab === 'tests'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-arena-dim hover:text-slate-200'
          }`}
        >
          Test Cases
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'description' ? (
          <div className="space-y-5">
            <section>
              <div className="text-[10px] uppercase tracking-wider text-arena-dim">
                Interview
              </div>

              <h3 className="mt-1 text-base font-bold text-white font-display">
                {title}
              </h3>

              <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-arena-dim">
                <span>Type: {type}</span>
                <span>•</span>
                <span>Duration: {duration} min</span>
                <span>•</span>
                <span>Status: {status}</span>
              </div>
            </section>

            <section className="pt-4 border-t border-arena-border">
              <div className="text-xs font-semibold text-white mb-2">
                Description
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {description}
              </p>
            </section>

            <section className="pt-4 border-t border-arena-border">
              <div className="text-xs font-semibold text-white mb-3">
                Session Information
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-md bg-arena-panel border border-arena-border">
                  <div className="text-[10px] text-arena-dim">
                    Room Code
                  </div>

                  <div className="mt-1 font-mono text-xs text-white">
                    {roomCode}
                  </div>
                </div>

                <div className="p-2.5 rounded-md bg-arena-panel border border-arena-border">
                  <div className="text-[10px] text-arena-dim">
                    Duration
                  </div>

                  <div className="mt-1 font-mono text-xs text-white">
                    {duration} min
                  </div>
                </div>
              </div>
            </section>

            <section className="pt-4 border-t border-arena-border">
              <div className="text-xs font-semibold text-white mb-2">
                Company
              </div>

              <div className="text-xs text-slate-300">
                {interview?.company?.fullName ||
                  interview?.company?.name ||
                  'Assigned company'}
              </div>
            </section>
          </div>
        ) : (
          <div className="space-y-4">
            <section>
              <div className="text-xs font-semibold text-white mb-2">
                Predefined Test Cases
              </div>

              {question?.testCases?.length > 0 ? (
                <div className="space-y-2">
                  {question.testCases.map((tc, index) => {
                    const isHidden = tc.isHidden || tc.hidden;
                    return (
                      <div
                        key={index}
                        className="p-3 rounded-md bg-arena-panel border border-arena-border space-y-1.5 font-mono text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200">
                            Test Case #{index + 1}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-sans ${
                              isHidden
                                ? 'bg-amber-950/60 text-amber-400 border border-amber-800/60'
                                : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                            }`}
                          >
                            {isHidden ? 'Hidden' : 'Public'}
                          </span>
                        </div>

                        <div className="text-arena-dim text-[11px]">
                          Input: <span className="text-slate-300">{tc.input || '(empty)'}</span>
                        </div>

                        {!isHidden && (
                          <div className="text-arena-dim text-[11px]">
                            Expected: <span className="text-emerald-400">{tc.expectedOutput || tc.expected || '(empty)'}</span>
                          </div>
                        )}

                        {isHidden && (
                          <div className="text-arena-dim text-[11px] italic text-amber-400/80">
                            Expected output hidden for automated validation
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 rounded-md bg-arena-panel border border-arena-border text-xs text-arena-dim">
                  No predefined test cases attached to this question. Default execution mode active.
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </aside>
  );
}
