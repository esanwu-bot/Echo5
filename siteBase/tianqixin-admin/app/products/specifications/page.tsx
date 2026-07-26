'use client';

import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, message, Card, Tag, Popconfirm, Switch, Row, Col, InputNumber } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { API_BASE_URL } from '../../../lib/api/config';

const { Option } = Select;
const { TextArea } = Input;

interface Specification {
  id: number;
  product_id: string;
  product_name?: string;
  name: string;
  value: string;
  unit?: string;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

interface Product {
  id: string | number;
  name: string;
}

const SpecificationsPage: React.FC = () => {
  const [specifications, setSpecifications] = useState<Specification[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSpec, setEditingSpec] = useState<Specification | null>(null);
  const [form] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Fetch products for dropdown
  const fetchProducts = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const response = await fetch(`${API_BASE_URL}/admin/products?page=1&page_size=1000`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.code === 200 && data.data) {
          const productList = data.data.list || data.data.items || data.data || [];
          setProducts(productList);
        }
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  // Fetch specifications
  const fetchSpecifications = async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      
      // Build query parameters
      const params = new URLSearchParams();
      if (selectedProduct) params.append('product_id', selectedProduct);
      params.append('page', String(pagination.current));
      params.append('pageSize', String(pagination.pageSize));
      
      const response = await fetch(`${API_BASE_URL}/admin/specifications?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.code === 200 && data.data) {
          const list = data.data.list || data.data.items || data.data || [];
          // Add product names to specifications
          const enrichedList = list.map((spec: Specification) => {
            const product = products.find(p => String(p.id) === String(spec.product_id));
            return {
              ...spec,
              product_name: product?.name || spec.product_id
            };
          });
          setSpecifications(enrichedList);
          
          if (data.data.total) {
            setPagination({
              ...pagination,
              total: data.data.total
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch specifications:', error);
      message.error('获取规格列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchSpecifications();
  }, [pagination.current, pagination.pageSize, selectedProduct, products]);

  const handleAdd = () => {
    setEditingSpec(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: Specification) => {
    setEditingSpec(record);
    form.setFieldsValue({
      product_id: record.product_id,
      name: record.name,
      value: record.value,
      unit: record.unit,
      sort_order: record.sort_order,
    });
    setModalVisible(true);
  };

  const handleBatchDelete = () => {
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个规格吗？`,
      okText: '确定删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
          const response = await fetch(`${API_BASE_URL}/admin/specifications/batch-delete`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ ids: selectedRowKeys }),
          });
          const data = await response.json();
          if (data.code === 200) {
            message.success('批量删除成功');
            setSelectedRowKeys([]);
            fetchSpecifications();
          } else {
            message.error(data.message || '批量删除失败');
          }
        } catch {
          message.error('批量删除失败');
        }
      }
    });
  };

  const handleDelete = async (id: number) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const response = await fetch(`${API_BASE_URL}/admin/specifications/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await response.json();
      if (response.ok && data.code === 200) {
        message.success('删除成功');
        fetchSpecifications();
      } else {
        message.error(data.message || '删除失败');
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const method = editingSpec ? 'PUT' : 'POST';
      const url = editingSpec 
        ? `${API_BASE_URL}/admin/specifications/${editingSpec.id}`
        : `${API_BASE_URL}/admin/specifications`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();
      if (response.ok && data.code === 200) {
        message.success(editingSpec ? '更新成功' : '创建成功');
        setModalVisible(false);
        fetchSpecifications();
      } else {
        message.error(data.message || '操作失败');
      }
    } catch (error) {
      message.error('操作失败');
    }
  };

  const columns: ColumnsType<Specification> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '商品名称',
      dataIndex: 'product_name',
      key: 'product_name',
    },
    {
      title: '参数名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '参数值',
      dataIndex: 'value',
      key: 'value',
    },
    {
      title: '参数单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 80,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            size="small"
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除这个规格吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />} size="small">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>规格管理</h1>
          <p style={{ margin: '8px 0 0 0', color: '#666' }}>
            管理商品的规格参数
          </p>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleAdd}
        >
          新增规格
        </Button>
      </div>

      <Card>
        <div style={{ marginBottom: '16px' }}>
          <Space>
            <Select
              placeholder="选择商品"
              style={{ width: 200 }}
              value={selectedProduct}
              onChange={(value) => {
                setSelectedProduct(value);
                setPagination({ ...pagination, current: 1 });
              }}
              allowClear
            >
              {products.map((product) => (
                <Option key={product.id} value={String(product.id)}>
                  {product.name}
                </Option>
              ))}
            </Select>
            <Button onClick={() => { setSelectedProduct(''); setPagination({ ...pagination, current: 1 }); }}>重置</Button>
          </Space>
        </div>

        {/* 批量操作 */}
        {selectedRowKeys.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <Space>
              <span style={{ color: '#666' }}>已选择 {selectedRowKeys.length} 项</span>
              <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>批量删除</Button>
            </Space>
          </div>
        )}

        <Table
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
          columns={columns}
          dataSource={specifications}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={(newPagination) => setPagination({
            current: newPagination.current || 1,
            pageSize: newPagination.pageSize || 10,
            total: pagination.total,
          })}
        />
      </Card>

      {/* Modal */}
      <Modal
        title={editingSpec ? '编辑规格' : '新增规格'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="product_id"
            label="选择商品"
            rules={[{ required: true, message: '请选择商品' }]}
          >
            <Select placeholder="请选择商品" disabled={!!editingSpec}>
              {products.map((product) => (
                <Option key={product.id} value={String(product.id)}>
                  {product.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="name"
            label="参数名称"
            rules={[{ required: true, message: '请输入参数名称' }]}
          >
            <Input placeholder="如：色泽、香气、口感等" />
          </Form.Item>

          <Form.Item
            name="value"
            label="参数值"
            rules={[{ required: true, message: '请输入参数值' }]}
          >
            <Input placeholder="如：深琥珀色、优雅、醇厚等" />
          </Form.Item>

          <Form.Item
            name="unit"
            label="参数单位"
          >
            <Input placeholder="如：度、ml等（可选）" />
          </Form.Item>

          <Form.Item
            name="sort_order"
            label="排序"
            rules={[{ required: true, message: '请输入排序值' }]}
            initialValue={0}
          >
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                {editingSpec ? '更新' : '添加'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SpecificationsPage;
