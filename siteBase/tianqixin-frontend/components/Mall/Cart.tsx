"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { X, ShoppingCart } from "lucide-react"
import { cartApi, getImageUrl } from "../../lib/api-client"
import { toast } from "sonner"
import { useTranslation } from 'react-i18next'

interface CartItem {
  id: number
  product_id: number
  product_name: string
  product_image: string
  price: number | string
  quantity: number
  stock: number
}

interface CartProps {
  onNavigate?: (path: string) => void
}

export const Cart: React.FC<CartProps> = ({ onNavigate }) => {
  const { t } = useTranslation()
  const [items, setItems] = useState<CartItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)

  // 导航辅助
  const navTo = (path: string) => {
    if (onNavigate) {
      onNavigate(path)
    } else {
      window.location.href = path
    }
  }

  // 获取购物车数据
  useEffect(() => {
    const fetchCart = async () => {
      setLoading(true)
      try {
        const response = await cartApi.getCart()
        if (response.code === 200) {
          const list = response.data?.list || response.data?.items || response.data || []
          setItems(Array.isArray(list) ? list : [])
        }
      } catch (error) {
        console.error('获取购物车失败:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchCart()
  }, [])

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedIds.size === items.length && items.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map(item => item.id)))
    }
  }

  // 切换单个商品选中
  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  // 修改数量
  const updateQuantity = async (itemId: number, newQty: number) => {
    const item = items.find(i => i.id === itemId)
    if (!item || newQty < 1) return
    if (newQty > item.stock) {
      toast.error(t('库存不足，当前库存') + `: ${item.stock}`)
      return
    }
    try {
      const response = await cartApi.updateCartItem(itemId, newQty)
      if (response.code === 200) {
        // 后端按新用量返回最新阶梯单价与库存，合并回本地以联动小计/合计
        const updated = response.data?.item
        setItems(prev => prev.map(it =>
          it.id === itemId
            ? updated
              ? { ...it, ...updated, quantity: newQty }
              : { ...it, quantity: newQty }
            : it
        ))
      } else {
        toast.error(response.message || t('更新数量失败'))
      }
    } catch (error) {
      console.error('更新数量失败:', error)
      toast.error(t('更新数量失败，请重试'))
    }
  }

  // 删除商品
  const removeItem = async (itemId: number) => {
    try {
      const response = await cartApi.removeCartItem(itemId)
      if (response.code === 200) {
        setItems(prev => prev.filter(item => item.id !== itemId))
        setSelectedIds(prev => {
          const next = new Set(prev)
          next.delete(itemId)
          return next
        })
        toast.success(t('已删除'))
      } else {
        toast.error(response.message || t('删除失败'))
      }
    } catch (error) {
      console.error('删除失败:', error)
      toast.error(t('删除失败，请重试'))
    }
  }

  // 计算选中商品总价
  const selectedItems = items.filter(item => selectedIds.has(item.id))
  const totalPrice = selectedItems.reduce((sum, item) => {
    const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price
    return sum + price * item.quantity
  }, 0)

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen pb-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e60012]"></div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      <div className="bg-white py-6 mb-4">
        <div className="container mx-auto px-4 md:px-[10%] flex items-center gap-4">
          <div className="text-[#e60012] border-2 border-[#e60012] rounded-full p-1">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <h1 className="text-2xl text-gray-800">{t('我的购物车')}</h1>
          <span className="text-gray-400 text-xs mt-2">{t('温馨提示：产品是否购买成功，以最终下单为准哦，请尽快结算')}</span>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-[10%]">
        {items.length === 0 ? (
          <div className="bg-white p-12 text-center">
            <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">{t('购物车是空的')}</p>
            <button onClick={() => navTo('/mall')} className="text-[#e60012] hover:underline">
              {t('去逛逛')}
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-white p-4 flex text-center text-sm text-gray-600 mb-4">
              <div className="w-24 text-left pl-4 flex items-center gap-2">
                <input
                  type="checkbox"
                  onChange={toggleSelectAll}
                  checked={selectedIds.size === items.length && items.length > 0}
                />
                {t('全选')}
              </div>
              <div className="flex-1 text-left">{t('商品名称')}</div>
              <div className="w-32">{t('单价')}</div>
              <div className="w-32">{t('数量')}</div>
              <div className="w-32">{t('小计')}</div>
              <div className="w-24">{t('操作')}</div>
            </div>

            {/* Items */}
            {items.map((item) => (
              <div key={item.id} className="bg-white p-4 flex items-center text-center text-sm border-b mb-0.5">
                <div className="w-24 text-left pl-4">
                  <input
                    type="checkbox"
                    onChange={() => toggleSelect(item.id)}
                    checked={selectedIds.has(item.id)}
                  />
                </div>
                <div className="flex-1 text-left flex items-center gap-4">
                  <div
                    className="w-16 h-16 relative border bg-gray-50 flex items-center justify-center cursor-pointer"
                    onClick={() => window.open(`/mall/product/${item.product_id}`, '_blank')}
                  >
                    {item.product_image ? (
                      <img
                        src={getImageUrl(item.product_image)}
                        alt={item.product_name}
                        className="object-contain p-1 max-w-full max-h-full"
                      />
                    ) : (
                      <span className="text-gray-300 text-xs">{t('暂无图片')}</span>
                    )}
                  </div>
                  <div>
                    <span
                      className="block text-[#e60012] hover:underline cursor-pointer"
                      onClick={() => window.open(`/mall/product/${item.product_id}`, '_blank')}
                    >
                      {item.product_name}
                    </span>
                    <span className="text-xs text-gray-400 mt-1">{t('库存')}: {item.stock}</span>
                  </div>
                </div>
                <div className="w-32 text-gray-600">
                  ${typeof item.price === 'number' ? item.price.toFixed(2) : item.price} USD
                </div>
                <div className="w-32 flex justify-center">
                  <div className="border flex">
                    <button
                      className={`px-2 border-r text-gray-400 hover:text-gray-600 ${item.quantity <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      -
                    </button>
                    <span className="w-8 text-center leading-7 outline-none">{item.quantity}</span>
                    <button
                      className={`px-2 border-l text-gray-400 hover:text-gray-600 ${item.quantity >= item.stock ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={item.quantity >= item.stock}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="w-32 text-[#e60012]">
                  ${((typeof item.price === 'string' ? parseFloat(item.price) : item.price) * item.quantity).toFixed(2)} USD
                </div>
                <div className="w-24 flex justify-center text-gray-400 cursor-pointer hover:text-red-500">
                  <X size={16} onClick={() => removeItem(item.id)} />
                </div>
              </div>
            ))}

            {/* Footer */}
            <div className="bg-white p-4 flex items-center justify-between sticky bottom-0 shadow-md">
              <div className="flex items-center gap-8 text-sm text-gray-600 pl-4">
                <button onClick={() => navTo('/mall')} className="cursor-pointer hover:text-[#e60012]">
                  {t('继续购物')}
                </button>
                <span>
                  {t('已选择')} <span className="text-[#e60012]">{selectedItems.length}</span> {t('件')}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm">
                  {t('合计 :')} <span className="text-[#e60012] text-xl">$ {totalPrice.toFixed(2)} USD</span>
                </span>
                {selectedItems.length > 0 ? (
                  <button
                    onClick={() => {
                      // 仅结算勾选的商品：把选中项 ID 传给结算页
                      sessionStorage.setItem(
                        'tqx_checkout_selected_ids',
                        JSON.stringify([...selectedIds])
                      )
                      navTo('/mall/checkout')
                    }}
                    className="px-12 py-3 text-white bg-[#e60012] hover:bg-red-700 transition-colors"
                  >
                    {t('去结算')}
                  </button>
                ) : (
                  <button disabled className="px-12 py-3 text-white bg-gray-300 cursor-not-allowed">
                    {t('去结算')}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
