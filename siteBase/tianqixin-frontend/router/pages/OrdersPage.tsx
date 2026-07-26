import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { userApi, orderApi, getAuthToken } from "../../lib/api-client"
import { ShoppingBag, ArrowLeft, Package, Clock, CheckCircle, Truck, XCircle, Eye } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { toast } from "sonner"

interface OrderItem {
  id: number
  product_name: string
  product_code: string
  quantity: number
  price: number
  image?: string
}

interface Order {
  id: number
  order_no: string
  status: 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled'
  status_text: string
  total_amount: number
  created_at: string
  items: OrderItem[]
  shipping_address?: {
    name: string
    phone: string
    address: string
  }
}



export function OrdersPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [activeTab, setActiveTab] = useState<string>('all')

  const statusConfig = useMemo(() => ({
    pending: { label: t('待付款'), color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
    paid: { label: t('已付款'), color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle },
    shipped: { label: t('已发货'), color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Truck },
    completed: { label: t('已完成'), color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
    cancelled: { label: t('已取消'), color: 'bg-gray-100 text-gray-800 border-gray-200', icon: XCircle },
  }), [t])

  useEffect(() => {
    const loadOrders = async () => {
      const token = getAuthToken()
      if (!token) {
        navigate('/login')
        return
      }

      try {
        const response = await userApi.getOrders({ page: 1, limit: 20 })
        if (response.code === 200) {
          const list = response.data?.list || []
          const mapped = (Array.isArray(list) ? list : []).map((item: any) => {
            const firstItem = item.first_item || (item.items && item.items[0]) || null
            const items: OrderItem[] = firstItem ? [{
              id: firstItem.id || item.id,
              product_name: firstItem.product_name || '',
              product_code: firstItem.product_code || firstItem.mpn || '',
              quantity: firstItem.quantity || 1,
              price: firstItem.price || (item.total_amount || 0) / (firstItem.quantity || 1),
              image: firstItem.product_image || firstItem.image || '',
            }] : []
            return {
              id: item.id,
              order_no: item.order_no || '',
              status: item.status || 'pending',
              status_text: item.status_text || t('待处理'),
              total_amount: item.total_amount || 0,
              created_at: item.created_at || '',
              items,
            }
          })
          setOrders(mapped)
        }
      } catch (error) {
        console.error('Failed to load orders:', error)
      } finally {
        setLoading(false)
      }
    }

    loadOrders()
  }, [navigate])

  const filteredOrders = activeTab === 'all' 
    ? orders 
    : orders.filter(order => order.status === activeTab)

  const tabs = [
    { key: 'all', label: t('全部订单') },
    { key: 'pending', label: t('待付款') },
    { key: 'paid', label: t('待发货') },
    { key: 'shipped', label: t('已发货') },
    { key: 'completed', label: t('已完成') },
  ]

  const handleCancel = async (orderId: number) => {
    try {
      const response = await orderApi.cancelOrder(orderId)
      if (response.code === 200) {
        toast.success(t('订单已取消'))
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled', status_text: t('已取消') } : o))
      } else {
        toast.error(response.message || t('取消失败'))
      }
    } catch (error) {
      toast.error(t('取消失败'))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-600">{t('加载中...')}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => navigate('/member')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{t('我的订单')}</h1>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="flex border-b overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors relative ${
                    activeTab === tab.key
                      ? 'text-[#e60012]'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.key && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e60012]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Order List */}
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">{t('暂无订单')}</p>
              <Button
                onClick={() => navigate('/mall')}
                className="bg-[#e60012] hover:bg-[#cc0010] text-white"
              >
                {t('去购物')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const statusInfo = statusConfig[order.status] || statusConfig.pending
                const StatusIcon = statusInfo.icon

                return (
                  <div key={order.id} className="bg-white rounded-lg shadow overflow-hidden">
                    {/* Order Header */}
                    <div className="px-6 py-4 bg-gray-50 border-b flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">{t('订单号')}：{order.order_no}</span>
                        <span className="text-sm text-gray-400">{order.created_at}</span>
                      </div>
                      <Badge variant="outline" className={statusInfo.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusInfo.label}
                      </Badge>
                    </div>

                    {/* Order Items */}
                    <div className="px-6 py-4">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 py-3">
                          <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{item.product_name}</h3>
                            <p className="text-sm text-gray-500">{t('型号')}：{item.product_code}</p>
                            <p className="text-sm text-gray-500">{t('数量')}：{item.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">${item.price.toFixed(2)} USD</p>
                            <p className="text-sm text-gray-500">{t('单价')}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Order Footer */}
                    <div className="px-6 py-4 bg-gray-50 border-t">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                          {t('共 {{count}} 件商品', { count: order.items.reduce((sum, item) => sum + item.quantity, 0) })}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-gray-600">
                            {t('合计')}：<span className="text-lg font-bold text-[#e60012]">${order.total_amount.toFixed(2)} USD</span>
                          </span>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/member/orders/${order.id}`)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              {t('查看详情')}
                            </Button>
                            {order.status === 'pending' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCancel(order.id)}
                              >
                                {t('取消订单')}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
