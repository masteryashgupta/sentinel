import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, signup as apiSignup, getMe } from '../lib/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('sentinel_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      localStorage.setItem('sentinel_token', token);
      checkUser();
    } else {
      localStorage.removeItem('sentinel_token');
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  const checkUser = async () => {
    try {
      const { user } = await getMe();
      setUser(user);
    } catch (e) {
      console.error('Session expired or invalid', e);
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await apiLogin(email, password);
    setToken(res.token);
    setUser(res.user);
    return res;
  };

  const signup = async (email, password) => {
    const res = await apiSignup(email, password);
    setToken(res.token);
    setUser(res.user);
    return res;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
