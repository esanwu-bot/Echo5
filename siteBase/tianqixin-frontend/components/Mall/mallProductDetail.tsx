"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { ChevronRight, ChevronLeft, Loader2 } from "lucide-react"
import { useTranslation } from 'react-i18next'
import { mallApi, cartApi, getAuthToken, type MallProduct } from "../../lib/api-client"

interface ProductDetailProps {
  productId?: string
}

export const MallProductDetail: React.FC<ProductDetailProps> = ({ productId }) => {
  const { t } = useTranslation()
  const [product, setProduct] = useState<MallProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [addingToCart, setAddingToCart] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (productId) {
      fetchProductDetail(productId)
    }
  }, [productId])

  const fetchProductDetail = async (id: string) => {
    try {
      setLoading(true)
      const response = await mallApi.mall_getProductDetail(id)
      if (response.code === 200) {
        setProduct(response.data)
      } else {
        setError(response.message || t('获取商品详情失败'))
      }
    } catch (err) {
      setError(t('网络请求失败'))
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-[#e60012]" size={48} />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-xl text-gray-600">{error || t('商品不存在')}</div>
        <Link to="/mall" className="text-[#e60012] hover:underline">{t('返回商城首页')}</Link>
      </div>
    )
  }

  const nextImage = () => {
    if (product.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % product.images.length)
    }
  }

  const prevImage = () => {
    if (product.images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length)
    }
  }

  const handleAddToCart = async () => {
    if (!product) return

    const token = getAuthToken()
    if (!token) {
      // Not logged in, redirect to login with return url
      const returnUrl = encodeURIComponent(`/mall/product/${productId}`)
      navigate(`/login?redirect=${returnUrl}`)
      return
    }

    // 验证产品ID
    const pid = product.id || parseInt(productId || '0')
    if (!pid || isNaN(pid)) {
      alert(t('产品ID无效，无法添加到购物车'))
      return
    }

    try {
      setAddingToCart(true)
      console.log('Adding to cart, product_id:', pid)
      
      // Call add to cart API
      const res = await cartApi.addToCart({
        product_id: pid,
        quantity: 1 // Default to 1 for now
      })

      console.log('Add to cart response:', res)

      if (res.code === 200) {
        // Success, navigate to success page
        navigate('/mall/added-success')
      } else {
        alert(res.message || t('添加到购物车失败'))
      }
    } catch (err: any) {
      console.error('Add to cart failed', err)
      if (err.message && err.message.includes('Authentication')) {
        const returnUrl = encodeURIComponent(`/mall/product/${productId}`)
        navigate(`/login?redirect=${returnUrl}`)
      } else if (err.message && err.message.includes('Failed to fetch')) {
        alert(t('添加到购物车失败：无法连接到服务器，请检查网络连接'))
      } else {
        alert(t('添加到购物车失败：') + (err.message || t('请稍后重试')))
      }
    } finally {
      setAddingToCart(false)
    }
  }

  return (
    <div className="bg-white min-h-screen pb-20 font-sans">
      {/* Top Bar / Breadcrumb Area */}
      <div className="border-b border-gray-100">
        <div className="container mx-auto px-4 md:px-[10%] py-4">
          <div className="text-sm font-bold text-gray-800">
            {product.product_code}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-[10%] py-12">
        <div className="flex flex-col md:flex-row gap-16 items-start">
          {/* Left: Image Gallery */}
          <div className="w-full md:w-[500px] flex-shrink-0">
            <div className="relative aspect-square border border-gray-100 flex items-center justify-center group">
              {product.is_new && (
                <span className="absolute top-6 left-6 text-[#e60012] font-bold text-sm tracking-wider">NEW</span>
              )}

              {/* Navigation Arrows */}
              {product.images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-gray-300 hover:text-gray-500 transition-colors z-10"
                  >
                    <ChevronLeft size={48} strokeWidth={1} />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-300 hover:text-gray-500 transition-colors z-10"
                  >
                    <ChevronRight size={48} strokeWidth={1} />
                  </button>
                </>
              )}

              <div className="relative w-4/5 h-4/5">
                <img
                  src={product.images[currentImageIndex] || "/placeholder-product.jpg"}
                  alt={t(product.name)}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Indicators */}
              {product.images.length > 1 && (
                <div className="absolute -bottom-12 left-0 right-0 flex justify-center gap-3">
                  {product.images.map((_, index) => (
                    <div
                      key={index}
                      className={`h-[2px] w-16 transition-all duration-300 ${index === currentImageIndex ? "bg-[#e60012]" : "bg-gray-200"
                        }`}
                    ></div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Product Info */}
          <div className="flex-1 space-y-8">
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-gray-900">{t(product.name)}</h1>
              <p className="text-sm text-gray-500 leading-relaxed">{product.description ? t(product.description) : ''}</p>
            </div>

            <div className="space-y-1">
              <div className="text-[#e60012] text-xs font-medium">{product.brand_name ? t(product.brand_name) : ''}</div>
              <div className="text-[#e60012] text-sm">
                {t('价格约为')} ({product.currency}) {product.unit} | {product.price}
              </div>
            </div>

            {/* Location & Status Box - hidden */}
            {/* 
            <div className="bg-[#f9f9f9] p-5 space-y-2 border-l-0 border-r-0 border-t-0 border-b-0">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500">{t(product.location)}</span>
                <button 
                  onClick={() => navigate('/member/addresses')}
                  className="text-[#e60012] hover:underline font-medium"
                >
                  {t('修改')}
                </button>
              </div>
              <div className="text-[#e60012] text-xs font-medium">
                {t(product.status_text)}
              </div>
            </div>
            */}

            {/* Model Selection */}
            <div className="space-y-3">
              <div className="text-xs text-gray-500 font-medium">{t('型号')}</div>
              <div className="flex flex-wrap gap-3">
                {product.models.map((model) => (
                  <div
                    key={model.id}
                    className={`border px-8 py-3 text-sm font-medium transition-all cursor-pointer ${model.id.toString() === productId
                      ? "border-[#e60012] text-[#e60012]"
                      : "border-gray-200 text-gray-600 hover:border-gray-400"
                      }`}
                  >
                    {model.name}
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-10">
              <button
                onClick={handleAddToCart}
                disabled={addingToCart}
                className="w-48 bg-[#e60012] text-white py-4 text-sm font-bold hover:bg-[#cc0010] transition-colors rounded-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {addingToCart && <Loader2 className="animate-spin" size={16} />}
                {t('加入购物车')}
              </button>

            </div>
          </div>
        </div>
      </div>

      {/* 型号参数 Section */}
      <div className="border-t border-gray-200">
        <div className="container mx-auto px-4 md:px-[10%] py-10">
          <h2 className="text-lg font-bold text-gray-900 pb-6 border-b border-gray-200 mb-6">
            {t('型号参数')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-0">
            {[
              { label: t('品牌'), value: product.brand_name || '-' },
              { label: t('产品编码'), value: product.product_code || '-' },
              { label: t('型号'), value: product.models?.find(m => m.id.toString() === productId)?.name || '-' },
              { label: t('描述'), value: product.description ? t(product.description) : '-' },
              { label: t('价格'), value: `${product.currency} ${product.unit} | ${product.price}` },
              { label: t('库存状态'), value: product.status_text || '-' },
              { label: t('是否新品'), value: product.is_new ? t('是') : t('否') },
            ].map((row, idx) => (
              <div
                key={idx}
                className={`flex items-start py-3 border-b border-gray-100 px-4 -mx-4 ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'
                }`}
              >
                <span className="w-28 flex-shrink-0 text-sm text-gray-500">{row.label}</span>
                <span className="flex-1 text-sm text-gray-900 font-medium">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
