"use client"

import type React from "react"
import { useState } from "react"
import { User, Lock, Eye, EyeOff } from "lucide-react"
import { useTranslation } from 'react-i18next'
import { authApi, cartApi } from "../lib/api-client"
import { useNavigate, useLocation } from "react-router-dom"

interface LoginProps {
  onNavigate: (page: string) => void
}

export const Login: React.FC<LoginProps> = ({ onNavigate }) => {
  const { t } = useTranslation()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()
  const location = useLocation()
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  })

  // 从 URL 参数中获取 redirect 地址
  const getRedirectFromUrl = () => {
    const searchParams = new URLSearchParams(location.search)
    return searchParams.get('redirect')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await authApi.login(formData)

      if (response.code === 200) {
        // 登录后合并游客购物车
        cartApi.mergeCart().catch(() => {})

        // 检查是否有回跳路径
        // 优先从 URL 参数获取 redirect
        const urlRedirect = getRedirectFromUrl()
        const storageRedirect = localStorage.getItem('redirect_after_login')
        
        if (urlRedirect) {
          // 从 URL 参数获取的 redirect，直接跳转
          navigate(decodeURIComponent(urlRedirect))
        } else if (storageRedirect) {
          // 从 localStorage 获取的 redirect
          localStorage.removeItem('redirect_after_login')
          navigate(storageRedirect)
        } else {
          // 没有回跳路径，跳转到会员中心
          navigate('/member')
        }
      } else {
        setError(response.message || t('登录失败，请重试'))
      }
    } catch (err: any) {
      console.error("Login error:", err)
      setError(err.message || t('登录失败，请重试'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-136px)] flex">
      {/* Left Side - Illustration */}
      <div className="hidden lg:block w-1/2 bg-[#f0f4f8] relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Using a placeholder gradient/pattern to simulate the cloud tech image */}
          <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Placeholder for the 3D Cloud Illustration */}
              <div className="relative w-3/4 h-3/4">
                <div className="absolute inset-0 bg-blue-200/20 blur-3xl rounded-full"></div>
                <img src="/3d-isometric-cloud-server-technology-blue-white.jpg" alt="Cloud Technology" className="w-full h-full object-contain" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50/50 p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 border-2 border-[#e60012] rounded-full flex items-center justify-center p-2">
              <img src="/logo.png" alt="Logo" width={60} height={60} className="object-contain" />
            </div>
          </div>

          <h2 className="text-lg font-medium text-gray-900 mb-6">{t('my天启芯账户ID')}</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder={t('邮箱/手机号/用户名')}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#e60012] focus:border-[#e60012] sm:text-sm"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center mb-1">
                <span onClick={() => navigate('/forgot-password')} className="text-sm text-[#e60012] cursor-pointer hover:underline">{t('忘记密码?')}</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={t('请输入密码')}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#e60012] focus:border-[#e60012] sm:text-sm"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <div
                  className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#e60012] hover:bg-[#cc0010] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e60012] transition-colors disabled:opacity-50"
            >
              {isLoading ? t('登录中...') : t('登录')}
            </button>
            {error && (
              <div className="mt-4 text-center text-sm text-red-600">
                {error}
              </div>
            )}
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <div className="text-gray-600">
              {t('还没有my天启芯账户?')}{" "}
              <button onClick={() => onNavigate("register")} className="font-medium text-[#e60012] hover:underline">
                {t('立即注册')}
              </button>
            </div>
          </div>

          <div className="mt-8 text-xs text-gray-500 text-center">
            {t('登录即表示您同意天启芯的')}
            <a href="/article/use-terms" className="text-[#e60012] hover:underline">
              {t('使用条款')}
            </a>
            {t('和')}
            <a href="/article/privacy-policy" className="text-[#e60012] hover:underline">
              {t('隐私政策')}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
