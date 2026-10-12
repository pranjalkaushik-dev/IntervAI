import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Code2,
  Eye,
  Trash2,
  X,
  Sparkles,
  BookOpen,
  Filter,
  Globe,
  Lock,
  Play,
  Calendar,
  Layers,
  HelpCircle,
  FileText,
  Edit2,
  Building2,
  CheckCircle2
} from 'lucide-react';
import questionApi from '../api/questionApi';
import interviewApi from '../api/interviewApi';
import { useAuth } from '../context/AuthContext';
import AIQuestionGeneratorModal from '../components/interview/AIQuestionGeneratorModal';
import QuestionDetailModal from '../components/interview/QuestionDetailModal';
import AssignQuestionModal from '../components/interview/AssignQuestionModal';

export default function QuestionBankPage() {
  const { isCompany, isAdmin, user } = useAuth();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [interviews, setInterviews] = useState([]);
  const [companies, setCompanies] = useState([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [originFilter, setOriginFilter] = useState('All');
  const [visibilityFilter, setVisibilityFilter] = useState('All');
  const [companyFilter, setCompanyFilter] = useState('All');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [viewQuestion, setViewQuestion] = useState(null);
  const [assignQuestion, setAssignQuestion] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);

  // Manual Creation / Edit Form
  const [form, setForm] = useState({
    title: '',
    prompt: '',
    type: 'CODING',
    topic: '',
    difficulty: 'MEDIUM',
    isPublished: false,
    interviewId: '',
    starterCode: '',
    constraints: '',
    exampleInput: '',
    exampleOutput: '',
    exampleExplanation: ''
  });

  const loadQuestions = () => {
    setLoading(true);
    setError('');

    const fetchPromise = isCompany
      ? questionApi.listLibrary()
      : questionApi.listPractice({ companyId: companyFilter !== 'All' ? companyFilter : undefined });

    fetchPromise
      .then((res) => setQuestions(res.data?.questions || []))
      .catch((err) => setError(err?.response?.data?.message || err.message || 'Failed to load question bank.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadQuestions();

    if (isCompany) {
      interviewApi
        .getInterviews()
        .then((res) => setInterviews(res.data?.interviews || []))
        .catch(() => {});
    } else {
      questionApi
        .getCompanies()
        .then((res) => setCompanies(res.data?.companies || []))
        .catch(() => {});
    }
  }, [isCompany, companyFilter]);

  const filteredQuestions = questions.filter((item) => {
    const text = `${item.title || ''} ${item.prompt || ''} ${item.topic || ''}`.toLowerCase();
    const matchesSearch = text.includes(searchQuery.toLowerCase());
    const matchesDiff = difficultyFilter === 'All' || item.difficulty === difficultyFilter;
    const matchesType = typeFilter === 'All' || item.type === typeFilter;
    const matchesOrigin =
      originFilter === 'All' ||
      (originFilter === 'AI' && (item.source === 'AI' || item.source === 'AI_GENERATED')) ||
      (originFilter === 'MANUAL' && (item.source === 'MANUAL' || item.source === 'CURATED'));
    const matchesVis =
      visibilityFilter === 'All' ||
      (visibilityFilter === 'PUBLISHED' && item.isPublished) ||
      (visibilityFilter === 'PRIVATE' && !item.isPublished);

    return matchesSearch && matchesDiff && matchesType && matchesOrigin && matchesVis;
  });

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this question permanently from the company repository?')) return;
    try {
      await questionApi.remove(id);
      loadQuestions();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to remove question.');
    }
  };

  const handleTogglePublish = async (question) => {
    try {
      await questionApi.togglePublish(question._id, !question.isPublished);
      loadQuestions();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to toggle publication status.');
    }
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    try {
      const examples = form.exampleInput || form.exampleOutput
        ? [
            {
              input: form.exampleInput,
              output: form.exampleOutput,
              explanation: form.exampleExplanation
            }
          ]
        : [];

      const constraintsList = form.constraints
        ? form.constraints
            .split('\n')
            .map((c) => c.trim())
            .filter(Boolean)
        : [];

      const payload = {
        title: form.title,
        prompt: form.prompt,
        type: form.type,
        topic: form.topic,
        difficulty: form.difficulty,
        isPublished: form.isPublished,
        interviewId: form.interviewId || null,
        starterCode: form.starterCode,
        constraints: constraintsList,
        examples
      };

      if (editingQuestion) {
        await questionApi.update(editingQuestion._id, payload);
      } else {
        await questionApi.create(payload);
      }

      setIsAddModalOpen(false);
      setEditingQuestion(null);
      setForm({
        title: '',
        prompt: '',
        type: 'CODING',
        topic: '',
        difficulty: 'MEDIUM',
        isPublished: false,
        interviewId: '',
        starterCode: '',
        constraints: '',
        exampleInput: '',
        exampleOutput: '',
        exampleExplanation: ''
      });
      loadQuestions();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to save question.');
    }
  };

  const openEditModal = (q) => {
    setEditingQuestion(q);
    setForm({
      title: q.title || '',
      prompt: q.prompt || '',
      type: q.type || 'CODING',
      topic: q.topic || '',
      difficulty: q.difficulty || 'MEDIUM',
      isPublished: Boolean(q.isPublished),
      interviewId: q.interview?._id || q.interview || '',
      starterCode: q.starterCode || '',
      constraints: Array.isArray(q.constraints) ? q.constraints.join('\n') : '',
      exampleInput: q.examples?.[0]?.input || '',
      exampleOutput: q.examples?.[0]?.output || q.examples?.[0]?.expected || '',
      exampleExplanation: q.examples?.[0]?.explanation || ''
    });
    setIsAddModalOpen(true);
  };

  return (
    <div className="ia-page ia-qb-page">
      {/* Page Header */}
      <div className="ia-page-head ia-qb-page-head">
        <div>
          <div className="flex items-center gap-2">
            <h1>{isCompany ? 'Company Question Repository' : 'Technical Question Bank & Practice'}</h1>
            {isCompany && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                Company Workspace
              </span>
            )}
          </div>
          <p>
            {isCompany
              ? 'Curate, store, and manage your organization’s reusable technical problems across coding, theory, and system design.'
              : 'Browse authorized technical problems, inspect architecture scenarios, and solve coding questions in an integrated sandbox editor.'}
          </p>
        </div>

        {isCompany && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              className="ia-outline-btn"
              onClick={() => setIsAiModalOpen(true)}
            >
              <Sparkles size={15} />
              <span>Generate with AI</span>
            </button>
            <button
              type="button"
              className="ia-primary-btn"
              onClick={() => {
                setEditingQuestion(null);
                setForm({
                  title: '',
                  prompt: '',
                  type: 'CODING',
                  topic: '',
                  difficulty: 'MEDIUM',
                  isPublished: false,
                  interviewId: '',
                  starterCode: '',
                  constraints: '',
                  exampleInput: '',
                  exampleOutput: '',
                  exampleExplanation: ''
                });
                setIsAddModalOpen(true);
              }}
            >
              <Plus size={16} />
              <span>Add New Question</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Filter & Problem Card */}
      <div className="ia-card ia-qb-card">
        <div className="ia-card-head ia-qb-card-head flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3>
              {isCompany ? 'Company Repository' : 'Available Practice Questions'}{' '}
              <span className="ia-count">{filteredQuestions.length}</span>
            </h3>
            <p>
              {isCompany
                ? 'Curated problems isolated to your organization’s talent evaluation pool'
                : 'Verified problems published by hiring teams for technical interview preparation'}
            </p>
          </div>

          {/* Table Tools & Filters */}
          <div className="ia-table-tools flex-wrap">
            <div className="ia-search min-w-[200px]">
              <Search size={15} />
              <input
                placeholder="Search prompt, title, topic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Type Filter */}
            <select
              className="ia-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="All">All Types</option>
              <option value="CODING">Coding (DSA)</option>
              <option value="TEXT">Theoretical / Text</option>
              <option value="MCQ">Multiple Choice (MCQ)</option>
              <option value="SYSTEM_DESIGN">System Design</option>
            </select>

            {/* Difficulty Filter */}
            <select
              className="ia-select"
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
            >
              <option value="All">All Difficulties</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>

            {/* Origin Filter (Company Only) */}
            {isCompany && (
              <select
                className="ia-select"
                value={originFilter}
                onChange={(e) => setOriginFilter(e.target.value)}
              >
                <option value="All">All Sources</option>
                <option value="AI">AI Generated</option>
                <option value="MANUAL">Curated / Manual</option>
              </select>
            )}

            {/* Visibility Filter (Company Only) */}
            {isCompany && (
              <select
                className="ia-select"
                value={visibilityFilter}
                onChange={(e) => setVisibilityFilter(e.target.value)}
              >
                <option value="All">All Visibility</option>
                <option value="PUBLISHED">Published (Practice)</option>
                <option value="PRIVATE">Private (Interviewer Only)</option>
              </select>
            )}

            {/* Company Filter (Candidate Only) */}
            {!isCompany && companies.length > 0 && (
              <select
                className="ia-select"
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
              >
                <option value="All">All Companies</option>
                {companies.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.fullName || c.email}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {error && <div className="ia-error mx-5 mt-4 shrink-0">{error}</div>}

        <div className="ia-table-wrap ia-qb-table-wrap">
          <table className="ia-table ia-qb-table">
            <thead>
              <tr>
                <th>Problem Statement</th>
                <th>Type</th>
                <th>Topic</th>
                <th>Difficulty</th>
                {isCompany ? <th>Visibility</th> : <th>Company</th>}
                {isCompany && <th>Origin</th>}
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isCompany ? 7 : 6} className="ia-empty">
                    <span>Loading repository questions…</span>
                  </td>
                </tr>
              ) : filteredQuestions.length === 0 ? (
                <tr>
                  <td colSpan={isCompany ? 7 : 6} className="ia-empty">
                    <BookOpen size={28} className="text-slate-400" />
                    <b>No questions found</b>
                    <span>
                      {isCompany
                        ? 'Create a new question or use AI generation to build your organization library.'
                        : 'No practice questions currently match your search filters.'}
                    </span>
                  </td>
                </tr>
              ) : (
                filteredQuestions.map((item) => (
                  <tr key={item._id}>
                    {/* Problem Statement & Title */}
                    <td className="max-w-md">
                      <div className="ia-problem-name">
                        <span className="shrink-0 text-blue-600">
                          {item.type === 'CODING' ? (
                            <Code2 size={16} />
                          ) : item.type === 'SYSTEM_DESIGN' ? (
                            <Layers size={16} />
                          ) : item.type === 'MCQ' ? (
                            <HelpCircle size={16} />
                          ) : (
                            <FileText size={16} />
                          )}
                        </span>
                        <div className="min-w-0">
                          <b className="truncate block text-slate-900">
                            {item.title || item.prompt}
                          </b>
                          <small className="text-slate-500 line-clamp-1 text-[11px]">
                            {item.prompt}
                          </small>
                        </div>
                      </div>
                    </td>

                    {/* Question Type */}
                    <td>
                      <span className="ia-lang text-[11px] font-semibold">
                        {item.type || 'CODING'}
                      </span>
                    </td>

                    {/* Topic */}
                    <td>
                      <span className="text-slate-700 text-xs">
                        {item.topic || 'General Algorithms'}
                      </span>
                    </td>

                    {/* Difficulty */}
                    <td>
                      <span
                        className={`ia-diff ${(item.difficulty || 'medium').toLowerCase()}`}
                      >
                        {item.difficulty}
                      </span>
                    </td>

                    {/* Visibility or Company */}
                    {isCompany ? (
                      <td>
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(item)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${
                            item.isPublished
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                          }`}
                          title="Click to toggle practice publication status"
                        >
                          {item.isPublished ? (
                            <>
                              <Globe size={11} /> Published
                            </>
                          ) : (
                            <>
                              <Lock size={11} /> Private
                            </>
                          )}
                        </button>
                      </td>
                    ) : (
                      <td>
                        <div className="flex items-center gap-1.5 text-xs text-slate-700">
                          <Building2 size={13} className="text-slate-400" />
                          <span>{item.companyId?.fullName || 'Verified Company'}</span>
                        </div>
                      </td>
                    )}

                    {/* Origin (Company Only) */}
                    {isCompany && (
                      <td>
                        <span
                          className={`ia-source ${
                            item.source === 'AI' || item.source === 'AI_GENERATED' ? 'ai' : 'manual'
                          }`}
                        >
                          {item.source === 'AI' || item.source === 'AI_GENERATED' ? 'AI' : 'Curated'}
                        </span>
                      </td>
                    )}

                    {/* Actions */}
                    <td>
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Coding Solve / Practice action */}
                        {item.type === 'CODING' && (
                          <button
                            onClick={() => navigate(`/practice/solve/${item._id}`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold transition-colors"
                            title="Open in dedicated coding practice playground"
                          >
                            <Play size={12} fill="currentColor" />
                            <span>Solve</span>
                          </button>
                        )}

                        {/* View / Detail action for other types or inspection */}
                        <button
                          className="ia-table-icon"
                          onClick={() => setViewQuestion(item)}
                          title="View full problem statement and practice workflow"
                        >
                          <Eye size={15} />
                        </button>

                        {/* Company Specific Management Actions */}
                        {isCompany && (
                          <>
                            <button
                              className="ia-table-icon text-blue-600 hover:text-blue-800"
                              onClick={() => setAssignQuestion(item)}
                              title="Assign question to an interview session"
                            >
                              <Calendar size={15} />
                            </button>

                            <button
                              className="ia-table-icon text-slate-600 hover:text-slate-900"
                              onClick={() => openEditModal(item)}
                              title="Edit question parameters"
                            >
                              <Edit2 size={14} />
                            </button>

                            <button
                              className="ia-table-icon text-rose-500 hover:text-rose-700"
                              onClick={() => handleDelete(item._id)}
                              title="Delete from repository"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Question Modal */}
      {isAddModalOpen && (
        <div className="ia-modal-backdrop">
          <div className="ia-modal max-w-xl">
            <div className="ia-modal-head">
              <div>
                <h3>{editingQuestion ? 'Edit Problem' : 'Add New Problem'}</h3>
                <p>Define technical problems stored in your company repository.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingQuestion(null);
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4 p-6">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-700">Problem Title</span>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Reverse Linked List, Rate Limiter"
                  className="w-full h-10 border border-slate-200 rounded-lg px-3 text-xs bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-700">Question Type</span>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full h-10 border border-slate-200 rounded-lg px-3 text-xs bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="CODING">Coding (DSA)</option>
                    <option value="TEXT">Theoretical / Text</option>
                    <option value="MCQ">Multiple Choice</option>
                    <option value="SYSTEM_DESIGN">System Design</option>
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-700">Topic</span>
                  <input
                    value={form.topic}
                    onChange={(e) => setForm({ ...form, topic: e.target.value })}
                    placeholder="e.g. Graph, Databases"
                    className="w-full h-10 border border-slate-200 rounded-lg px-3 text-xs bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-700">Difficulty</span>
                  <select
                    value={form.difficulty}
                    onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                    className="w-full h-10 border border-slate-200 rounded-lg px-3 text-xs bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-700">
                  Problem Statement / Prompt
                </span>
                <textarea
                  required
                  rows={4}
                  value={form.prompt}
                  onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                  placeholder="Detailed problem statement and instructions..."
                  className="w-full p-3 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none resize-none leading-relaxed"
                />
              </label>

              {form.type === 'CODING' && (
                <>
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-slate-700">
                      Starter Code Template (Optional)
                    </span>
                    <textarea
                      rows={3}
                      value={form.starterCode}
                      onChange={(e) => setForm({ ...form, starterCode: e.target.value })}
                      placeholder="function solution(nums) {&#10;  // your code&#10;}"
                      className="w-full p-3 border border-slate-200 rounded-lg font-mono text-xs bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none resize-none"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block space-y-1">
                      <span className="text-xs font-semibold text-slate-700">Sample Input</span>
                      <input
                        value={form.exampleInput}
                        onChange={(e) => setForm({ ...form, exampleInput: e.target.value })}
                        placeholder="[2, 7, 11, 15], 9"
                        className="w-full h-10 border border-slate-200 rounded-lg px-3 text-xs bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs font-semibold text-slate-700">Expected Output</span>
                      <input
                        value={form.exampleOutput}
                        onChange={(e) => setForm({ ...form, exampleOutput: e.target.value })}
                        placeholder="[0, 1]"
                        className="w-full h-10 border border-slate-200 rounded-lg px-3 text-xs bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none"
                      />
                    </label>
                  </div>
                </>
              )}

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <b className="text-xs text-slate-900 block">Publish for Candidate Practice</b>
                  <span className="text-[11px] text-slate-500">
                    If published, candidates can discover and practice this problem in the Question Bank.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </div>

              <button className="ia-primary-btn wide justify-center" type="submit">
                {editingQuestion ? 'Update Question in Repository' : 'Save Question to Repository'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Question Details / Practice Modal (Theory, MCQ, System Design) */}
      {viewQuestion && (
        <QuestionDetailModal
          question={viewQuestion}
          onClose={() => setViewQuestion(null)}
          isCompany={isCompany}
        />
      )}

      {/* AI Question Generator Modal */}
      <AIQuestionGeneratorModal
        isOpen={isAiModalOpen}
        onClose={() => {
          setIsAiModalOpen(false);
          loadQuestions();
        }}
        interviews={interviews}
        onSaved={loadQuestions}
      />

      {/* Assign to Interview Modal */}
      {assignQuestion && (
        <AssignQuestionModal
          question={assignQuestion}
          interviews={interviews}
          isOpen={Boolean(assignQuestion)}
          onClose={() => setAssignQuestion(null)}
          onSuccess={loadQuestions}
        />
      )}
    </div>
  );
}
