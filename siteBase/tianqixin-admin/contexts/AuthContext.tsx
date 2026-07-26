'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../lib/api/auth';
import { debugCurrentToken } from '../lib/auth-debug';

interface User {
  id: number;
  username: string;
  nickname: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

import { getLocalStorage } from '../lib/utils';

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkAuth = async () => {
    const storage = getLocalStorage();
    try {
      setLoading(true);
      const token = storage?.getItem('auth_token');
      // const userInfo = storage?.getItem('user_info'); // Unused currently

      if (!token) {
        setUser(null);
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      // Debug token in development
      if (process.env.NODE_ENV === 'development') {
        console.log('%c[AuthContext] Current token debug:', 'color: purple; font-weight: bold');
        debugCurrentToken();
      }

      // Try to validate token with backend
      try {
        if (await authService.validateToken(token)) {
          const userData = await authService.getCurrentUser();

          // Normalize if needed (though getCurrentUser should return user object)
          const normalizedUser = userData.user || userData.admin || userData;

          setUser(normalizedUser);
          setIsAuthenticated(true);
        } else {
          // Token invalid, clear storage
          setUser(null);
          setIsAuthenticated(false);
          storage?.removeItem('auth_token');
          storage?.removeItem('user_info');
        }
      } catch (apiError) {
        console.error('Auth check failed:', apiError);
        // Clear storage on API error
        setUser(null);
        setIsAuthenticated(false);
        storage?.removeItem('auth_token');
        storage?.removeItem('user_info');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      storage?.removeItem('auth_token');
      storage?.removeItem('user_info');
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      setLoading(true);
      console.log('Attempting login for:', username);

      // Try API login
      const response = await authService.login({ username, password });
      console.log('Login service response:', response);

      if (response.code === 200 && response.data) {
        const storage = getLocalStorage();
        const userData = response.data.user || response.data.admin; // Fallback to admin if user missing

        console.log('Setting user data:', userData);

        if (userData) {
          storage?.setItem('auth_token', response.data.token);
          storage?.setItem('user_info', JSON.stringify(userData));
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          console.error('User data missing in response:', response.data);
          throw new Error('登录返回数据异常: 用户信息缺失');
        }
      } else {
        throw new Error(response.message || '登录失败');
      }
    } catch (error) {
      console.error('Login error in context:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      const storage = getLocalStorage();
      storage?.removeItem('auth_token');
      storage?.removeItem('user_info');
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}