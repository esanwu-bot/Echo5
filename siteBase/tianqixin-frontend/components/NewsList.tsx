"use client"

import type React from "react"
import { Eye } from "lucide-react"
import Link from "next/link"
import { PageHero } from "./PageHero"

import { newsApi, homeApi } from "../lib/api-client"
import { getImageUrl } from "../lib/api-client"

interface News {
  id: number
  title: string
  summary?: string
  image?: string
  publish_time?: string
  create_time?: string
  view_count?: number
}
import { useState, useEffect } from "react"
import { useTranslation } from 'react-i18next'

interface NewsListProps {
  onNavigateToDetail?: (id: string) => void
}

interface LatestProduct {
  id: number
  name: string
  image: string
  created_at?: string
}

export const NewsList: React.FC<NewsListProps> = ({ onNavigateToDetail }) => {
  const { t } = useTranslation()
  const [newsItems, setNewsItems] = useState<News[]>([])
  const [latestProducts, setLatestProducts] = useState<LatestProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [newsRes, homeRes] = await Promise.all([
          newsApi.getNews(),
          homeApi.getHomeData()
        ])

        if (newsRes.code === 200 && newsRes.data) {
          const list = Array.isArray(newsRes.data) ? newsRes.data : (newsRes.data as any).list || []
          setNewsItems(list)
        }

        if (homeRes.code === 200 && homeRes.data) {
          const homeData = homeRes.data as any
          const products = homeData?.sections?.products?.items || []
          setLatestProducts(products.map((item: any) => ({
            id: item.id,
            name: item.name,
            image: item.image,
            created_at: item.create_time
          })))
        }
      } catch (error) {
        console.error("Failed to fetch data:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const industryNews = [
    { title: "5G时代已经到来！这些行业将来深刻变化...", date: "2023/09/23" },
    { title: "5G时代已经到来！这些行业将来深刻变化...", date: "2023/09/23" },
    { title: "5G时代已经到来！这些行业将来深刻变化...", date: "2023/09/23" },
    { title: "5G时代已经到来！这些行业将来深刻变化...", date: "2023/09/23" },
    { title: "用5G远眺新年的明珠塔", date: "2023/11/23" },
  ]

  return (
    <div className="bg-gray-50 pb-20">
      <PageHero
        title={t('新闻')}
        subtitle={t('让您更加了解我们的最新资讯')}
        bgImage="https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=2070&auto=format&fit=crop"
      />

      <div className="container mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Main Content */}
          <div className="lg:col-span-2">
            <div className="flex items-baseline space-x-2 mb-6 border-b pb-2 border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">{t('新闻发布')}</h2>
              <span className="text-brand-red uppercase text-sm font-medium">NEWS RELEASE</span>
            </div>

            {/* Featured News - Using Link */}
            <Link
              href="/news/featured"
              className="block group relative w-full h-[300px] md:h-[400px] overflow-hidden mb-8"
            >
              <img
                src="/conference-stage.jpg"
                alt="Featured News"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-brand-red py-4 px-6">
                <h3 className="text-white text-lg md:text-xl font-medium text-center">{t('2018年全球电影产业发展报告')}</h3>
              </div>
            </Link>

            {/* News List - Using Link */}
            <div className="space-y-6">
              {loading ? (
                <div className="text-center py-12 text-gray-500">{t('加载中...')}</div>
              ) : newsItems.length === 0 ? (
                <div className="text-center py-12 text-gray-500">{t('暂无新闻')}</div>
              ) : (
                newsItems.map((item) => {
                  const cardClass = "bg-white p-4 flex flex-col md:flex-row gap-4 hover:shadow-md transition-shadow cursor-pointer border border-transparent hover:border-gray-100 block"
                  const cardContent = (
                    <>
                      <div className="w-full md:w-[200px] h-[120px] flex-shrink-0 overflow-hidden">
                        <img
                          src={item.image || "/placeholder.svg"}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-1 hover:text-brand-red transition-colors">
                            {item.title}
                          </h3>
                          <p className="text-gray-500 text-sm line-clamp-2 mb-2">{item.summary}</p>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>{item.publish_time?.substring(0, 10) || item.create_time?.substring(0, 10)}</span>
                          <div className="flex items-center space-x-1">
                            <Eye className="w-3 h-3" />
                            <span>{item.view_count || 0}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )
                  return onNavigateToDetail ? (
                    <div key={item.id} onClick={() => onNavigateToDetail(String(item.id))} className={cardClass}>
                      {cardContent}
                    </div>
                  ) : (
                    <Link key={item.id} href={`/news/${item.id}`} className={cardClass}>
                      {cardContent}
                    </Link>
                  )
                })
              )}
            </div>

            {/* Pagination */}
            {newsItems.length >= 10 && (
              <div className="flex items-center justify-center space-x-2 mt-12 text-sm text-gray-600">
                <button className="hover:text-brand-red">{t('上一页')}</button>
                <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded">1</button>
                <button className="w-8 h-8 flex items-center justify-center bg-brand-red text-white rounded">2</button>
                <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded">3</button>
                <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded">4</button>
                <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded">...</button>
                <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded">16</button>
                <button className="hover:text-brand-red">{t('下一页')}</button>
                <span className="ml-2">{t('共 16 页')}</span>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1 space-y-8">
            {/* Industry News */}
            {/* <div className="bg-white p-6">
              <div className="flex items-baseline space-x-2 mb-6 border-b pb-2 border-gray-100">
                <h2 className="text-lg font-bold text-gray-800">行业新闻</h2>
                <span className="text-brand-red uppercase text-xs font-medium">INDUSTRY NEWS</span>
              </div>
              <ul className="space-y-4">
                {industryNews.map((news, idx) => (
                  <li key={idx} className="group cursor-pointer">
                    <div className="flex justify-between items-start text-sm">
                      <span className="text-gray-600 group-hover:text-brand-red line-clamp-1 flex-1 mr-4">
                        {news.title}
                      </span>
                      <span className="text-gray-400 text-xs whitespace-nowrap">{news.date}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div> */}

            {/* Latest Products */}
            <div className="bg-white p-6">
              <div className="flex items-baseline space-x-2 mb-6 border-b pb-2 border-gray-100">
                <h2 className="text-lg font-bold text-gray-800">{t('最新产品')}</h2>
                <span className="text-brand-red uppercase text-xs font-medium">LATEST PRODUCTS</span>
              </div>
              <div className="space-y-6">
                {latestProducts.map((product) => (
                  <Link key={product.id} href={`/series/${product.id}`} className="group cursor-pointer block">
                    <div className="text-xs text-gray-600 mb-2 group-hover:text-brand-red line-clamp-2 h-8">
                      {product.name}
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-gray-400 text-xs">{product.created_at?.substring(0, 10)}</span>
                      <img
                        src={getImageUrl(product.image) || "/placeholder.svg"}
                        alt={product.name}
                        className="w-20 h-10 object-contain bg-gray-50 rounded-sm"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
