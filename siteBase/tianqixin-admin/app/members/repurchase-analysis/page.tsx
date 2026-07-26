'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { RefreshCw, TrendingUp, Calendar, ShoppingCart, Award } from 'lucide-react'

interface Customer {
  id: number
  name: string
  level: 'regular' | 'silver' | 'gold'
  vipCode: string
}

interface PurchaseData {
  dates: string[]
  amounts: number[]
  categories: Record<string, number>
}

interface RepurchaseStats {
  rate: number
  avgInterval: number
  orderCount: number
  lastOrderDate: string
  daysSinceLastOrder: number
}

const RepurchaseAnalysisPage = () => {
  const [selectedCustomer, setSelectedCustomer] = useState<string>('')
  const [timeRange, setTimeRange] = useState<string>('6')
  const [stats, setStats] = useState<RepurchaseStats | null>(null)
  const [purchaseData, setPurchaseData] = useState<PurchaseData | null>(null)
  const [currentLevel, setCurrentLevel] = useState<string>('regular')
  const [evaluationResult, setEvaluationResult] = useState<string>('')
  const [canUpgrade, setCanUpgrade] = useState<boolean>(false)
  const [upgradeLevel, setUpgradeLevel] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  // 模拟客户数据
  const customers: Customer[] = [
    { id: 1, name: "张伟", level: "gold", vipCode: "VIP001" },
    { id: 2, name: "李娜", level: "silver", vipCode: "VIP002" },
    { id: 3, name: "王明", level: "regular", vipCode: "VIP003" },
    { id: 4, name: "赵丽", level: "regular", vipCode: "VIP004" },
    { id: 5, name: "陈强", level: "silver", vipCode: "VIP005" }
  ]

  // 模拟购买数据
  const mockPurchaseData: Record<number, PurchaseData> = {
    1: {
      dates: ["2024-01-15", "2024-02-10", "2024-03-05", "2024-03-28", "2024-04-20", "2024-05-15", "2024-06-10", "2024-07-05", "2024-08-12", "2024-09-18", "2024-10-02"],
      amounts: [580, 1200, 850, 420, 980, 1500, 760, 890, 1100, 650, 1300],
      categories: { "白酒": 5, "葡萄酒": 3, "洋酒": 2, "啤酒": 1 }
    },
    2: {
      dates: ["2024-02-20", "2024-04-05", "2024-05-18", "2024-06-22", "2024-08-10", "2024-09-25"],
      amounts: [380, 680, 420, 550, 720, 480],
      categories: { "葡萄酒": 3, "啤酒": 2, "白酒": 1 }
    },
    3: {
      dates: ["2024-01-10", "2024-05-20", "2024-09-15"],
      amounts: [280, 320, 450],
      categories: { "啤酒": 2, "葡萄酒": 1 }
    },
    4: {
      dates: ["2024-03-12", "2024-04-18", "2024-05-25", "2024-06-30", "2024-07-15", "2024-08-20", "2024-09-10", "2024-10-05"],
      amounts: [450, 680, 520, 780, 620, 890, 540, 720],
      categories: { "白酒": 4, "葡萄酒": 2, "洋酒": 1, "啤酒": 1 }
    },
    5: {
      dates: ["2024-02-15", "2024-03-20", "2024-04-25", "2024-06-10", "2024-07-18", "2024-08-22"],
      amounts: [520, 780, 640, 890, 720, 580],
      categories: { "葡萄酒": 3, "白酒": 2, "洋酒": 1 }
    }
  }

  // 计算复购统计
  const calculateStats = (dates: string[]): RepurchaseStats => {
    if (dates.length < 2) {
      return {
        rate: 0,
        avgInterval: 0,
        orderCount: dates.length,
        lastOrderDate: dates[dates.length - 1] || '',
        daysSinceLastOrder: 0
      }
    }

    const intervals: number[] = []
    let prevDate = new Date(dates[0])

    for (let i = 1; i < dates.length; i++) {
      const currDate = new Date(dates[i])
      const diffTime = Math.abs(currDate.getTime() - prevDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      intervals.push(diffDays)
      prevDate = currDate
    }

    const avgInterval = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
    const monthsInRange = parseInt(timeRange)
    const rate = (dates.length - 1) / monthsInRange

    const lastDate = new Date(dates[dates.length - 1])
    const today = new Date()
    const diffTime = Math.abs(today.getTime() - lastDate.getTime())
    const daysSinceLastOrder = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return {
      rate,
      avgInterval,
      orderCount: dates.length,
      lastOrderDate: lastDate.toLocaleDateString('zh-CN'),
      daysSinceLastOrder
    }
  }

  // 评估会员等级
  const evaluateMembership = (stats: RepurchaseStats, currentLevel: string) => {
    const { rate, avgInterval, orderCount } = stats

    // 金卡标准：复购率≥1.5次/月，平均间隔≤20天，累计订单≥10单
    if (rate >= 1.5 && avgInterval <= 20 && orderCount >= 10) {
      if (currentLevel !== 'gold') {
        setCanUpgrade(true)
        setUpgradeLevel('gold')
        setEvaluationResult('符合金卡会员升级标准')
      } else {
        setCanUpgrade(false)
        setEvaluationResult('已是金卡会员，保持当前等级')
      }
    }
    // 银卡标准：复购率≥0.8次/月，平均间隔≤45天，累计订单≥5单
    else if (rate >= 0.8 && avgInterval <= 45 && orderCount >= 5) {
      if (currentLevel === 'regular') {
        setCanUpgrade(true)
        setUpgradeLevel('silver')
        setEvaluationResult('符合银卡会员升级标准')
      } else {
        setCanUpgrade(false)
        setEvaluationResult(currentLevel === 'gold' ? '已是金卡会员，保持当前等级' : '已是银卡会员，保持当前等级')
      }
    } else {
      setCanUpgrade(false)
      setEvaluationResult('未达到升级标准')
    }
  }

  // 处理客户选择
  const handleCustomerChange = (customerId: string) => {
    if (!customerId) return

    setSelectedCustomer(customerId)
    setLoading(true)

    // 模拟API调用延迟
    setTimeout(() => {
      const customer = customers.find(c => c.id.toString() === customerId)
      const data = mockPurchaseData[parseInt(customerId)]

      if (customer && data) {
        const calculatedStats = calculateStats(data.dates)
        setStats(calculatedStats)
        setPurchaseData(data)
        setCurrentLevel(customer.level)
        evaluateMembership(calculatedStats, customer.level)
      }

      setLoading(false)
    }, 500)
  }

  // 执行会员升级
  const handleUpgrade = async () => {
    if (!selectedCustomer || !canUpgrade) return

    setLoading(true)

    // 模拟API调用
    setTimeout(() => {
      const customer = customers.find(c => c.id.toString() === selectedCustomer)
      if (customer) {
        customer.level = upgradeLevel as 'regular' | 'silver' | 'gold'
        setCurrentLevel(upgradeLevel)
        setCanUpgrade(false)
        setEvaluationResult(`已成功升级为${upgradeLevel === 'gold' ? '金卡' : '银卡'}会员`)
        
        // 显示成功消息
        alert(`客户 ${customer.name} 已成功升级为${upgradeLevel === 'gold' ? '金卡' : '银卡'}会员！`)
      }
      setLoading(false)
    }, 1000)
  }

  // 准备图表数据
  const timelineData = purchaseData?.dates.map((date, index) => ({
    date: new Date(date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
    amount: purchaseData.amounts[index]
  })) || []

  const categoryData = purchaseData ? Object.entries(purchaseData.categories).map(([category, count]) => ({
    category,
    count
  })) : []

  const getLevelBadge = (level: string) => {
    const badges = {
      gold: { label: '金卡', className: 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white' },
      silver: { label: '银卡', className: 'bg-gradient-to-r from-gray-400 to-gray-600 text-white' },
      regular: { label: '普通', className: 'bg-gradient-to-r from-orange-400 to-orange-600 text-white' }
    }
    return badges[level as keyof typeof badges] || badges.regular
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">客户复购分析系统</h1>
        <div className="flex gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">最近3个月</SelectItem>
              <SelectItem value="6">最近6个月</SelectItem>
              <SelectItem value="12">最近1年</SelectItem>
              <SelectItem value="24">最近2年</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => handleCustomerChange(selectedCustomer)} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新数据
          </Button>
        </div>
      </div>

      {/* 客户选择 */}
      <Card>
        <CardHeader>
          <CardTitle>选择客户</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCustomer} onValueChange={handleCustomerChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="-- 请选择客户 --" />
            </SelectTrigger>
            <SelectContent>
              {customers.map(customer => (
                <SelectItem key={customer.id} value={customer.id.toString()}>
                  {customer.name} ({customer.vipCode})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {stats && (
        <>
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">复购率</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.rate.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">
                  次/月 (阈值: 金卡≥1.5, 银卡≥0.8)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">平均购买间隔</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.avgInterval}</div>
                <p className="text-xs text-muted-foreground">
                  天 (阈值: 金卡≤20, 银卡≤45)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">累计订单</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{stats.orderCount}</div>
                <p className="text-xs text-muted-foreground">
                  单 (阈值: 金卡≥10, 银卡≥5)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">最后购买时间</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">{stats.lastOrderDate}</div>
                <p className="text-xs text-muted-foreground">
                  距离今天: {stats.daysSinceLastOrder}天
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 购买时间分布图表 */}
          <Card>
            <CardHeader>
              <CardTitle>购买时间分布</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)} USD`, '购买金额']} />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#8B0000" 
                    strokeWidth={2}
                    dot={{ fill: '#8B0000', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 品类复购分析图表 */}
          <Card>
            <CardHeader>
              <CardTitle>品类复购分析</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value}次`, '购买次数']} />
                  <Bar dataKey="count" fill="#8B0000" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 会员等级评估 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                会员等级评估
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <span>当前等级:</span>
                <Badge className={getLevelBadge(currentLevel).className}>
                  {getLevelBadge(currentLevel).label}会员
                </Badge>
              </div>

              <Alert>
                <AlertDescription>
                  评估结果: {evaluationResult}
                </AlertDescription>
              </Alert>

              {canUpgrade && (
                <Button 
                  onClick={handleUpgrade} 
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {loading ? '处理中...' : `升级为${upgradeLevel === 'gold' ? '金卡' : '银卡'}会员`}
                </Button>
              )}

              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>升级标准:</strong></p>
                <p>• 金卡会员: 复购率≥1.5次/月，平均间隔≤20天，累计订单≥10单</p>
                <p>• 银卡会员: 复购率≥0.8次/月，平均间隔≤45天，累计订单≥5单</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!selectedCustomer && (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <p className="text-gray-500">请选择客户查看复购分析数据</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default RepurchaseAnalysisPage