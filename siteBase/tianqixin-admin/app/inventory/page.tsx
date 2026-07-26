"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, Download, Plus, Trash2 } from "lucide-react"
import { message } from "antd"
import { API_BASE_URL } from "../../lib/api/config"
import { Checkbox } from "@/components/ui/checkbox"

// 定义库存状态类型
interface InventoryItem {
  id: number
  product_id: number
  product_name: string
  model: string
  brand: string
  category: string
  total_stock: number
  available_stock: number
  in_transit_stock: number
  safety_stock: number
  supplier_id: number
  supplier_name: string
  updated_at: string
}

// 定义库存状态枚举
type StockStatus = 'normal' | 'low' | 'out_of_stock' | 'over_safety'

// 获取库存状态
const getStockStatus = (available: number, safety: number, outOfStockThreshold: number): StockStatus => {
  if (available <= outOfStockThreshold) return 'out_of_stock'
  if (available < safety) return 'low'
  if (available > safety) return 'over_safety'
  return 'normal'
}

// 获取库存状态标签
const getStockStatusLabel = (status: StockStatus) => {
  const labels = {
    normal: { text: '正常', variant: 'default' as const },
    low: { text: '低库存', variant: 'warning' as const },
    out_of_stock: { text: '缺货', variant: 'destructive' as const },
    over_safety: { text: '安全库存以上', variant: 'success' as const }
  }
  return labels[status]
}

