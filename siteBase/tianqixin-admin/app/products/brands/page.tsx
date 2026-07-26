'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Space, Input, Modal, Form, message, Popconfirm, Card, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { API_BASE_URL, API_ENDPOINTS } from '../../../lib/api/config';
// import MultiLangInput from '@/components/MultiLangInput';

interface Brand {
  id?: number;
  brand_code?: string;
  brand_name: string;
  brand_logo?: string;
  website?: string;
  description?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  parent_id?: number;
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [form] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // 获取认证头
  const getAuthHeaders = (includeContentType = true) => {
    const token = localStorage.getItem('auth_token');
    const headers: any = {
      Authorization: `Bearer ${token}`,
    };
    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  };

  // 获取品牌列表
  const fetchBrands = async (page = 1, keyword = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(pagination.pageSize));
      if (keyword) params.append('keyword', keyword);

      const res = await fetch(`${API_BASE_URL}/admin/brands?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (data.success || data.code === 200) {
        const list = data.data?.list || data.data?.items || data.items || [];
        setBrands(list);
        setPagination({
          ...pagination,
          current: page,
          total: data.data?.total || data.total || 0
        });
      } else {
        message.error(data.message || '获取品牌列表失败');
      }
    } catch (error) {
      message.error('获取品牌列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  // 处理搜索
  const handleSearch = () => {
    fetchBrands(1, searchText);
  };

  // 处理重置
  const handleReset = () => {
    setSearchText('');
    setSelectedRowKeys([]);
    fetchBrands(1, '');
  };

  // 打开添加/编辑模态框
  const showModal = (brand: Brand | null = null) => {
    setEditingBrand(brand);
    if (brand) {
      form.setFieldsValue({
        ...brand,
        brand_name: brand.brand_name || '',
        description: brand.description || '',
        status: brand.status || 'Active'
      });
    } else {
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  // 处理提交
  const handleSubmit = async (values: Partial<Brand>) => {
    try {
      const url = editingBrand
        ? `${API_BASE_URL}/admin/brands/${editingBrand.id}`
        : `${API_BASE_URL}/admin/brands`;
      const method = editingBrand ? 'PUT' : 'POST';

      const payload: any = { ...values };

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok || data.success || data.code === 200 || data.code === 201) {
        message.success(editingBrand ? '更新成功' : '创建成功');
        setIsModalVisible(false);
        form.resetFields();
        fetchBrands(1, searchText);
      } else {
        message.error(data.message || (editingBrand ? '更新失败' : '创建失败'));
      }
    } catch (error) {
      message.error(editingBrand ? '更新失败' : '创建失败');
    }
  };

  // 处理批量删除
  const handleBatchDelete = () => {
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个品牌吗？`,
      okText: '确定删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/admin/brands/batch-delete`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ ids: selectedRowKeys }),
          });
          const data = await res.json();
          if (data.code === 200) {
            message.success('批量删除成功');
            setSelectedRowKeys([]);
            fetchBrands(pagination.current, searchText);
          } else {
            message.error(data.message || '批量删除失败');
          }
        } catch {
          message.error('批量删除失败');
        }
      }
    });
  };

  // 处理删除
  const handleDelete = async (brandId: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/brands/${brandId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await res.json();

      if (res.ok || data.success || data.code === 200) {
        message.success('删除成功');
        fetchBrands(pagination.current, searchText);
      } else {
        message.error(data.message || '删除失败');
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '品牌名称',
      dataIndex: 'brand_name',
      key: 'brand_name',
      width: 150,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true,
    },
    {
      title: '网站',
      dataIndex: 'website',
      key: 'website',
      width: 150,
      render: (text: string) => text ? (
        <a href={text} target="_blank" rel="noopener noreferrer">{text}</a>
      ) : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => (
        <span style={{ color: status === 'Active' ? '#52c41a' : '#ff4d4f' }}>
          {status === 'Active' ? '启用' : '禁用'}
        </span>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (text: string) => text ? text.substring(0, 19) : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: Brand) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => showModal(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="删除品牌"
            description="确定要删除该品牌吗？如果有产品关联到该品牌，删除会失败。"
            onConfirm={() => record.id && handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger size="small" icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">品牌管理</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
          新增品牌
        </Button>
      </div>

      {/* 搜索区域 */}
      <Card className="mb-4">
        <Space wrap>
          <Input.Search
            placeholder="搜索品牌名称"
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={handleSearch}
            enterButton="搜索"
            style={{ width: 300 }}
          />
          <Button onClick={handleReset}>重置</Button>
        </Space>
      </Card>

      {/* 批量操作 */}
      <div className="mb-4">
        {selectedRowKeys.length > 0 && (
          <Space>
            <span className="text-gray-500">已选择 {selectedRowKeys.length} 项</span>
            <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>批量删除</Button>
          </Space>
        )}
      </div>

      {/* 品牌表格 */}
      <Card>
        <Table
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
          columns={columns}
          dataSource={brands}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1000 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page) => { setSelectedRowKeys([]); fetchBrands(page, searchText); },
            onShowSizeChange: (current, size) => {
              setPagination({ ...pagination, pageSize: size });
              fetchBrands(current, searchText);
            }
          }}
        />
      </Card>

      {/* 新增/编辑模态框 */}
      <Modal
        title={editingBrand ? '编辑品牌' : '新增品牌'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="brand_name"
            label="品牌名称"
            rules={[{ required: true, message: '请输入品牌名称' }]}
          >
            <Input placeholder="请输入品牌名称" />
          </Form.Item>

          <Form.Item
            name="brand_code"
            label="品牌代码"
            rules={[{ required: true, message: '请输入品牌代码' }]}
          >
            <Input placeholder="请输入品牌代码" />
          </Form.Item>

          <Form.Item
            name="description"
            label="品牌描述"
          >
            <Input.TextArea
              placeholder="请输入品牌描述"
              rows={3}
            />
          </Form.Item>

          <Form.Item
            name="brand_logo"
            label="LOGO URL"
          >
            <Input placeholder="请输入LOGO URL地址" />
          </Form.Item>

          <Form.Item
            name="website"
            label="官方网站"
          >
            <Input placeholder="请输入官方网站URL" />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            initialValue="Active"
          >
            <Select>
              <Select.Option value="Active">启用</Select.Option>
              <Select.Option value="Inactive">禁用</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
