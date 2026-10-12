import apiClient from './apiClient';
const reportApi = {
  getReport: (id) => apiClient.get(`/interviews/${id}/report`),
  generateReport: (id) => apiClient.post(`/interviews/${id}/report/generate`),
  saveNotes: (id, notes) => apiClient.put(`/interviews/${id}/notes`, { notes }),
  saveResume: (id, payload) => apiClient.put(`/interviews/${id}/resume`, payload),
  recordTurn: (id, payload) => apiClient.post(`/interviews/${id}/adaptive-turn`, payload),
};
export default reportApi;
