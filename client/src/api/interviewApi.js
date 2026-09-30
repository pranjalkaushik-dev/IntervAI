import apiClient from './apiClient';

export const interviewApi = {
  createInterview: (payload) => apiClient.post('/interviews', payload),
  createMockInterview: (payload) => apiClient.post('/interviews/mock', payload),
  createP2PInterview: (payload) => apiClient.post('/interviews/p2p', payload),
  getInterviews: () => apiClient.get('/interviews'),
  getInterviewById: (id) => apiClient.get(`/interviews/${id}`),
  previewInterview: (roomCode) => apiClient.get(`/interviews/room/${encodeURIComponent(roomCode)}?_t=${Date.now()}`),
  joinInterview: (roomCode) => apiClient.post('/interviews/join', { roomCode }),
  startInterview: (id) => apiClient.post(`/interviews/${id}/start`),
  completeInterview: (id) => apiClient.post(`/interviews/${id}/complete`),
  getDashboardSummary: () => apiClient.get('/interviews/dashboard-summary'),
  getStudents: () => apiClient.get('/interviews/students'),
  getAnalytics: () => apiClient.get('/interviews/analytics'),
  uploadResumeFile: (id, formData) => apiClient.post(`/interviews/${id}/resume/upload`, formData),
  getResumeProfile: (id) => apiClient.get(`/interviews/${id}/resume`),
  generateResumeQuestions: (id) => apiClient.post(`/interviews/${id}/resume/generate-questions`),

  saveSystemDesignState: (id, payload) => apiClient.post(`/interviews/${id}/system-design/state`, payload),
  getSystemDesignState: (id) => apiClient.get(`/interviews/${id}/system-design/state`),
  submitSystemDesign: (id, payload) => apiClient.post(`/interviews/${id}/system-design/submit`, payload),
  getSystemDesignEvaluation: (id) => apiClient.get(`/interviews/${id}/system-design/evaluation`),
};

export default interviewApi;
