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
