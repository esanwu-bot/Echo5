"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { X, ShoppingCart, Plus, Minus } from "lucide-react"
import { cartApi } from "../../lib/api-client"
import { useAuth } from "../../contexts/auth-context"
import { CartItem } from "../../lib/api"
import { useTranslation } from 'react-i18next'

export const ApiCart: React.FC = () => {
  const { t } = useTranslation()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set())
  const { user, loginRequired } = useAuth()
  const [subtotal, setSubtotal] = useState(0)
  const [isUpdating, setIsUpdating] = useState<number | null>(null)

  useEffect(() => {
    fetchCartItems()
  }, [])

  useEffect(() => {
    // Calculate subtotal when cart items change
    const total = cartItems.reduce((sum, item) => {
      return sum + (item.total || 0)
    }, 0)
    setSubtotal(total)
  }, [cartItems])

  const fetchCartItems = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await cartApi.getCart()
      if (response.code === 200) {
        setCartItems(response.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch cart items:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = async (id: number, quantity: number) => {
    if (quantity < 1) return

    setIsUpdating(id)
    try {
      const response = await cartApi.updateCartItem(id, quantity)
      if (response.code === 200) {
        // Update local state
        setCartItems(prev => 
          prev.map(item => 
            item.id === id 
              ? { ...item, quantity, total: item.price * quantity }
              : item
          )
        )
      }
    } catch (error) {
      console.error("Failed to update cart item:", error)
    } finally {
      setIsUpdating(null)
    }
  }

  const removeItem = async (id: number) => {
    try {
      const response = await cartApi.removeCartItem(id)
      if (response.code === 200) {
        // Remove from local state
        setCartItems(prev => prev.filter(item => item.id !== id))
        // Remove from selected items if it was selected
        setSelectedItems(prev => {
          const newSet = new Set(prev)
          newSet.delete(id)
          return newSet
        })
      }
    } catch (error) {
      console.error("Failed to remove cart item:", error)
    }
  }

  const clearCart = async () => {
    try {
      const response = await cartApi.clearCart()
      if (response.code === 200) {
        setCartItems([])
        setSelectedItems(new Set())
      }
    } catch (error) {
      console.error("Failed to clear cart:", error)
    }
  }

  const toggleItemSelection = (id: number) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const toggleAllSelections = () => {
    if (selectedItems.size === cartItems.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(cartItems.map(item => item.id)))
    }
  }

  const selectedSubtotal = cartItems
    .filter(item => selectedItems.has(item.id))
    .reduce((sum, item) => sum + (item.total || 0), 0)

  const allSelected = cartItems.length > 0 && selectedItems.size === cartItems.length

  if (!user) {
    return (
      <div className="bg-gray-50 min-h-screen pb-20 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-sm text-center">
          <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-medium mb-2">{t('请先登录')}</h2>
          <p className="text-gray-600 mb-4">{t('登录后才能查看购物车')}</p>
          <Link
            href="/login"
            className="inline-block bg-[#e60012] text-white px-6 py-2 rounded hover:bg-red-700 transition-colors"
          >
            {t('去登录')}
          </Link>
        </div>
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
        {/* Header */}
        <div className="bg-white p-4 flex text-center text-sm text-gray-600 mb-4">
          <div className="w-24 text-left pl-4 flex items-center gap-2">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAllSelections}
            /> {t('全选')}
          </div>
          <div className="flex-1 text-left">{t('商品名称')}</div>
          <div className="w-32">{t('单价')}</div>
          <div className="w-32">{t('数量')}</div>
          <div className="w-32">{t('小计')}</div>
          <div className="w-24">{t('操作')}</div>
        </div>

        {loading ? (
          <div className="bg-white p-8 text-center text-gray-500">
            {t('加载中...')}
          </div>
        ) : cartItems.length === 0 ? (
          <div className="bg-white p-8 text-center">
            <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('购物车是空的')}</h3>
            <p className="text-gray-600 mb-4">{t('快去选购喜欢的商品吧！')}</p>
            <Link
              href="/mall"
              className="inline-block bg-[#e60012] text-white px-6 py-2 rounded hover:bg-red-700 transition-colors"
            >
              {t('去购物')}
            </Link>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            {cartItems.map((item) => (
              <div key={item.id} className="bg-white p-4 flex items-center text-center text-sm border-b mb-4">
                <div className="w-24 text-left pl-4">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.id)}
                    onChange={() => toggleItemSelection(item.id)}
                  />
                </div>
                <div className="flex-1 text-left flex items-center gap-4">
                  <div className="w-16 h-16 relative border bg-gray-50">
                    <img
                      src={item.product?.image || "/placeholder.svg"}
                      alt={item.product?.name || "Product"}
                      className="w-full h-full object-contain p-1"
                    />
                  </div>
                  <span>{item.product?.name || "Product"}</span>
                </div>
                <div className="w-32 text-gray-600">${item.price} USD</div>
                <div className="w-32 flex justify-center">
                  <div className="border flex">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1 || isUpdating === item.id}
                      className="px-2 py-1 border-r hover:bg-gray-100 disabled:opacity-50"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-3 py-1">
                      {isUpdating === item.id ? "..." : item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={isUpdating === item.id}
                      className="px-2 py-1 border-l hover:bg-gray-100 disabled:opacity-50"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="w-32 text-[#e60012]">${item.total} USD</div>
                <div className="w-24">
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Footer */}
            <div className="bg-white p-6 flex justify-between items-end mt-4">
              <div className="flex gap-4">
                <button
                  onClick={clearCart}
                  className="px-4 py-2 border text-gray-600 hover:border-gray-400"
                >
                  {t('清空购物车')}
                </button>
                <button
                  onClick={() => window.location.href = "/mall"}
                  className="px-4 py-2 border text-gray-600 hover:border-gray-400"
                >
                  {t('继续购物')}
                </button>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600 mb-2">
                  {t('已选择')} <span className="text-[#e60012] font-medium">{selectedItems.size}</span> {t('件商品')}
                </div>
                <div className="text-lg font-medium mb-4">
                  {t('合计:')} <span className="text-[#e60012]">${selectedSubtotal.toFixed(2)} USD</span>
                </div>
                <Link
                  href={selectedItems.size > 0 ? "/mall/checkout" : "#"}
                  className={`inline-block px-6 py-3 rounded text-white transition-colors ${
                    selectedItems.size > 0
                      ? "bg-[#e60012] hover:bg-red-700"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
                >
                  {t('去结算')}
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}