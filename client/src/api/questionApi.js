import apiClient from './apiClient';

export const questionApi = {
  listLibrary: () => apiClient.get('/questions/library'),
  create: (payload) => apiClient.post('/questions', payload),
  generateWithAI: (payload) => apiClient.post('/questions/generate-ai', payload),
  bulkCreate: (payload) => apiClient.post('/questions/bulk', payload),
  remove: (id) => apiClient.delete(`/questions/${id}`),
};

export default questionApi;
