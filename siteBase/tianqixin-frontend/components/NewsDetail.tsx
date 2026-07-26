"use client"

import type React from "react"
import { Eye } from "lucide-react"
import Link from "next/link"
import { sanitizeHtml } from "../lib/sanitize"
import { PageHero } from "./PageHero"
import { Seo } from "./Seo"
import { JsonLd, buildArticleSchema, buildBreadcrumbSchema } from "./JsonLd"

import { newsApi } from "../lib/api-client"

interface News {
  id: number
  title: string
  summary?: string
  content?: string
  image?: string
  publish_time?: string
  update_time?: string
  create_time?: string
  view_count?: number
}
import { useState, useEffect } from "react"
import { useTranslation } from 'react-i18next'

interface NewsDetailProps {
  newsId?: string
}

export const NewsDetail: React.FC<NewsDetailProps> = ({ newsId }) => {
  const { t } = useTranslation()
  const [news, setNews] = useState<News | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!newsId) return

    const fetchNewsDetail = async () => {
      try {
        const res = await newsApi.getNewsDetail(Number(newsId))
        if (res.code === 200 && res.data) {
          setNews(res.data as News)
        }
      } catch (error) {
        console.error("Failed to fetch news detail:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchNewsDetail()
  }, [newsId])

  if (loading) {
    return <div className="text-center py-20 text-gray-500">{t('加载中...')}</div>
  }

  if (!news) {
    return <div className="text-center py-20 text-gray-500">{t('未找到相关新闻')}</div>
  }

  const newsUrl = `/news/${news.id}`
  const plainSummary = news.summary || sanitizeHtml(news.content || news.summary || "").replace(/<[^>]*>/g, '').substring(0, 160)

  return (
    <div className="bg-gray-50 pb-20">
      <Seo
        title={news.title}
        description={plainSummary}
        url={newsUrl}
        image={news.image}
        type="article"
      />
      <JsonLd data={[
        buildArticleSchema({
          id: news.id,
          title: news.title,
          summary: plainSummary,
          image: news.image,
          publishTime: news.publish_time,
          updateTime: news.update_time,
          url: newsUrl,
        }),
        buildBreadcrumbSchema([
          { name: t('首页'), url: '/' },
          { name: t('新闻动态'), url: '/news' },
          { name: news.title, url: newsUrl },
        ]),
      ]} />
      <PageHero
        title={t('新闻')}
        subtitle={t('让您更加了解我们的最新资讯')}
        bgImage="https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=2070&auto=format&fit=crop"
      />

      <div className="container mx-auto px-4 md:px-8 py-8">
        {/* Breadcrumb - Using Link */}
        <div className="text-xs text-gray-500 mb-8">
          <Link href="/" className="cursor-pointer hover:text-brand-red">
            {t('首页')}
          </Link>
          <span className="mx-2">/</span>
          <Link href="/news" className="cursor-pointer hover:text-brand-red">
            {t('新闻')}
          </Link>
          <span className="mx-2">/</span>
          <span>{t('详情')}</span>
        </div>

        {/* Content Container */}
        <div className="bg-white p-8 md:p-16 shadow-sm max-w-5xl mx-auto">
          {/* Title Header */}
          <div className="text-center mb-12">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
              {news.title}
            </h1>
            <div className="flex items-center justify-center space-x-6 text-xs text-gray-400">
              <div className="flex items-center space-x-1">
                <Eye className="w-4 h-4" />
                <span>{news.view_count || 0}</span>
              </div>
              <span>{news.publish_time?.substring(0, 10) || news.create_time?.substring(0, 10)}</span>
            </div>
          </div>

          {/* Article Body */}
          <div className="prose max-w-none text-gray-600 text-sm md:text-base leading-relaxed space-y-8">
            {news.image && (
              <div className="w-full my-8">
                <img
                  src={news.image}
                  alt={news.title}
                  className="w-full h-auto object-cover rounded-lg shadow-md"
                />
              </div>
            )}

            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(news.content || news.summary || "") }} />
          </div>

          {/* Footer Navigation Links - Using Link */}
          <div className="border-t pt-8 mt-8 space-y-2 text-sm text-gray-600">
            <Link href="/news" className="block cursor-pointer hover:text-brand-red">
              {t('返回新闻列表')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
