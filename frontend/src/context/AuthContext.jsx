import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { setUnauthorizedHandler } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // If the session expires while the app is open, return to the login page.
    setUnauthorizedHandler(() => setUser(null));

    api
      .get('/auth/me')
      .then((response) => setUser(response.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const response = await api.get('/notifications', { params: { unread: true } });
      setUnreadCount(response.data.unreadCount);
    } catch {
      // The header badge is not critical, so failures are ignored here.
    }
  }, []);

  async function login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    setUser(response.data.user);
    return response.data.user;
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
      setUnreadCount(0);
    }
  }

  const value = { user, setUser, loading, login, logout, unreadCount, refreshUnreadCount };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
