"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Mail, Lock, Key, Eye, EyeOff, ArrowLeft, CheckCircle2 } from "lucide-react"
import { useTranslation } from 'react-i18next'
import { authApi } from "../lib/api-client"
import { useNavigate, useLocation } from "react-router-dom"

interface ResetPasswordProps {
    onNavigate: (page: string) => void
}

export const ResetPassword: React.FC<ResetPasswordProps> = ({ onNavigate }) => {
    const { t } = useTranslation()
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [isSuccess, setIsSuccess] = useState(false)
    const navigate = useNavigate()
    const location = useLocation()

    const [formData, setFormData] = useState({
        email: "",
        token: "",
        password: "",
        password_confirm: "",
    })

    // Try to get email from URL params if available
    useEffect(() => {
        const params = new URLSearchParams(location.search)
        const emailParam = params.get("email")
        if (emailParam) {
            setFormData(prev => ({ ...prev, email: emailParam }))
        }
    }, [location])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (formData.password !== formData.password_confirm) {
            setError(t('两次输入的密码不一致'))
            return
        }

        setIsLoading(true)
        setError("")

        try {
            const response = await authApi.resetPassword(formData)

            if (response.code === 200) {
                setIsSuccess(true)
            } else {
                setError(response.message || t('重置失败，请重试'))
            }
        } catch (err: any) {
            console.error("Reset password error:", err)
            setError(err.message || t('重置失败，请重试'))
        } finally {
            setIsLoading(false)
        }
    }

    if (isSuccess) {
        return (
            <div className="min-h-[calc(100vh-136px)] flex">
                {/* Left Side - Illustration */}
                <div className="hidden lg:block w-1/2 bg-[#f0f4f8] relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
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

                {/* Right Side - Success Message */}
                <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50/50 p-8">
                    <div className="w-full max-w-md text-center">
                        <div className="mb-8 flex justify-center">
                            <div className="w-24 h-24 bg-[#e60012] rounded-full flex items-center justify-center shadow-lg shadow-red-200">
                                <CheckCircle2 className="w-16 h-16 text-white" />
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('密码重置成功')}</h2>
                        <p className="text-gray-600 mb-8">
                            {t('您的密码已成功重置。现在您可以使用新密码登录您的账户。')}
                        </p>
                        <button
                            onClick={() => onNavigate("login")}
                            className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#e60012] hover:bg-[#cc0010] transition-colors"
                        >
                            {t('立即登录')}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-[calc(100vh-136px)] flex">
            {/* Left Side - Illustration */}
            <div className="hidden lg:block w-1/2 bg-[#f0f4f8] relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
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

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50/50 p-8">
                <div className="w-full max-w-md">
                    <div className="mb-8 text-center">
                        <div className="w-20 h-20 mx-auto mb-6 border-2 border-[#e60012] rounded-full flex items-center justify-center p-2">
                            <img src="/logo.png" alt="Logo" width={60} height={60} className="object-contain" />
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">{t('重置密码')}</h2>
                    <p className="text-gray-600 mb-8 text-center">{t('请填写以下信息以重置您的密码。')}</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    placeholder={t('电子邮件地址')}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#e60012] focus:border-[#e60012] sm:text-sm"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Key className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder={t('邮箱验证码')}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#e60012] focus:border-[#e60012] sm:text-sm"
                                    value={formData.token}
                                    onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="新密码"
                                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#e60012] focus:border-[#e60012] sm:text-sm"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
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

                        <div className="space-y-1">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="确认新密码"
                                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#e60012] focus:border-[#e60012] sm:text-sm"
                                    value={formData.password_confirm}
                                    onChange={(e) => setFormData({ ...formData, password_confirm: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#e60012] hover:bg-[#cc0010] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e60012] transition-colors disabled:opacity-50"
                        >
                            {isLoading ? "重置中..." : "重置密码"}
                        </button>
                        {error && (
                            <div className="mt-4 text-center text-sm text-red-600">
                                {error}
                            </div>
                        )}
                    </form>

                    <div className="mt-6 flex items-center justify-center text-sm">
                        <button onClick={() => onNavigate("login")} className="flex items-center font-medium text-[#e60012] hover:underline">
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            {t('返回登录')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
