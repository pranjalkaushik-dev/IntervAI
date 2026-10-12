import React, { useState } from 'react';
import { X, Sparkles, Save, RefreshCw, CheckCircle2, Globe, Lock } from 'lucide-react';
import questionApi from '../../api/questionApi';

const defaultForm = {
  role: 'Software Engineer',
  skills: 'Data Structures, Algorithms',
  difficulty: 'MEDIUM',
  type: 'CODING',
  mode: 'MIXED',
  numberOfQuestions: 3,
  interviewId: '',
  isPublished: false,
};

export default function AIQuestionGeneratorModal({
  isOpen,
  onClose,
  interviews = [],
  initialInterviewId = '',
  onSaved
}) {
  const [form, setForm] = useState({ ...defaultForm, interviewId: initialInterviewId });
  const [questions, setQuestions] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const generate = async (event) => {
    event?.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await questionApi.generateWithAI({
        role: form.role.trim(),
        skills: form.skills.split(',').map((x) => x.trim()).filter(Boolean),
        difficulty: form.difficulty,
        type: form.type,
        mode: form.mode,
        numberOfQuestions: Number(form.numberOfQuestions),
        save: false,
      });
      const generated = response?.data?.questions || [];
      setQuestions(generated);
      setSelected(new Set(generated.map((_, index) => index)));
      if (!generated.length) setMessage('No questions were returned. Try different skills or role.');
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'AI question generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const saveSelected = async () => {
    const chosen = questions.filter((_, index) => selected.has(index));
    if (!chosen.length) {
      setError('Select at least one generated question to save.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      await questionApi.bulkCreate({
        interviewId: form.interviewId || null,
        isPublished: form.isPublished,
        questions: chosen.map((question) => ({
          ...question,
          source: 'AI',
          isPublished: form.isPublished
        })),
      });

      const destination = form.interviewId
        ? 'saved to company repository and assigned to interview'
        : 'saved to company Question Bank';

      setMessage(`${chosen.length} AI-generated question${chosen.length > 1 ? 's' : ''} ${destination}.`);
      setSelected(new Set());
      if (onSaved) onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to save generated questions.');
    } finally {
      setSaving(false);
    }
  };

  const toggle = (index) => {
    const next = new Set(selected);
    next.has(index) ? next.delete(index) : next.add(index);
    setSelected(next);
  };

  return (
    <div className="ia-modal-backdrop">
      <div className="ia-modal ia-ai-generator-modal max-w-2xl">
        <div className="ia-modal-head">
          <div>
            <div className="ia-ai-eyebrow">
              <Sparkles size={13} /> Gemini AI
            </div>
            <h3>AI Question Generator</h3>
            <p>Generate interview-ready problems and save them directly to your company repository.</p>
          </div>
          <button onClick={onClose} aria-label="Close modal">
            <X size={19} />
          </button>
        </div>

        <form onSubmit={generate} className="ia-ai-generator-form">
          <div className="ia-ai-grid">
            <label>
              Target Role
              <input
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                placeholder="Software Engineer"
                required
              />
            </label>
            <label>
              Skills / Topics
              <input
                value={form.skills}
                onChange={(e) => setForm({ ...form, skills: e.target.value })}
                placeholder="React, Node.js, Graph Algorithms"
                required
              />
            </label>
            <label>
              Difficulty
              <select
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </label>
            <label>
              Interview Mode
              <select
                value={form.mode}
                onChange={(e) => setForm({ ...form, mode: e.target.value })}
              >
                <option value="DSA">DSA</option>
                <option value="CORE_CS">Core CS</option>
                <option value="PROJECT">Project</option>
                <option value="MIXED">Mixed</option>
              </select>
            </label>
            <label>
              Question Type
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="CODING">Coding (Solvable in Editor)</option>
                <option value="TEXT">Theoretical / Conceptual</option>
                <option value="MCQ">Multiple Choice (MCQ)</option>
                <option value="SYSTEM_DESIGN">System Design Architecture</option>
              </select>
            </label>
            <label>
              Number of Questions
              <select
                value={form.numberOfQuestions}
                onChange={(e) => setForm({ ...form, numberOfQuestions: e.target.value })}
              >
                {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Assign to Interview (Optional)
              <select
                value={form.interviewId}
                onChange={(e) => setForm({ ...form, interviewId: e.target.value })}
              >
                <option value="">Save to Company Question Bank Only</option>
                {interviews.map((i) => (
                  <option key={i._id} value={i._id}>
                    {i.title} • {i.roomCode}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 pt-6 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-700 font-medium flex items-center gap-1">
                <Globe size={13} className="text-emerald-600" /> Publish for Candidate Practice
              </span>
            </label>
          </div>
          <button className="ia-primary-btn wide mt-4" disabled={loading} type="submit">
            <Sparkles size={16} />
            {loading ? 'Generating with Gemini...' : 'Generate Questions'}
          </button>
        </form>

        {error && <div className="ia-error my-3">{error}</div>}
        {message && (
          <div className="ia-success my-3 flex items-center gap-2">
            <CheckCircle2 size={16} />
            {message}
          </div>
        )}

        {questions.length > 0 && (
          <div className="ia-generated-list mt-5 space-y-3">
            <div className="ia-generated-head flex items-center justify-between">
              <div>
                <b>Generated Questions</b>
                <span className="ml-2 text-xs text-slate-500">
                  {selected.size} of {questions.length} selected
                </span>
              </div>
              <button
                type="button"
                className="ia-outline-btn text-xs py-1"
                onClick={generate}
                disabled={loading}
              >
                <RefreshCw size={13} /> Regenerate
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {questions.map((question, index) => (
                <div
                  key={`${question.prompt}-${index}`}
                  className={`ia-generated-question p-3 rounded-lg border transition-all cursor-pointer ${
                    selected.has(index)
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                  onClick={() => toggle(index)}
                >
                  <div className="flex items-start gap-3">
                    <div className="pt-0.5">
                      {selected.has(index) ? (
                        <CheckCircle2 size={18} className="text-blue-600" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {question.type || form.type}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                          {question.topic || 'General'}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700">
                          {question.difficulty || form.difficulty}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-900 line-clamp-2">
                        {question.prompt}
                      </p>
                      {question.constraints?.length > 0 && (
                        <small className="text-[11px] text-slate-500 block mt-1">
                          Constraints: {question.constraints.slice(0, 2).join(' • ')}
                        </small>
                      )}
                      {question.options?.length > 0 && (
                        <div className="grid grid-cols-2 gap-1 mt-1 text-[11px] text-slate-600">
                          {question.options.map((opt, oi) => (
                            <span key={oi}>• {opt}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="ia-primary-btn wide justify-center mt-3"
              onClick={saveSelected}
              disabled={saving || selected.size === 0}
            >
              <Save size={16} />
              {saving
                ? 'Saving to Repository...'
                : `Save ${selected.size} Selected Question${selected.size === 1 ? '' : 's'} to Repository`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
