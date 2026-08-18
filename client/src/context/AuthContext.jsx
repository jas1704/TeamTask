import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { loginUser, registerUser, fetchMe, updateProfile as apiUpdateProfile } from '../services/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('teamtask_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('teamtask_token');
    if (!token) {
      setLoading(false);
      return;
    }
    fetchMe()
      .then(({ user }) => {
        setUser(user);
        localStorage.setItem('teamtask_user', JSON.stringify(user));
      })
      .catch(() => {
        localStorage.removeItem('teamtask_token');
        localStorage.removeItem('teamtask_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const persistSession = (data) => {
    localStorage.setItem('teamtask_token', data.token);
    localStorage.setItem('teamtask_user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const login = useCallback(async (email, password) => {
    const data = await loginUser({ email, password });
    persistSession(data);
    return data.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const data = await registerUser({ name, email, password });
    persistSession(data);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('teamtask_token');
    localStorage.removeItem('teamtask_user');
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const data = await apiUpdateProfile(payload);
    setUser(data.user);
    localStorage.setItem('teamtask_user', JSON.stringify(data.user));
    return data.user;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
