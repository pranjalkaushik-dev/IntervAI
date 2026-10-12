import axios from 'axios';

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const resolveApiBaseUrl = () => {
  if (!configuredApiUrl) return '/api';
  try {
    const configured = new URL(configuredApiUrl, window.location.origin);
    const remoteDevice = !['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (remoteDevice && ['localhost', '127.0.0.1'].includes(configured.hostname)) return '/api';
  } catch (_) {}
  const normalized = configuredApiUrl.replace(/\/$/, '');
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
};
const apiBaseUrl = resolveApiBaseUrl();

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (config.data instanceof FormData) delete config.headers['Content-Type'];
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => {
    // The backend uses one envelope everywhere: { success, message, data }.
    // Expose `data` directly to callers so pages cannot accidentally mix
    // response.data.interviews with response.data.data.interviews.
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      response.data = response.data.data ?? {};
    }
    return response;
  },
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred';

    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }

    // Keep the original Axios response so callers can inspect status/data.
    error.message = message;
    return Promise.reject(error);
  },
);

export default apiClient;
