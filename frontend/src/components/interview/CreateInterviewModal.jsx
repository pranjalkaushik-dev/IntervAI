import React, { useState } from 'react';
import { X, Check, Copy, ArrowRight, ShieldCheck } from 'lucide-react';

const DEFAULT_PROBLEMS = [
  ['Two Sum', 'Easy'],
  ['Binary Tree Traversal', 'Medium'],
  ['LRU Cache', 'Hard'],
];

export default function CreateInterviewModal({ isOpen, onClose, onSubmit, createdRoom }) {
  const [formData, setFormData] = useState({
    title: 'DSA Technical Round',
    description: 'Coding and problem solving round',
    durationMinutes: 60,
    interviewType: 'CODING',
    problem: 'Two Sum',
    fullscreen: true,
    tab: true,
    dual: true,
  });

  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const selectedProblem = DEFAULT_PROBLEMS.find((x) => x[0] === formData.problem);
      await onSubmit({
        title: formData.title,
        description: formData.description,
        durationMinutes: Number(formData.durationMinutes),
        interviewType: formData.interviewType,
        settings: {
          requireFullscreen: formData.fullscreen,
          detectTabSwitch: formData.tab,
          enableCameraPrototype: formData.dual,
        },
        question: {
          type: 'CODING',
          prompt: formData.description,
          difficulty: (selectedProblem?.[1] || 'Medium').toUpperCase(),
          topic: 'Algorithms',
          testCases: [
            {
              input: 'nums = [2,7,11,15], target = 9',
              expected: '[0,1]',
            },
          ],
        },
      });
    } finally {
      setBusy(false);
    }
  };

  const handleCopyCode = () => {
    if (createdRoom?.roomCode) {
      navigator.clipboard?.writeText(createdRoom.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="ia-modal-backdrop">
      <div className="ia-modal">
        <div className="ia-modal-head">
          <div>
            <h3>{createdRoom ? 'Interview Session Created' : 'Create Technical Interview'}</h3>
            <p>
              {createdRoom
                ? 'Share the room code below with candidate to begin the assessment.'
                : 'Configure session parameters, problem focus, and integrity rules.'}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {createdRoom ? (
          <div className="p-6 space-y-5">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center space-y-3">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Assigned Interview Room Code
              </span>
              <h2 className="font-mono text-3xl font-bold text-blue-600 tracking-widest my-2">
                {createdRoom.roomCode}
              </h2>
              <button
                type="button"
                className="ia-outline-btn mx-auto"
                onClick={handleCopyCode}
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy Room Code'}</span>
              </button>
            </div>

            <button className="ia-primary-btn wide" type="button" onClick={onClose}>
              Return to Dashboard
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label>
              Interview Title
              <input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Senior Backend Engineer - Algorithms"
                required
              />
            </label>

            <label>
              Session Description & Focus
              <input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe focus areas or initial problem statement"
                required
              />
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label>
                Duration
                <select
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                >
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                  <option value="90">90 minutes</option>
                  <option value="120">120 minutes</option>
                </select>
              </label>

              <label>
                Assessment Type
                <select
                  value={formData.interviewType}
                  onChange={(e) => setFormData({ ...formData, interviewType: e.target.value })}
                >
                  <option value="CODING">Live Coding & Algorithms</option>
                  <option value="TECHNICAL">Technical Deep-Dive</option>
                  <option value="SYSTEM_DESIGN">System Design Architecture</option>
                  <option value="MIXED">Mixed / Hybrid Assessment</option>
                </select>
              </label>
            </div>

            <label>
              Initial Problem Template
              <select
                value={formData.problem}
                onChange={(e) => setFormData({ ...formData, problem: e.target.value })}
              >
                {DEFAULT_PROBLEMS.map(([name, diff]) => (
                  <option key={name} value={name}>
                    {name} ({diff})
                  </option>
                ))}
              </select>
            </label>

            {/* Proctoring Settings Container */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-blue-600" />
                <span className="text-xs font-semibold text-slate-800">
                  Proctoring & Integrity Enforcement
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <label className="flex items-center gap-2 font-normal cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.fullscreen}
                    onChange={(e) => setFormData({ ...formData, fullscreen: e.target.checked })}
                    className="w-auto m-0 rounded border-slate-300"
                  />
                  <span>Require fullscreen lock during assessment</span>
                </label>

                <label className="flex items-center gap-2 font-normal cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.tab}
                    onChange={(e) => setFormData({ ...formData, tab: e.target.checked })}
                    className="w-auto m-0 rounded border-slate-300"
                  />
                  <span>Detect and log tab switching events</span>
                </label>

                <label className="flex items-center gap-2 font-normal cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.dual}
                    onChange={(e) => setFormData({ ...formData, dual: e.target.checked })}
                    className="w-auto m-0 rounded border-slate-300"
                  />
                  <span>Enable secondary dual-camera mobile pairing</span>
                </label>
              </div>
            </div>

            <button className="ia-primary-btn wide" disabled={busy} type="submit">
              {busy ? 'Creating Session…' : 'Create Interview'}
              <ArrowRight size={15} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
