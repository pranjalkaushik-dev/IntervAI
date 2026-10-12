import apiClient from './apiClient';

const codingApi = {
  runCode: (data) => apiClient.post('/coding/run', data),

  submitCode: (data) => apiClient.post('/coding/submit', data),

  getSubmissionsByInterview: (interviewId) =>
    apiClient.get(`/coding/submissions/${interviewId}`),

  interviewAssistant: (data) =>
    apiClient.post('/ai/interview-assistant', data),
};

export default codingApi;
