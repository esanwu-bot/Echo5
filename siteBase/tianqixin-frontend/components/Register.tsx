"use client"

import type React from "react"
import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useTranslation } from 'react-i18next'
import { authApi, setAuthToken, cartApi } from "../lib/api-client"
import { useNavigate } from "react-router-dom"

interface RegisterProps {
  onNavigate: (page: string) => void
}

export const Register: React.FC<Partial<RegisterProps>> = ({ onNavigate }) => {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    nickname: "",
    region: ""
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()
  const [isRegionOpen, setIsRegionOpen] = useState(false)

  const regions = ["China(简体中文)", "Japan(日本)", "English(英语)", "Germany(Deutsch)", "France(Français)"]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Form validation
    if (formData.password !== formData.confirmPassword) {
      setError(t('两次输入的密码不一致'))
      return
    }

    if (formData.password.length < 6) {
      setError(t('密码长度不能少于6位'))
      setIsLoading(false)
      return
    }

    if (!/(?=.*[A-Z])/.test(formData.password)) {
      setError(t('密码必须包含至少一个大写字母'))
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await authApi.register({
        username: formData.username || formData.email,
        email: formData.email,
        password: formData.password,
        password_confirm: formData.confirmPassword,
        nickname: formData.nickname || formData.username || formData.email.split('@')[0],
        country: formData.region,
      })

      if (response.code === 200) {
        console.log("Registration successful:", response.data)

        // 注册成功后，自动执行登录以获取完整的token和用户信息
        try {
          const loginResponse = await authApi.login({
            username: formData.email,
            email: formData.email,
            password: formData.password
          })

          if (loginResponse.code === 200 && loginResponse.data?.token) {
            setAuthToken(loginResponse.data.token)
            cartApi.mergeCart().catch(() => {})
          }
        } catch (loginError) {
          console.error("Auto login failed after registration:", loginError)
        }

        // 注册成功，跳转到成功页面
        if (onNavigate) {
          onNavigate("register-success")
        } else {
          window.location.href = "/register/success"
        }
      } else {
        // 注册失败，显示具体错误信息
        setError(response.message || t('注册失败，请重试'))
      }
    } catch (err: any) {
      console.error("Registration error:", err)
      // 捕获并显示API返回的错误信息
      setError(err.message || t('注册失败，请重试'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-136px)] flex">
      {/* Left Side - Illustration */}
      <div className="hidden lg:block w-1/2 bg-[#f0f4f8] relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Same placeholder as Login for consistency */}
          <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-3/4 h-3/4">
                <div className="absolute inset-0 bg-blue-200/20 blur-3xl rounded-full"></div>
                <img src="/3d-isometric-cloud-server-technology-blue-white.jpg" alt="Cloud Technology" className="w-full h-full object-contain" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Register Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50/50 p-8">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-medium text-gray-900 mb-2">{t('注册天启芯账户')}</h2>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-[#e60012] text-sm rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                <span className="text-[#e60012] mr-1">*</span>{t('电子邮件')}
              </label>
              <input
                type="email"
                required
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#e60012] focus:border-[#e60012] sm:text-sm"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                <span className="text-[#e60012] mr-1">*</span>{t('密码')}
              </label>
              <input
                type="password"
                required
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#e60012] focus:border-[#e60012] sm:text-sm"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <p className={`text-xs mt-1 ${formData.password && !/^(?=.*[A-Z]).{6,}$/.test(formData.password)
                ? "text-[#e60012]"
                : "text-gray-500"
                }`}>
                {t('输入至少6位数字或字母，必须含一个大写')}
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                <span className="text-[#e60012] mr-1">*</span>{t('重新输入密码')}
              </label>
              <input
                type="password"
                required
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#e60012] focus:border-[#e60012] sm:text-sm"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
            </div>

            <div className="space-y-1 relative">
              {/* Dropdown for Region */}
              <div
                className="relative block w-full border border-gray-300 rounded-md shadow-sm bg-white cursor-pointer"
                onClick={() => setIsRegionOpen(!isRegionOpen)}
              >
                <div className="px-3 py-2.5 flex justify-between items-center">
                  <span className={`text-sm ${formData.region ? "text-gray-900" : "text-gray-400"}`}>
                    {formData.region || t('选择地区')}
                  </span>
                  {isRegionOpen ? (
                    <ChevronUp className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  )}
                </div>

                {isRegionOpen && (
                  <div className="absolute z-10 w-full bg-white border border-gray-300 mt-1 rounded-md shadow-lg max-h-60 overflow-auto">
                    {regions.map((region) => (
                      <div
                        key={region}
                        className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          setFormData({ ...formData, region })
                          setIsRegionOpen(false)
                        }}
                      >
                        <span className={formData.region === region ? "text-[#e60012]" : "text-gray-700"}>
                          {region}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#e60012] hover:bg-[#cc0010] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e60012] transition-colors mt-6"
            >
              {t('继续')}
            </button>
          </form>

          <div className="mt-6 text-xs text-gray-500 text-center">
            {t('登录即表示您同意天启芯的')}
            <a href="/article/use-terms" className="text-[#e60012] hover:underline mx-1">
              {t('使用条款')}
            </a>
            {t('和')}
            <a href="/article/privacy-policy" className="text-[#e60012] hover:underline mx-1">
              {t('隐私政策')}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
