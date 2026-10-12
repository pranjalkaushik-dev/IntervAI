import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import questionApi from '../api/questionApi';
import interviewApi from '../api/interviewApi';
import AIQuestionGeneratorModal from '../components/interview/AIQuestionGeneratorModal';

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewQuestion, setViewQuestion] = useState(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [interviews, setInterviews] = useState([]);

  const [form, setForm] = useState({
    title: '',
    topic: '',
    difficulty: 'MEDIUM',
    interview: '',
  });

  const loadQuestions = () => {
    setLoading(true);
    questionApi
      .listLibrary()
      .then((res) => setQuestions(res.data?.questions || []))
      .catch((err) => setError(err?.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadQuestions();
    interviewApi
      .getInterviews()
      .then((res) => setInterviews(res.data?.interviews || []))
      .catch(() => {});
  }, []);

  const filteredQuestions = questions.filter((item) => {
    const text = `${item.prompt} ${item.topic || ''}`.toLowerCase();
    const matchesSearch = text.includes(searchQuery.toLowerCase());
    const matchesDiff = difficultyFilter === 'All' || item.difficulty === difficultyFilter;
    return matchesSearch && matchesDiff;
  });

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this question permanently from library?')) return;
    try {
      await questionApi.remove(id);
      loadQuestions();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to remove question.');
    }
  };

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    try {
      await questionApi.create({
        interview: form.interview,
        type: 'CODING',
        prompt: form.title,
        topic: form.topic,
        difficulty: form.difficulty,
      });
      setIsAddModalOpen(false);
      setForm({ title: '', topic: '', difficulty: 'MEDIUM', interview: '' });
      loadQuestions();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to create question.');
    }
  };

  return (
    <div className="ia-page">
      {/* Page Header */}
      <div className="ia-page-head">
        <div>
          <h1>Question Bank</h1>
          <p>Curate, store, and manage reusable coding and technical problems for interview rounds.</p>
        </div>
        <div className="flex items-center gap-2">
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
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus size={16} />
            <span>Add New Question</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="ia-card">
        <div className="ia-card-head">
          <div>
            <h3>
              Problem Repository <span className="ia-count">{questions.length}</span>
            </h3>
            <p>Questions available across all interview sessions created by your organization</p>
          </div>
          <div className="ia-table-tools">
            <div className="ia-search">
              <Search size={15} />
              <input
                placeholder="Search questions by topic or prompt..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
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
          </div>
        </div>

        {error && <div className="ia-error mx-5 mt-4">{error}</div>}

        <div className="ia-table-wrap">
          <table className="ia-table">
            <thead>
              <tr>
                <th>Problem Statement</th>
                <th>Topic</th>
                <th>Difficulty</th>
                <th>Origin</th>
                <th>Category</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="ia-empty">
                    <span>Loading question library…</span>
                  </td>
                </tr>
              ) : filteredQuestions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="ia-empty">
                    <BookOpen size={28} className="text-slate-400" />
                    <b>No questions found</b>
                    <span>Create a new question or use AI generation to build your repository.</span>
                  </td>
                </tr>
              ) : (
                filteredQuestions.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <div className="ia-problem-name">
                        <span>
                          <Code2 size={16} />
                        </span>
                        <b className="truncate max-w-md">{item.prompt}</b>
                      </div>
                    </td>
                    <td>{item.topic || 'General Algorithms'}</td>
                    <td>
                      <span className={`ia-diff ${(item.difficulty || 'medium').toLowerCase()}`}>
                        {item.difficulty}
                      </span>
                    </td>
                    <td>
                      <span className={`ia-source ${item.source === 'AI' ? 'ai' : 'manual'}`}>
                        {item.source === 'AI' ? 'AI Generated' : 'Curated'}
                      </span>
                    </td>
                    <td>
                      <span className="ia-lang">{item.type || 'Coding'}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          className="ia-table-icon"
                          onClick={() => setViewQuestion(item)}
                          title="View question details"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="ia-table-icon text-rose-500 hover:text-rose-700"
                          onClick={() => handleDelete(item._id)}
                          title="Delete question"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Question Modal */}
      {isAddModalOpen && (
        <div className="ia-modal-backdrop">
          <div className="ia-modal">
            <div className="ia-modal-head">
              <div>
                <h3>Add New Problem</h3>
                <p>Define a coding problem stored in MongoDB for interview reuse.</p>
              </div>
              <button type="button" onClick={() => setIsAddModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateQuestion}>
              <label>
                Target Interview
                <select
                  required
                  value={form.interview}
                  onChange={(e) => setForm({ ...form, interview: e.target.value })}
                >
                  <option value="">Select an interview session</option>
                  {interviews.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.title} • {item.roomCode}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Problem Title & Prompt
                <textarea
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target."
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label>
                  Topic
                  <input
                    value={form.topic}
                    onChange={(e) => setForm({ ...form, topic: e.target.value })}
                    placeholder="e.g. Arrays & Hashing"
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
              </div>

              <button className="ia-primary-btn wide" type="submit">
                Create & Save to Library
              </button>
            </form>
          </div>
        </div>
      )}

      {/* View Question Detail Modal */}
      {viewQuestion && (
        <div className="ia-modal-backdrop">
          <div className="ia-modal">
            <div className="ia-modal-head">
              <div>
                <h3>Problem Details</h3>
                <p>Curated specification and test cases</p>
              </div>
              <button type="button" onClick={() => setViewQuestion(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="ia-question-detail">
              <b>{viewQuestion.prompt}</b>
              <span>
                {viewQuestion.topic || 'Algorithms'} • {viewQuestion.difficulty} •{' '}
                {viewQuestion.type || 'CODING'}
              </span>

              {viewQuestion.constraints?.length > 0 && (
                <div>
                  <strong>Constraints</strong>
                  <ul>
                    {viewQuestion.constraints.map((c, idx) => (
                      <li key={idx}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {viewQuestion.examples?.length > 0 && (
                <div>
                  <strong>Test Case Examples</strong>
                  <pre>{JSON.stringify(viewQuestion.examples, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Question Generator Modal */}
      <AIQuestionGeneratorModal
        isOpen={isAiModalOpen}
        onClose={() => {
          setIsAiModalOpen(false);
          loadQuestions();
        }}
        interviews={interviews}
      />
    </div>
  );
}
