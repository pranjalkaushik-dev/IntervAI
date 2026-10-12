import React, { useState } from 'react';
import { X, Sparkles, Save, RefreshCw, CheckCircle2 } from 'lucide-react';
import questionApi from '../../api/questionApi';

const defaultForm = {
  role: 'Software Engineer',
  skills: 'Data Structures, Algorithms',
  difficulty: 'MEDIUM',
  type: 'CODING',
  mode: 'MIXED',
  numberOfQuestions: 3,
  interviewId: '',
};

export default function AIQuestionGeneratorModal({ isOpen, onClose, interviews = [], initialInterviewId = '' }) {
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
      if (!generated.length) setMessage('No questions were returned. Try different skills.');
    } catch (err) {
      setError(err?.message || 'AI question generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const saveSelected = async () => {
    if (!form.interviewId) {
      setError('Select an interview before saving generated questions.');
      return;
    }
    const chosen = questions.filter((_, index) => selected.has(index));
    if (!chosen.length) {
      setError('Select at least one generated question.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await questionApi.bulkCreate({
        interviewId: form.interviewId,
        questions: chosen.map((question) => ({ ...question, source: 'AI' })),
      });
      setMessage(`${chosen.length} AI-generated question${chosen.length > 1 ? 's' : ''} saved to the interview.`);
      setSelected(new Set());
    } catch (err) {
      setError(err?.message || 'Failed to save generated questions.');
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
      <div className="ia-modal ia-ai-generator-modal">
        <div className="ia-modal-head">
          <div>
            <div className="ia-ai-eyebrow"><Sparkles size={13} /> Gemini AI</div>
            <h3>AI Question Generator</h3>
            <p>Generate interview-ready coding, MCQ or technical questions and save them directly to an interview.</p>
          </div>
          <button onClick={onClose}><X size={19} /></button>
        </div>

        <form onSubmit={generate} className="ia-ai-generator-form">
          <div className="ia-ai-grid">
            <label>Student role<input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Software Engineer" /></label>
            <label>Skills<input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="React, Node.js, DSA" /></label>
            <label>Difficulty<select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option></select></label>
            <label>Interview mode<select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}><option value="DSA">DSA</option><option value="CORE_CS">Core CS</option><option value="PROJECT">Project</option><option value="MIXED">Mixed</option></select></label>
            <label>Question type<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="CODING">Coding / DSA</option><option value="TEXT">Technical / Conceptual</option><option value="MCQ">MCQ</option><option value="SYSTEM_DESIGN">System Design Architecture</option></select></label>
            <label>Number<select value={form.numberOfQuestions} onChange={(e) => setForm({ ...form, numberOfQuestions: e.target.value })}>{[1,2,3,4,5,6,8,10].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
            <label>Save to interview<select value={form.interviewId} onChange={(e) => setForm({ ...form, interviewId: e.target.value })}><option value="">Generate only — select later</option>{interviews.map((i) => <option key={i._id} value={i._id}>{i.title} • {i.roomCode}</option>)}</select></label>
          </div>
          <button className="ia-primary-btn wide" disabled={loading}><Sparkles size={16} />{loading ? 'Generating with Gemini...' : 'Generate Questions'}</button>
        </form>

        {error && <div className="ia-error">{error}</div>}
        {message && <div className="ia-success"><CheckCircle2 size={16} />{message}</div>}

        {questions.length > 0 && <div className="ia-generated-list">
          <div className="ia-generated-head"><div><b>Generated questions</b><span>{selected.size} selected</span></div><button type="button" className="ia-outline-btn" onClick={generate} disabled={loading}><RefreshCw size={14}/> Regenerate</button></div>
          {questions.map((question, index) => <div key={`${question.prompt}-${index}`} className={`ia-generated-question ${selected.has(index) ? 'selected' : ''}`} onClick={() => toggle(index)}>
            <div className="ia-generated-check">{selected.has(index) ? <CheckCircle2 size={18} /> : <span />}</div>
            <div className="ia-generated-body"><div className="ia-generated-meta"><span>{question.type}</span><span>{question.topic}</span><span>{question.difficulty}</span></div><b>{question.prompt}</b>{question.constraints?.length > 0 && <small>{question.constraints.slice(0, 2).join(' • ')}</small>}{question.options?.length === 4 && <small>{question.options.join('  •  ')}</small>}</div>
          </div>)}
          <button type="button" className="ia-primary-btn wide" onClick={saveSelected} disabled={saving || !form.interviewId}><Save size={16} />{saving ? 'Saving...' : `Save ${selected.size || ''} selected question${selected.size === 1 ? '' : 's'}`}</button>
        </div>}
      </div>
    </div>
  );
}
