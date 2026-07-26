"use client";

import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Space, message, Select, InputNumber, Switch, Tag, Card } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { API_BASE_URL } from '../../../lib/api/config';
// import MultiLangInput from '../../../components/MultiLangInput';

type Category = {
  id: number;
  name: string;
  parent_id: number;
  sort: number;
  status: number;
  parent_name?: string;
  children_count?: number;
  products_count?: number;
  is_hot: number;
  created_at?: string;
  updated_at?: string;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryTree, setCategoryTree] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [parentId, setParentId] = useState<number>(0);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: number, name: string }[]>([]);
  const [form] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  // Helper function to get authentication headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Authorization': `Bearer ${token}`,
    };
  };

  const fetchCategories = async (pid: number = parentId) => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/admin/categories?parent_id=${pid}`, { headers });

      if (res.ok) {
        const responseData = await res.json();
        console.log('API Response:', responseData);

        // Handle different response structures
        let categoriesData = [];
        if (Array.isArray(responseData)) {
          categoriesData = responseData;
        } else if (responseData && responseData.data && Array.isArray(responseData.data.list)) {
          categoriesData = responseData.data.list;
        } else if (responseData && Array.isArray(responseData.data)) {
          categoriesData = responseData.data;
        } else if (responseData && responseData.list && Array.isArray(responseData.list)) {
          categoriesData = responseData.list;
        } else if (responseData && typeof responseData === 'object') {
          // If it's an object, try to extract array from it
          categoriesData = Object.values(responseData).find(Array.isArray) || [];
        }

        setCategories(categoriesData);
      } else {
        message.error('获取分类列表失败');
      }
    } catch (e) {
      console.error('Network error:', e);
      message.error('网络错误，请检查后端服务');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryTree = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/admin/categories/tree`, { headers });

      if (res.ok) {
        const responseData = await res.json();
        console.log('Category Tree API Response:', responseData);

        // Handle different response structures
        let treeData = [];
        if (Array.isArray(responseData)) {
          treeData = responseData;
        } else if (responseData && Array.isArray(responseData.data)) {
          treeData = responseData.data;
        } else if (responseData && typeof responseData === 'object') {
          // If it's an object, try to extract array from it
          treeData = Object.values(responseData).find(Array.isArray) || [];
        }

        setCategoryTree(treeData);
      }
    } catch (e) {
      console.error('获取分类树失败:', e);
    }
  };

  useEffect(() => {
    fetchCategories(parentId);
    fetchCategoryTree();
  }, [parentId]);

  const handleNavigate = (category: Category) => {
    setParentId(category.id);
    setBreadcrumbs([...breadcrumbs, { id: category.id, name: category.name }]);
  };

  const handleBreadcrumbClick = (id: number, index: number) => {
    setParentId(id);
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
  };

  const handleBackToTop = () => {
    setParentId(0);
    setBreadcrumbs([]);
  };

  const openCreateModal = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      parent_id: parentId,
      sort: 0,
      status: 1,
      is_hot: 0
    });
    setVisible(true);
  };

  const openEditModal = (record: any) => {
    setEditing(record);
    form.setFieldsValue({
      ...record,
      name: record.name || ''
    });
    setVisible(true);
  };

  // 批量删除
  const handleBatchDelete = () => {
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个分类吗？`,
      okText: '确定删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const headers = getAuthHeaders();
          const res = await fetch(`${API_BASE_URL}/admin/categories/batch-delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify({ ids: selectedRowKeys }),
          });
          const data = await res.json();
          if (data.code === 200) {
            message.success('批量删除成功');
            setSelectedRowKeys([]);
            fetchCategories();
          } else {
            message.error(data.message || '批量删除失败');
          }
        } catch {
          message.error('批量删除失败');
        }
      }
    });
  };

  const handleDelete = async (record: Category) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除分类：${record.name} 吗？`,
      onOk: async () => {
        try {
          const headers = getAuthHeaders();
          const res = await fetch(`${API_BASE_URL}/admin/categories/${record.id}`, {
            method: 'DELETE',
            headers
          });

          if (res.ok) {
            message.success('删除成功');
            fetchCategories();
          } else {
            message.error('删除失败');
          }
        } catch (e) {
          message.error('网络错误，请检查后端服务');
        }
      },
    });
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();

      const payload: any = { ...values };

      // Convert values to URL-encoded form data for ThinkPHP backend
      const formData = new URLSearchParams();
      Object.keys(payload).forEach(key => {
        formData.append(key, payload[key]);
      });

      if (editing) {
        // 更新分类
        const res = await fetch(`${API_BASE_URL}/admin/categories/${editing.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...headers
          },
          body: formData.toString(),
        });

        if (res.ok) {
          message.success('更新成功');
          setVisible(false);
          fetchCategories();
        } else {
          const errorData = await res.json();
          message.error(errorData.message || '更新失败');
        }
      } else {
        // 创建分类
        const res = await fetch(`${API_BASE_URL}/admin/categories`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...headers
          },
          body: formData.toString(),
        });

        if (res.ok) {
          message.success('创建成功');
          setVisible(false);
          fetchCategories();
        } else {
          const errorData = await res.json();
          message.error(errorData.message || '创建失败');
        }
      }
    } catch (e) {
      message.error('网络错误，请检查后端服务');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Category) => (
        <a onClick={() => handleNavigate(record)} style={{ color: '#1890ff', cursor: 'pointer' }}>
          {text}
        </a>
      )
    },
    {
      title: '父分类',
      dataIndex: 'parent_name',
      key: 'parent_name',
      render: (text: string) => text || '顶级分类'
    },
    { title: '排序', dataIndex: 'sort', key: 'sort', width: 80 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: number) => status === 1 ? '启用' : '禁用'
    },
    {
      title: '热门',
      dataIndex: 'is_hot',
      key: 'is_hot',
      width: 80,
      render: (isHot: number) => isHot === 1 ? <Tag color="orange">热门</Tag> : '否'
    },
    { title: '子分类数', dataIndex: 'children_count', key: 'children_count', width: 100 },
    { title: '商品数', dataIndex: 'products_count', key: 'products_count', width: 100 },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at' },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_text: any, record: Category) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openEditModal(record)} />
          <Button
            type="primary"
            onClick={() => window.location.href = `/dictionary?categoryId=${record.id}`}
          >
            属性管理
          </Button>
          <Button icon={<DeleteOutlined />} danger onClick={() => handleDelete(record)} />
        </Space>
      ),
    },
  ];

  return (
    <div className="p-4">
      {/* 标题区域 */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">商品分类</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          新增分类
        </Button>
      </div>

      {/* 面包屑导航 */}
      <div className="mb-4" style={{ fontSize: '14px' }}>
        <span
          onClick={handleBackToTop}
          style={{ cursor: 'pointer', color: parentId === 0 ? '#BFBFBF' : '#1890ff' }}
        >
          顶级分类
        </span>
        {breadcrumbs.map((b, index) => (
          <React.Fragment key={b.id}>
            <span style={{ margin: '0 8px', color: '#BFBFBF' }}>/</span>
            <span
              onClick={() => handleBreadcrumbClick(b.id, index)}
              style={{
                cursor: 'pointer',
                color: index === breadcrumbs.length - 1 ? '#BFBFBF' : '#1890ff'
              }}
            >
              {b.name}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* 搜索区域 */}
      <Card className="mb-4">
        <Space wrap>
          <Input.Search
            placeholder="搜索分类名称"
            allowClear
            style={{ width: 300 }}
            onSearch={fetchCategories}
          />
          <Button onClick={fetchCategories}>重置</Button>
        </Space>
      </Card>

      {/* 表格区域 */}
      <div className="mb-4">
        {selectedRowKeys.length > 0 && (
          <Space>
            <span className="text-gray-500">已选择 {selectedRowKeys.length} 项</span>
            <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>批量删除</Button>
          </Space>
        )}
      </div>

      <Card>
        <Table
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
          rowKey="id"
          dataSource={categories}
          columns={columns}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editing ? '编辑分类' : '新增分类'}
        open={visible}
        onCancel={() => setVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="分类名称" rules={[{ required: true, message: '请输入分类名称' }]}>
            <Input placeholder="请输入分类名称" />
          </Form.Item>

          <Form.Item name="parent_id" label="父分类">
            <Select placeholder="请选择父分类">
              <Select.Option value={0}>顶级分类</Select.Option>
              {categoryTree.map((category: any) => (
                <Select.Option key={category.id} value={category.id}>
                  {category.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="sort" label="排序" rules={[{ required: true, message: '请输入排序值' }]}>
            <InputNumber min={0} placeholder="请输入排序值" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
            <Select placeholder="请选择状态">
              <Select.Option value={1}>启用</Select.Option>
              <Select.Option value={0}>禁用</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="is_hot" label="是否热门" valuePropName="checked" getValueProps={(v) => ({ checked: Number(v) === 1 })} getValueFromEvent={(checked) => checked ? 1 : 0}>
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editing ? '更新' : '创建'}
              </Button>
              <Button onClick={() => setVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}