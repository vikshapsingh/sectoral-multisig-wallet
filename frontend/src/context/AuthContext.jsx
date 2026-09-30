import { createContext, useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { user: me } = await api.get('/auth/me');
      setUser(me);
    } catch {
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const login = useCallback(async (email, password) => {
    const { token, user: loggedInUser } = await api.post('/auth/login', { email, password }, { auth: false });
    localStorage.setItem('token', token);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const register = useCallback(async (data) => {
    const { token, user: newUser } = await api.post('/auth/register', data, { auth: false });
    localStorage.setItem('token', token);
    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const { user: me } = await api.get('/auth/me');
    setUser(me);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
