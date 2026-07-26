import type React from "react"
import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { Link } from "react-router-dom"
import { articleApi } from "../lib/api-client"
import { sanitizeHtml } from "../lib/sanitize"
import { useTranslation } from 'react-i18next'

export const ArticleDetail: React.FC = () => {
    const { t } = useTranslation()
    const { id } = useParams<{ id: string }>()
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)

    useEffect(() => {
        if (!id) {
            setNotFound(true)
            setLoading(false)
            return
        }

        const fetchArticle = async () => {
            setLoading(true)
            try {
                // 尝试通过 API 获取文章详情
                const numericId = parseInt(id, 10)
                if (!isNaN(numericId)) {
                    const response = await articleApi.getArticle(numericId)
                    if (response.code === 200 && response.data) {
                        setTitle(response.data.title || "")
                        setContent(response.data.content || response.data.body || "")
                        setLoading(false)
                        return
                    }
                }
                // API 返回错误或 id 非数字时，显示未找到
                setNotFound(true)
            } catch (error) {
                console.error('获取文章详情失败:', error)
                setNotFound(true)
            } finally {
                setLoading(false)
            }
        }

        fetchArticle()
    }, [id])

    if (loading) {
        return (
            <div className="bg-gray-50 min-h-screen py-12 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e60012]"></div>
            </div>
        )
    }

    if (notFound) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <h1 className="text-2xl font-bold mb-4">{t('文章未找到')}</h1>
                <p className="text-gray-600 mb-8">{t('抱歉，您请求的文章不存在。')}</p>
                <Link to="/" className="text-[#e60012] hover:underline">
                    {t('返回首页')}
                </Link>
            </div>
        )
    }

    return (
        <div className="bg-gray-50 min-h-screen py-12">
            <div className="container mx-auto px-4 md:px-[10%]">
                <div className="bg-white p-8 md:p-12 shadow-sm rounded-lg">
                    <h1 className="text-3xl font-bold text-gray-900 mb-8 border-b pb-4">
                        {title ? t(title) : title}
                    </h1>
                    <div
                        className="text-gray-700 leading-relaxed prose max-w-none"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
                    />
                </div>
            </div>
        </div>
    )
}
