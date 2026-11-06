import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});

let handleUnauthorized = () => {};

export function setUnauthorizedHandler(handler) {
  handleUnauthorized = handler;
}

// Tell the server the browser's offset from UTC, so "today" (overdue work, past due dates,
// the dashboard) is the user's own calendar day. Read on every request in case it changes.
api.interceptors.request.use((config) => {
  config.headers.set('X-UTC-Offset', String(-new Date().getTimezoneOffset()));
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    // A failed login is a normal 401, not an expired session.
    if (error.response?.status === 401 && url !== '/auth/login') {
      handleUnauthorized();
    }
    return Promise.reject(error);
  },
);

export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error.response) return 'Could not reach the server. Check that the backend is running.';
  return error.response.data?.error || fallback;
}

export function getFieldErrors(error) {
  return error.response?.data?.fields || {};
}

export default api;
