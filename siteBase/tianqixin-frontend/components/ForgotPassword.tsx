"use client"

import type React from "react"
import { useState } from "react"
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react"
import { useTranslation } from 'react-i18next'
import { authApi } from "../lib/api-client"
import { useNavigate } from "react-router-dom"

interface ForgotPasswordProps {
    onNavigate: (page: string) => void
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onNavigate }) => {
    const { t } = useTranslation()
    const [email, setEmail] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [isSubmitted, setIsSubmitted] = useState(false)
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) {
            setError(t('请输入您的电子邮件地址'))
            return
        }

        setIsLoading(true)
        setError("")

        try {
            const response = await authApi.forgotPassword(email)

            if (response.code === 200) {
                setIsSubmitted(true)
            } else {
                // 处理非200响应码（如429限流等）
                setError(response.message || t('提交失败，请重试'))
            }
        } catch (err: any) {
            console.error("Forgot password error:", err)
            // 显示后端返回的具体错误信息（包括"您操作太频繁，请稍后再试"）
            setError(err.message || t('提交失败，请重试'))
        } finally {
            setIsLoading(false)
        }
    }

    if (isSubmitted) {
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
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('提交成功')}</h2>
                        <p className="text-gray-600 mb-8">
                            {t('重置密码邮件已发送至您的邮箱，请查收并按照邮件指示完成密码重置。')}
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => navigate("/reset-password")}
                                className="flex-1 flex justify-center py-3 px-4 border border-[#e60012] text-sm font-medium rounded-md text-[#e60012] bg-white hover:bg-red-50 transition-colors"
                            >
                                {t('重置密码')}
                            </button>
                            <button
                                onClick={() => onNavigate("login")}
                                className="flex-1 flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#e60012] hover:bg-[#cc0010] transition-colors"
                            >
                                {t('返回登录')}
                            </button>
                        </div>
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

                    <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">{t('忘记密码')}</h2>
                    <p className="text-gray-600 mb-8 text-center">{t('请输入您的 my天启芯账户 电子邮件地址。')}</p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-1">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    placeholder={t('电子邮件地址')}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#e60012] focus:border-[#e60012] sm:text-sm"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#e60012] hover:bg-[#cc0010] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e60012] transition-colors disabled:opacity-50"
                        >
                            {isLoading ? t('提交中...') : t('提交')}
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
                            {t('记住密码? 登录')}
                        </button>
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
