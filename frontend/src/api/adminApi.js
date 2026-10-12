import apiClient from './apiClient';
const adminApi = {
  users: () => apiClient.get('/admin/users'),
  createUser: (payload) => apiClient.post('/admin/users', payload),
  updateUser: (id, payload) => apiClient.patch(`/admin/users/${id}`, payload),
  companies: () => apiClient.get('/admin/companies'),
  analytics: () => apiClient.get('/admin/analytics'),
  reports: () => apiClient.get('/admin/reports'),
  system: () => apiClient.get('/admin/system'),
};
export default adminApi;
