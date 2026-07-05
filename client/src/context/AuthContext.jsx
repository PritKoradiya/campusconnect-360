import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getCurrentUser, loginUser, registerUser } from '../services/authService';

const AuthContext = createContext(null);

const getStoredUser = () => {
  const storedUser = localStorage.getItem('user');

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    localStorage.removeItem('user');
    return null;
  }
};

export const getDashboardPath = (role) => {
  if (role === 'admin') {
    return '/admin/dashboard';
  }

  if (role === 'department') {
    return '/department/dashboard';
  }

  if (role === 'student') {
    return '/student/dashboard';
  }

  return '/login';
};

function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const saveAuthData = (authData) => {
    const { token: authToken, user: authUser } = authData;

    if (!authToken || !authUser) {
      throw new Error(authData.message || 'Authentication response is missing token or user');
    }

    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(authUser));
    setToken(authToken);
    setUser(authUser);

    return authData;
  };

  const clearAuthData = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const register = async (userData) => {
    const response = await registerUser(userData);
    return saveAuthData(response.data);
  };

  const login = async (loginData) => {
    const response = await loginUser(loginData);
    return saveAuthData(response.data);
  };

  const logout = () => {
    clearAuthData();
  };

  const checkAuth = async () => {
    const storedToken = localStorage.getItem('token');

    if (!storedToken) {
      clearAuthData();
      setLoading(false);
      return null;
    }

    try {
      setLoading(true);
      const response = await getCurrentUser();
      const currentUser = response.data.user;

      localStorage.setItem('user', JSON.stringify(currentUser));
      setToken(storedToken);
      setUser(currentUser);

      return currentUser;
    } catch (error) {
      clearAuthData();
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      register,
      login,
      logout,
      checkAuth
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
};

export default AuthProvider;