export default function InventoryPage() {
  const router = useRouter()
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [outOfStockThreshold, setOutOfStockThreshold] = useState(0)
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  // 获取认证头
  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token')
    return {
      Authorization: `Bearer ${token}`,
    }
  }

  // 获取库存设置
  const fetchSettings = async () => {
    try {
      const fullUrl = API_BASE_URL.startsWith('http') 
        ? `${API_BASE_URL}/admin/settings`
        : `/api/admin/settings`
      
      const response = await fetch(fullUrl, {
        credentials: 'include',
        mode: 'cors',
        headers: {
          ...getAuthHeaders(),
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.code === 200 && data.data?.inventory) {
          setOutOfStockThreshold(data.data.inventory.out_of_stock_threshold || 0)
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch settings:', error)
    }
  }

  // 获取库存列表
  const fetchInventory = async () => {
    setLoading(true)
    try {
      const fullUrl = API_BASE_URL.startsWith('http') 
        ? `${API_BASE_URL}/admin/inventory`
        : `/api/admin/inventory`
      
      const response = await fetch(fullUrl, {
        credentials: 'include',
        mode: 'cors',
        headers: {
          ...getAuthHeaders(),
        },
      })

      if (!response.ok) {
        throw new Error('获取库存列表失败')
      }

      const data = await response.json()
      if (data.code === 200) {
        // 确保inventoryList始终是数组
        let inventoryData = [];
        if (Array.isArray(data.data)) {
          inventoryData = data.data;
        } else if (data.data && Array.isArray(data.data.list)) {
          // 处理分页数据格式，例如 { list: [...], total: 100 }
          inventoryData = data.data.list;
        }
        setInventoryList(inventoryData)
      } else {
        message.error(data.message || '获取库存列表失败')
      }
    } catch (error: any) {
      message.error(error.message || '获取库存列表失败')
      // 发生错误时确保inventoryList是数组
      setInventoryList([])
    } finally {
      setLoading(false)
    }
  }

  // 获取分类列表
  const fetchCategories = async () => {
    try {
      const fullUrl = API_BASE_URL.startsWith('http') 
        ? `${API_BASE_URL}/admin/categories`
        : `/api/admin/categories`
      
      const response = await fetch(fullUrl, {
        credentials: 'include',
        mode: 'cors',
        headers: {
          ...getAuthHeaders(),
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.code === 200) {
          // 确保data.data是数组，如果是分页数据则取list属性
          let categoriesData = [];
          if (Array.isArray(data.data)) {
            categoriesData = data.data;
          } else if (data.data && Array.isArray(data.data.list)) {
            categoriesData = data.data.list;
          }
          setCategories(categoriesData.map((cat: any) => ({ id: cat.id.toString(), name: cat.name })))
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch categories:', error)
    }
  }

  // 获取供应商列表
  const fetchSuppliers = async () => {
    try {
      const fullUrl = API_BASE_URL.startsWith('http') 
        ? `${API_BASE_URL}/admin/suppliers`
        : `/api/admin/suppliers`
      
      const response = await fetch(fullUrl, {
        credentials: 'include',
        mode: 'cors',
        headers: {
          ...getAuthHeaders(),
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.code === 200) {
          // 确保data.data是数组，如果是分页数据则取list属性
          let suppliersData = [];
          if (Array.isArray(data.data)) {
            suppliersData = data.data;
          } else if (data.data && Array.isArray(data.data.list)) {
            suppliersData = data.data.list;
          }
          setSuppliers(suppliersData.map((supplier: any) => ({ id: supplier.id.toString(), name: supplier.name })))
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch suppliers:', error)
    }
  }

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) return;
    if (!window.confirm(`确定要删除选中的 ${selectedRowKeys.length} 个库存记录吗？此操作不可撤销。`)) return;

    try {
      const fullUrl = API_BASE_URL.startsWith('http')
        ? `${API_BASE_URL}/admin/inventory`
        : `/api/admin/inventory`;

      const response = await fetch(fullUrl, {
        method: 'POST',
        credentials: 'include',
        mode: 'cors',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: selectedRowKeys }),
      });

      const data = await response.json();
      if (data.code === 200) {
        message.success('批量删除成功');
        setSelectedRowKeys([]);
        fetchInventory();
      } else {
        message.error(data.message || '批量删除失败');
      }
    } catch (error: any) {
      message.error('批量删除失败');
    }
  };

  // 过滤库存列表
  const filteredInventory = inventoryList.filter(item => {
    // 搜索过滤
    const matchesSearch = item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.brand.toLowerCase().includes(searchTerm.toLowerCase())
    
    // 分类过滤
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
    
    // 供应商过滤
    const matchesSupplier = supplierFilter === 'all' || item.supplier_id.toString() === supplierFilter
    
    // 状态过滤
    if (statusFilter && statusFilter !== 'all') {
      const status = getStockStatus(item.available_stock, item.safety_stock, outOfStockThreshold)
      return matchesSearch && matchesCategory && matchesSupplier && status === statusFilter
    }
    
    return matchesSearch && matchesCategory && matchesSupplier
  })

  // 初始化数据
  useEffect(() => {
    fetchSettings()
    fetchInventory()
    fetchCategories()
    fetchSuppliers()
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-6 h-6" />
            <h1 className="text-2xl font-bold">库存管理</h1>
          </div>
          <Button className="flex items-center gap-2" onClick={() => router.push('/inventory/add')}>
            <Plus className="w-4 h-4" />
            新增库存记录
          </Button>
        </div>

      {/* 筛选和搜索区域 */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 搜索框 */}
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-500" />
              <Input
                placeholder="搜索产品、型号、品牌"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            {/* 分类筛选 */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* 供应商筛选 */}
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger>
                <SelectValue placeholder="选择供应商" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部供应商</SelectItem>
                {suppliers.map(supplier => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* 状态筛选 */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="选择库存状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="normal">正常</SelectItem>
                <SelectItem value="low">低库存</SelectItem>
                <SelectItem value="out_of_stock">缺货</SelectItem>
                <SelectItem value="over_safety">安全库存以上</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={() => {
              setSearchTerm('');
              setCategoryFilter('');
              setSupplierFilter('');
              setStatusFilter('');
              setSelectedRowKeys([]);
            }}>重置</Button>
          </div>
        </CardContent>
      </Card>

      {/* 批量删除 */}
      {selectedRowKeys.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm">已选择 {selectedRowKeys.length} 项</span>
          <Button variant="destructive" className="flex items-center gap-2" onClick={handleBatchDelete}>
            <Trash2 className="w-4 h-4" />
            批量删除
          </Button>
        </div>
      )}

      {/* 库存统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">总库存</p>
                <h3 className="text-2xl font-bold mt-1">
                  {filteredInventory.reduce((sum, item) => sum + item.total_stock, 0)}
                </h3>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Badge variant="default" className="text-blue-700">总数</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">可用库存</p>
                <h3 className="text-2xl font-bold mt-1">
                  {filteredInventory.reduce((sum, item) => sum + item.available_stock, 0)}
                </h3>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <Badge variant="success" className="text-green-700">可用</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">在途库存</p>
                <h3 className="text-2xl font-bold mt-1">
                  {filteredInventory.reduce((sum, item) => sum + item.in_transit_stock, 0)}
                </h3>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <Badge variant="warning" className="text-yellow-700">在途</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">低库存产品</p>
                <h3 className="text-2xl font-bold mt-1">
                  {filteredInventory.filter(item => 
                    getStockStatus(item.available_stock, item.safety_stock, outOfStockThreshold) === 'low'
                  ).length}
                </h3>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <Badge variant="warning" className="text-orange-700">低库存</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 库存列表 */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>库存明细</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              导出数据
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={filteredInventory.length > 0 && selectedRowKeys.length === filteredInventory.length}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedRowKeys(filteredInventory.map(item => item.id));
                      } else {
                        setSelectedRowKeys([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead>产品信息</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>品牌</TableHead>
                <TableHead>供应商</TableHead>
                <TableHead className="text-right">总库存</TableHead>
                <TableHead className="text-right">可用库存</TableHead>
                <TableHead className="text-right">在途库存</TableHead>
                <TableHead className="text-right">安全库存</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>更新时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.map((item) => {
                const status = getStockStatus(item.available_stock, item.safety_stock, outOfStockThreshold)
                const statusLabel = getStockStatusLabel(status)
                
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedRowKeys.includes(item.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedRowKeys([...selectedRowKeys, item.id]);
                          } else {
                            setSelectedRowKeys(selectedRowKeys.filter(id => id !== item.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.product_name}</div>
                        <div className="text-sm text-gray-500">{item.model}</div>
                      </div>
                    </TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.brand}</TableCell>
                    <TableCell>{item.supplier_name}</TableCell>
                    <TableCell className="text-right">{item.total_stock}</TableCell>
                    <TableCell className="text-right">{item.available_stock}</TableCell>
                    <TableCell className="text-right">{item.in_transit_stock}</TableCell>
                    <TableCell className="text-right">{item.safety_stock}</TableCell>
                    <TableCell>
                      <Badge variant={statusLabel.variant}>{statusLabel.text}</Badge>
                    </TableCell>
                    <TableCell>{new Date(item.updated_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">编辑</Button>
                        <Button size="sm" variant="outline">查看详情</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          
          {/* 空状态 */}
          {filteredInventory.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-gray-500 text-lg mb-2">暂无库存记录</div>
              <div className="text-gray-400 text-sm">请检查筛选条件或添加库存记录</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}