import apiClient from './apiClient';
export const monitoringApi = {
  getInterviewViolations: (interviewId) => apiClient.get(`/monitoring/violations/${interviewId}`),
  generateDualCamToken: (interviewId) => apiClient.post('/monitoring/dual-camera/token', { interviewId }),
};
export default monitoringApi;
