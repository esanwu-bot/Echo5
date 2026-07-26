"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { setAuthToken, getAuthToken } from '../lib/api-client'
import { authApi } from '../lib/api-client'

interface User {
  id: number
  username: string
  nickname: string
  avatar?: string
  phone?: string
  created_at: string
  last_login_at?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  register: (userData: any) => Promise<boolean>
  updateUser: (userData: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing token on component mount
    const token = getAuthToken()
    if (token) {
      // Validate token with the server
      validateToken()
    } else {
      setIsLoading(false)
    }
  }, [])

  const validateToken = async () => {
    try {
      const response = await authApi.getCurrentUser()
      if (response.code === 200) {
        setUser(response.data)
      } else {
        // Token is invalid, clear it
        setAuthToken(null)
      }
    } catch (error) {
      // Token validation failed, clear it
      setAuthToken(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      const response = await authApi.login({ username, password })
      if (response.code === 200) {
        setUser(response.data.user)
        setIsLoading(false)
        return true
      }
      setIsLoading(false)
      return false
    } catch (error) {
      setIsLoading(false)
      throw error
    }
  }

  const register = async (userData: any): Promise<boolean> => {
    setIsLoading(true)
    try {
      const response = await authApi.register(userData)
      if (response.code === 200) {
        setUser(response.data.user)
        setIsLoading(false)
        return true
      }
      setIsLoading(false)
      return false
    } catch (error) {
      setIsLoading(false)
      throw error
    }
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch (error) {
      // Even if the API call fails, we should still clear local state
      console.error('Logout API error:', error)
    } finally {
      setUser(null)
      setAuthToken(null)
    }
  }

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData })
    }
  }

  const value = {
    user,
    isLoading,
    login,
    logout,
    register,
    updateUser
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}