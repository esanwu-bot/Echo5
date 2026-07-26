"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { ArrowLeft, Save } from "lucide-react"
import { useRouter } from "next/navigation"
import { message } from "antd"
import { API_BASE_URL } from "../../../lib/api/config"

// 定义表单类型
interface InventoryForm {
  product_id: string
  supplier_id: string
  total_stock: number
  available_stock: number
  in_transit_stock: number
  safety_stock: number
}

export default function AddInventoryPage() {
  const router = useRouter()
  const [products, setProducts] = useState<{ id: string; name: string; model: string; brand: string }[]>([])
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)

  // 获取认证头
  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token')
    return {
      Authorization: `Bearer ${token}`,
    }
  }

  // 获取产品列表
  const fetchProducts = async () => {
    try {
      const fullUrl = API_BASE_URL.startsWith('http') 
        ? `${API_BASE_URL}/admin/products`
        : `/api/admin/products`
      
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
          let productsData = []
          if (Array.isArray(data.data)) {
            productsData = data.data
          } else if (data.data && Array.isArray(data.data.list)) {
            productsData = data.data.list
          }
          setProducts(productsData.map((product: any) => ({ 
            id: product.id.toString(), 
            name: product.name || product.model_name || '', 
            model: product.model || product.model_code || '', 
            brand: typeof product.brand === 'object' && product.brand 
              ? product.brand.brand_name || product.brand.name || '' 
              : product.brand || '' 
          })))
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch products:', error)
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
          let suppliersData = []
          if (Array.isArray(data.data)) {
            suppliersData = data.data
          } else if (data.data && Array.isArray(data.data.list)) {
            suppliersData = data.data.list
          }
          setSuppliers(suppliersData.map((supplier: any) => ({ 
            id: supplier.id.toString(), 
            name: supplier.name 
          })))
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch suppliers:', error)
    }
  }

  // 初始化数据
  useEffect(() => {
    fetchProducts()
    fetchSuppliers()
  }, [])

  // 表单初始化
  const form = useForm<InventoryForm>({
    defaultValues: {
      product_id: '',
      supplier_id: '',
      total_stock: 0,
      available_stock: 0,
      in_transit_stock: 0,
      safety_stock: 0,
    },
  })

  // 提交表单
  const onSubmit = async (values: InventoryForm) => {
    setLoading(true)
    try {
      const fullUrl = API_BASE_URL.startsWith('http') 
        ? `${API_BASE_URL}/admin/inventory`
        : `/api/admin/inventory`
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        credentials: 'include',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(values),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.code === 200) {
          message.success('库存记录添加成功')
          router.push('/inventory')
        } else {
          message.error(data.message || '库存记录添加失败')
        }
      } else {
        message.error('库存记录添加失败')
      }
    } catch (error: any) {
      message.error(error.message || '库存记录添加失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </Button>
        <h1 className="text-2xl font-bold">新增库存记录</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>库存信息</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 产品选择 */}
                <FormField
                  control={form.control}
                  name="product_id"
                  rules={{ required: '请选择产品' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>产品</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        placeholder="选择产品"
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择产品" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map(product => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} ({product.model} - {product.brand})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 供应商选择 */}
                <FormField
                  control={form.control}
                  name="supplier_id"
                  rules={{ required: '请选择供应商' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>供应商</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        placeholder="选择供应商"
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择供应商" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map(supplier => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 总库存 */}
                <FormField
                  control={form.control}
                  name="total_stock"
                  rules={{ 
                    required: '请输入总库存',
                    min: { value: 0, message: '总库存不能为负数' }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>总库存</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="输入总库存" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 可用库存 */}
                <FormField
                  control={form.control}
                  name="available_stock"
                  rules={{ 
                    required: '请输入可用库存',
                    min: { value: 0, message: '可用库存不能为负数' }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>可用库存</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="输入可用库存" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 在途库存 */}
                <FormField
                  control={form.control}
                  name="in_transit_stock"
                  rules={{ 
                    required: '请输入在途库存',
                    min: { value: 0, message: '在途库存不能为负数' }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>在途库存</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="输入在途库存" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 安全库存 */}
                <FormField
                  control={form.control}
                  name="safety_stock"
                  rules={{ 
                    required: '请输入安全库存',
                    min: { value: 0, message: '安全库存不能为负数' }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>安全库存</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="输入安全库存" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => router.back()}
                >
                  取消
                </Button>
                <Button 
                  type="submit" 
                  className="flex items-center gap-2"
                  disabled={loading}
                >
                  <Save className="w-4 h-4" />
                  保存
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}