"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { CheckCircle, Plus } from "lucide-react"
import { cartApi, orderApi, userApi, getImageUrl } from "../../lib/api-client"
import { toast } from "sonner"
import { useTranslation } from 'react-i18next'

interface CartItem {
  id: number
  product_id: number
  model_id?: number
  product_name: string
  product_image: string
  price: number | string
  quantity: number
  stock?: number
}

interface Address {
  id: number
  name: string
  phone: string
  province: string
  city: string
  district: string
  address: string
  is_default: boolean
}

interface CheckoutProps {
  onNavigate?: (path: string) => void
}

export const Checkout: React.FC<CheckoutProps> = ({ onNavigate }) => {
  const { t } = useTranslation()
  const [items, setItems] = useState<CartItem[]>([])
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [remark, setRemark] = useState("")

  // 获取购物车和地址数据
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [cartResponse, addrResponse] = await Promise.all([
          cartApi.getCart(),
          userApi.getAddresses(),
        ])

        if (cartResponse.code === 200) {
          const list = cartResponse.data?.list || cartResponse.data?.items || cartResponse.data || []
          let cartList: CartItem[] = Array.isArray(list) ? list : []

          // 仅结算购物车页勾选的商品（Cart.tsx 去结算时写入的选中项 ID）
          try {
            const raw = sessionStorage.getItem('tqx_checkout_selected_ids')
            if (raw) {
              const selectedIds: number[] = JSON.parse(raw)
              if (Array.isArray(selectedIds) && selectedIds.length > 0) {
                const idSet = new Set(selectedIds.map((id) => Number(id)))
                const filtered = cartList.filter((item) => idSet.has(item.id))
                if (filtered.length > 0) {
                  cartList = filtered
                }
              }
            }
          } catch (e) {
            // 解析失败时回退为全部购物车商品
          }

          setItems(cartList)
        }

        if (addrResponse.code === 200) {
          const addrList = addrResponse.data?.list || addrResponse.data || []
          const addrs = Array.isArray(addrList) ? addrList : []
          setAddresses(addrs)
          // 自动选中默认地址
          const defaultAddr = addrs.find((a: Address) => a.is_default)
          if (defaultAddr) {
            setSelectedAddressId(defaultAddr.id)
          } else if (addrs.length > 0) {
            setSelectedAddressId(addrs[0].id)
          }
        }
      } catch (error) {
        console.error('获取结算数据失败:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // 计算总价
  const totalPrice = items.reduce((sum, item) => {
    const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price
    return sum + price * item.quantity
  }, 0)

  const selectedAddress = addresses.find(a => a.id === selectedAddressId)

  // 提交订单
  const handleSubmit = async () => {
    if (!selectedAddress) {
      toast.error(t('请选择收货地址'))
      return
    }
    if (items.length === 0) {
      toast.error(t('购物车为空'))
      return
    }

    setSubmitting(true)
    try {
      const orderData = {
        address_id: selectedAddress.id,
        payment_method: 'cash',
        cart_items: items.map(item => ({
          product_id: item.product_id,
          model_id: item.model_id || 0,
          quantity: item.quantity,
        })),
        remark: remark || undefined,
      }

      const response = await orderApi.createOrder(orderData)
      if (response.code === 200) {
        // 下单成功，清理结算勾选状态
        sessionStorage.removeItem('tqx_checkout_selected_ids')
        const orderId = response.data?.id || response.data?.order_id || response.data?.order_no || ''
        const amount = response.data?.total_amount || totalPrice
        // 跳转到提交成功页，携带订单号和金额
        const targetPath = `/mall/submit-success?order_id=${orderId}&amount=${Number(amount).toFixed(2)}`
        if (onNavigate) {
          onNavigate(targetPath)
        } else {
          window.location.href = targetPath
        }
      } else {
        toast.error(response.message || t('提交订单失败'))
      }
    } catch (error) {
      console.error('提交订单失败:', error)
      toast.error(t('提交订单失败，请重试'))
    } finally {
      setSubmitting(false)
    }
  }

  // 导航辅助
  const navTo = (path: string) => {
    if (onNavigate) {
      onNavigate(path)
    } else {
      window.location.href = path
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen pb-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e60012]"></div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      <div className="bg-white py-6 mb-4 border-b">
        <div className="container mx-auto px-4 md:px-[10%] flex items-center gap-4">
          <div className="text-[#e60012] border-2 border-[#e60012] rounded-full p-1">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h1 className="text-xl text-gray-800 font-medium">{t('确认订单')}</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-[10%] space-y-4">
        {/* 收货地址 */}
        <div className="bg-white p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-gray-600 text-sm">{t('收货地址')}</h3>
            <button onClick={() => navTo('/member/addresses')} className="flex items-center gap-1 text-xs border p-1 px-2 text-gray-500 hover:border-gray-400">
              <Plus size={12} /> {t('管理收货地址')}
            </button>
          </div>

          {addresses.length === 0 ? (
            <div className="text-gray-400 text-sm py-4">
              {t('暂无收货地址，请先')}
              <button onClick={() => navTo('/member/addresses')} className="text-[#e60012] hover:underline ml-1">
                {t('添加收货地址')}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  onClick={() => setSelectedAddressId(addr.id)}
                  className={`border p-4 w-full md:w-1/2 relative cursor-pointer transition-colors ${
                    selectedAddressId === addr.id
                      ? 'border-[#e60012] bg-red-50/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {addr.is_default && (
                    <span className="absolute top-0 right-0 bg-[#e60012] text-white text-xs px-2 py-0.5">{t('默认地址')}</span>
                  )}
                  <div className="flex gap-4 text-sm mb-2">
                    <span>{t(addr.name)}</span>
                    <span>{addr.phone}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {addr.province} {addr.city} {addr.district} {addr.address}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 商品明细 */}
        <div className="bg-white p-6">
          <h3 className="text-gray-600 text-sm mb-4">{t('商品明细')}</h3>
          {items.map((item) => (
            <div key={item.id} className="flex items-center text-center text-sm mb-4 pb-4 border-b last:border-0">
              <div className="w-24 text-left">
                <div className="w-12 h-12 bg-gray-50 relative border">
                  <img
                    src={item.product_image ? getImageUrl(item.product_image) : "/mosfet1.jpg"}
                    alt={item.product_name}
                    className="w-full h-full object-contain p-1"
                  />
                </div>
              </div>
              <div className="flex-1 text-left text-gray-700">{item.product_name}</div>
              <div className="w-32 text-gray-600">
                ${typeof item.price === 'number' ? item.price.toFixed(2) : item.price} USD
              </div>
              <div className="w-32 text-center">x{item.quantity}</div>
              <div className="w-32 text-[#e60012]">
                ${((typeof item.price === 'string' ? parseFloat(item.price) : item.price) * item.quantity).toFixed(2)} USD
              </div>
            </div>
          ))}
        </div>

        {/* 订单备注 */}
        <div className="bg-white p-6">
          <h3 className="text-gray-600 text-sm mb-2">{t('订单备注')}</h3>
          <textarea
            className="w-full border border-gray-200 p-3 text-sm outline-none focus:border-gray-300 resize-none"
            rows={2}
            placeholder={t('选填：如有特殊要求请备注')}
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
          />
        </div>

        {/* 提交栏 */}
        <div className="bg-white p-6 flex items-center justify-end gap-4">
          <span className="text-sm text-gray-600">
            {t('应付金额 :')} <span className="text-[#e60012] text-2xl font-bold">$ {totalPrice.toFixed(2)} USD</span>
          </span>
          <button
            onClick={handleSubmit}
            disabled={submitting || items.length === 0 || !selectedAddress}
            className="bg-[#e60012] text-white px-12 py-3 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? t('提交中...') : t('提交订单')}
          </button>
        </div>
      </div>
    </div>
  )
}
