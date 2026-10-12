import React, { useState } from 'react';
import { X, Calendar, CheckCircle2, ArrowRight } from 'lucide-react';
import questionApi from '../../api/questionApi';

export default function AssignQuestionModal({
  question,
  interviews = [],
  isOpen,
  onClose,
  onSuccess
}) {
  const [selectedInterviewId, setSelectedInterviewId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen || !question) return null;

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedInterviewId) {
      setError('Please select an interview session.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await questionApi.assignToInterview({
        questionId: question._id,
        interviewId: selectedInterviewId
      });
      setSuccess('Question assigned and snapshot created successfully for this interview!');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1200);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to assign question.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ia-modal-backdrop">
      <div className="ia-modal max-w-md">
        <div className="ia-modal-head">
          <div>
            <h3>Assign to Interview</h3>
            <p>Attach this question to a scheduled interview session.</p>
          </div>
          <button type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleAssign} className="p-6 space-y-4">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Selected Question
            </span>
            <div className="font-semibold text-xs text-slate-900 truncate">
              {question.title || question.prompt}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {question.topic || 'General'} &bull; {question.type || 'Coding'} &bull; {question.difficulty}
            </div>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-700">Target Interview Session:</span>
            <select
              value={selectedInterviewId}
              onChange={(e) => setSelectedInterviewId(e.target.value)}
              required
              className="w-full h-10 border border-slate-200 rounded-lg px-3 text-xs bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select an interview session</option>
              {interviews.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.title} &bull; {item.roomCode} ({item.status})
                </option>
              ))}
            </select>
          </label>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Note: Assigning creates an isolated snapshot. Any subsequent updates to this repository
            question will not modify already scheduled or completed assessments.
          </p>

          {error && <div className="ia-error text-xs">{error}</div>}
          {success && (
            <div className="ia-success text-xs flex items-center gap-1.5">
              <CheckCircle2 size={15} />
              <span>{success}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="ia-outline-btn">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedInterviewId}
              className="ia-primary-btn disabled:opacity-50"
            >
              {loading ? 'Assigning…' : 'Confirm Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
