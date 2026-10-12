import React, { useEffect } from 'react';
import { AlertTriangle, StopCircle, Info, X, Loader2 } from 'lucide-react';

export default function EndInterviewModal({
  isOpen,
  onClose,
  onConfirm,
  ending = false,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !ending) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, ending, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="end-interview-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 relative">
        <button
          type="button"
          onClick={onClose}
          disabled={ending}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40"
          title="Cancel"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="pr-6">
            <h3 id="end-interview-title" className="text-base font-bold text-slate-900">
              End Interview Session?
            </h3>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              This action permanently finalizes the assessment for all participants and triggers final report generation.
            </p>
          </div>
        </div>

        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5">
          <div className="font-semibold text-amber-950 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>Important session consequences:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-900 ml-1 leading-normal">
            <li>The candidate will be redirected to their dashboard.</li>
            <li>Code editor and submission access will be permanently locked.</li>
            <li>Judge0 test metrics and AI observations will be consolidated into the scorecard.</li>
            <li>This interview cannot be resumed once completed.</li>
          </ul>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            disabled={ending}
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Keep Working
          </button>
          <button
            type="button"
            disabled={ending}
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {ending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating Report...</span>
              </>
            ) : (
              <>
                <StopCircle className="w-3.5 h-3.5" />
                <span>Confirm &amp; End Interview</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
