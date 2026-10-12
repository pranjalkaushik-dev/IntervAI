import React, { createContext, useContext, useState, useEffect } from 'react';
import authApi from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('auth_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('auth_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = localStorage.getItem('auth_token');
      if (savedToken) {
        try {
          const res = await authApi.getMe();
          if (res.data?.user) {
            setUser(res.data.user);
            localStorage.setItem('auth_user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.warn('[AuthContext] Session invalid or expired', err.message);
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    const payload = res.data?.data || res.data || {};
    const { token: receivedToken, user: receivedUser } = payload;
    if (!receivedToken || !receivedUser) {
      throw new Error('Invalid login response from server');
    }

    setToken(receivedToken);
    setUser(receivedUser);
    localStorage.setItem('auth_token', receivedToken);
    localStorage.setItem('auth_user', JSON.stringify(receivedUser));

    return receivedUser;
  };

  const register = async (fullName, email, password, accountRole = 'STUDENT') => {
    const res = await authApi.register({ fullName, email, password, accountRole });
    const payload = res.data?.data || res.data || {};
    const { token: receivedToken, user: receivedUser } = payload;
    if (!receivedToken || !receivedUser) {
      throw new Error('Invalid registration response from server');
    }

    setToken(receivedToken);
    setUser(receivedUser);
    localStorage.setItem('auth_token', receivedToken);
    localStorage.setItem('auth_user', JSON.stringify(receivedUser));

    return receivedUser;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  const isCompany = user?.accountRole === 'COMPANY';
  const isStudent = user?.accountRole === 'STUDENT';
  const isAdmin = user?.accountRole === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isCompany,
        isStudent,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
