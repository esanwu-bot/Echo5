"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"

import { mallApi, type MallProduct } from "../../lib/api-client"
import { useTranslation } from 'react-i18next'

/**
 * 过滤 HTML 标签，返回纯文本
 */
function stripHtml(html: string): string {
  if (!html) return ''
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

export const MallHome: React.FC = () => {
  const { t } = useTranslation()
  const [products, setProducts] = useState<MallProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await mallApi.mall_getProducts()
        if (response.code === 200) {
          setProducts(response.data.list)
        }
      } catch (error) {
        console.error('Failed to fetch products:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      <div className="container mx-auto px-4 md:px-[10%] py-6">
        {/* Filter Bar */}
        <div className="bg-white p-4 flex flex-wrap items-center gap-6 text-sm border-b">
          <div className="flex gap-6 font-medium">
            <span className="text-[#e60012] cursor-pointer">{t('综合')}</span>
            <span className="hover:text-[#e60012] cursor-pointer">{t('新品')}</span>
            <span className="hover:text-[#e60012] cursor-pointer">{t('销量')}</span>
            <span className="hover:text-[#e60012] cursor-pointer">{t('价格')}</span>
          </div>
          <div className="flex gap-4 ml-auto">
            <label className="flex items-center gap-1">
              <input type="checkbox" /> {t('仅看有货')}
            </label>
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e60012]"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            {products.map((product) => (
              <Link
                key={product.id}
                to={`/mall/product/${product.id}`}
                className="bg-white p-4 hover:shadow-lg transition-shadow cursor-pointer block"
              >
                <div className="relative h-48 w-full mb-4">
                  {product.is_new && (
                    <span className="absolute top-0 left-0 text-[#e60012] text-xs font-medium">NEW</span>
                  )}
                  <img
                    src={product.main_image || (product as any).image || "/mosfet1.jpg"}
                    alt={t(product.name)}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-gray-500">{product.category_name ? t(product.category_name) : ''}</div>
                  <div className="font-bold text-gray-800 flex items-center gap-2">
                    {t(product.name)} <span className="bg-green-100 text-green-700 text-[10px] px-1 rounded">{product.status_text ? t(product.status_text) : ''}</span>
                  </div>
                  <div className="text-xs text-gray-500 line-clamp-2">{product.description ? t(stripHtml(product.description)) : ''}</div>
                  <div className="text-xs text-gray-400 mt-2">{t('价格约为')} (USD) 1ku | {product.price}</div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Custom Section */}
        <div className="mt-12">
          <h3 className="text-2xl text-center text-[#e60012] font-bold mb-8">{t('新品定制')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {products.slice(0, 4).map((product) => (
              <Link
                key={`custom-${product.id}`}
                to={`/mall/product/${product.id}`}
                className="bg-white p-4 hover:shadow-lg transition-shadow cursor-pointer block"
              >
                <div className="relative h-48 w-full mb-4">
                  <span className="absolute top-0 left-0 text-[#e60012] text-xs font-medium">NEW</span>
                  <img
                    src={product.main_image || (product as any).image || "/mosfet2.jpg"}
                    alt={t(product.name)}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-gray-500">{product.category_name ? t(product.category_name) : ''}</div>
                  <div className="font-bold text-gray-800 flex items-center gap-2">
                    {t(product.name)} <span className="bg-green-100 text-green-700 text-[10px] px-1 rounded">{product.status_text ? t(product.status_text) : ''}</span>
                  </div>
                  <div className="text-xs text-gray-500 line-clamp-2">{product.description ? t(stripHtml(product.description)) : ''}</div>
                  <div className="text-xs text-gray-400 mt-2">{t('价格约为')} (USD) 1ku | {product.price}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
