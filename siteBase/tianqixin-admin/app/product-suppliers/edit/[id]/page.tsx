'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Form, Input, Select, Switch, message, Breadcrumb, Spin } from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import { API_BASE_URL } from '../../../../lib/api/config';

interface ProductOption {
  id: number;
  name: string;
  product_code?: string;
}

interface SupplierOption {
  id: number;
  name: string;
  supplier_code?: string;
}

// 产品供应商关联编辑页面
export default function ProductSupplierEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  const isEditMode = id !== undefined;

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);

  // 获取认证头
  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // 解析分页或数组格式响应
  const parseListResponse = (data: any) => {
    if (!data || data.code !== 200) return [];
    const payload = data.data;
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.list)) return payload.list;
    return [];
  };

  // 获取产品列表
  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/products?page=1&pageSize=1000`, {
        credentials: 'include',
        mode: 'cors',
        headers: getAuthHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();
      const list = parseListResponse(data);
      setProducts(list.map((p: any) => ({
        id: p.id,
        name: p.name || p.model_name || p.product_code || '',
        product_code: p.product_code,
      })));
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  // 获取供应商列表
  const fetchSuppliers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/suppliers?page=1&pageSize=1000`, {
        credentials: 'include',
        mode: 'cors',
        headers: getAuthHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();
      const list = parseListResponse(data);
      setSuppliers(list.map((s: any) => ({
        id: s.id,
        name: s.name || s.supplier_name || '',
        supplier_code: s.supplier_code,
      })));
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  };

  // 获取产品供应商关联详情
  const fetchProductSupplierDetail = async () => {
    if (!isEditMode) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/product-suppliers/${id}`, {
        credentials: 'include',
        mode: 'cors',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        throw new Error('获取产品供应商关联详情失败');
      }

      const data = await res.json();
      if (data.code !== 200 || !data.data) {
        throw new Error(data.message || '获取产品供应商关联详情失败');
      }

      const record = data.data;
      form.setFieldsValue({
        product_id: record.product_id,
        supplier_id: record.supplier_id,
        supplier_product_code: record.supplier_product_code,
        min_order_quantity: record.min_order_quantity,
        lead_time: record.lead_time,
        is_primary: !!record.is_primary,
        status: record.status !== undefined ? !!record.status : true,
      });
    } catch (error: any) {
      message.error(error.message || '获取产品供应商关联详情失败');
      console.error('Failed to fetch product supplier detail:', error);
    } finally {
      setLoading(false);
    }
  };

  // 保存产品供应商关联
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        ...values,
        is_primary: values.is_primary ? 1 : 0,
        status: values.status ? 1 : 0,
      };

      const url = isEditMode
        ? `${API_BASE_URL}/admin/product-suppliers/${id}`
        : `${API_BASE_URL}/admin/product-suppliers`;
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        credentials: 'include',
        mode: 'cors',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.code === 200) {
        message.success(isEditMode ? '更新产品供应商关联成功' : '新增产品供应商关联成功');
        router.push('/product-suppliers');
      } else {
        message.error(data.message || (isEditMode ? '更新失败' : '新增失败'));
      }
    } catch (error: any) {
      if (error.message) {
        message.error(error.message);
      }
      console.error('Failed to save product supplier:', error);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchSuppliers();
    fetchProductSupplierDetail();
  }, [id]);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <Breadcrumb items={[
            { title: <a href="/">首页</a> },
            { title: <a href="/product-suppliers">产品供应商关联管理</a> },
            { title: isEditMode ? '编辑关联' : '新增关联' }
          ]} />
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => router.push('/product-suppliers')}>
            返回列表
          </Button>
          <Button type="primary" loading={submitting} onClick={handleSave} icon={<SaveOutlined />}>
            保存
          </Button>
        </div>
      </div>

      <Spin spinning={loading}>
        <Card title={isEditMode ? '编辑产品供应商关联' : '新增产品供应商关联'}>
          <Form
            form={form}
            layout="vertical"
            className="max-w-3xl"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Form.Item
                name="product_id"
                label="产品"
                rules={[{ required: true, message: '请选择产品' }]}
              >
                <Select placeholder="请选择产品" size="large" showSearch optionFilterProp="children">
                  {products.map(product => (
                    <Select.Option key={product.id} value={product.id}>
                      {product.product_code ? `${product.name} (${product.product_code})` : product.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="supplier_id"
                label="供应商"
                rules={[{ required: true, message: '请选择供应商' }]}
              >
                <Select placeholder="请选择供应商" size="large" showSearch optionFilterProp="children">
                  {suppliers.map(supplier => (
                    <Select.Option key={supplier.id} value={supplier.id}>
                      {supplier.supplier_code ? `${supplier.name} (${supplier.supplier_code})` : supplier.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="supplier_product_code"
                label="供应商产品编码"
                rules={[{ required: true, message: '请输入供应商产品编码' }]}
              >
                <Input placeholder="请输入供应商产品编码" size="large" />
              </Form.Item>

              <Form.Item
                name="min_order_quantity"
                label="最小订购量"
                rules={[{ required: true, message: '请输入最小订购量' }]}
              >
                <Input type="number" placeholder="请输入最小订购量" size="large" />
              </Form.Item>

              <Form.Item
                name="lead_time"
                label="交货周期(天)"
              >
                <Input type="number" placeholder="请输入交货周期" size="large" />
              </Form.Item>

              <Form.Item
                name="is_primary"
                label="是否主要供应商"
                valuePropName="checked"
                initialValue={false}
              >
                <Switch checkedChildren="是" unCheckedChildren="否" />
              </Form.Item>

              <Form.Item
                name="status"
                label="状态"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch checkedChildren="启用" unCheckedChildren="停用" />
              </Form.Item>
            </div>

            {/* 价格阶梯配置 */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">价格阶梯配置</h3>
              <p className="text-sm text-gray-500 mb-4">
                价格阶梯将在后续版本中实现，目前支持从后端API获取和保存
              </p>
            </div>
          </Form>
        </Card>
      </Spin>
    </div>
  );
}
