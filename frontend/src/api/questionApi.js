import apiClient from './apiClient';

export const questionApi = {
  listLibrary: (params) => apiClient.get('/questions/library', { params }),
  listPractice: (params) => apiClient.get('/questions/practice', { params }),
  getById: (id) => apiClient.get(`/questions/${id}`),
  create: (payload) => apiClient.post('/questions', payload),
  update: (id, payload) => apiClient.put(`/questions/${id}`, payload),
  togglePublish: (id, isPublished) =>
    apiClient.patch(`/questions/${id}/publish`, { isPublished }),
  assignToInterview: (payload) =>
    apiClient.post('/questions/assign-to-interview', payload),
  generateWithAI: (payload) =>
    apiClient.post('/questions/generate-ai', payload),
  bulkCreate: (payload) => apiClient.post('/questions/bulk', payload),
  remove: (id) => apiClient.delete(`/questions/${id}`),
  getCompanies: () => apiClient.get('/questions/companies'),
  runPracticeCode: (payload) => apiClient.post('/coding/practice/run', payload),
  submitPracticeCode: (payload) =>
    apiClient.post('/coding/practice/submit', payload),
  getPracticeSubmissions: (questionId) =>
    apiClient.get(`/coding/practice/submissions/${questionId}`),
};

export default questionApi;
