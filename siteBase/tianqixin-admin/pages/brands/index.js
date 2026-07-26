// 品牌管理页面
import { useState, useEffect } from 'react';
import { Table, Button, Space, Input, Modal, Form, message, Popconfirm, Card } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { API_BASE_URL } from '../../lib/api/config';

export default function BrandsPage() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [form] = Form.useForm();

  // 获取认证头
  const getAuthHeaders = (includeContentType = true) => {
    const token = localStorage.getItem('auth_token');
    const headers = {
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
      params.append('page', page);
      params.append('limit', pagination.pageSize);
      if (keyword) params.append('keyword', keyword);

      const res = await fetch(`${API_BASE_URL}/admin/brands?${params.toString()}`);
      const data = await res.json();

      if (data.success || data.code === 200) {
        const list = data.data?.items || data.items || [];
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
    fetchBrands(1, '');
  };

  // 打开添加/编辑模态框
  const showModal = (brand = null) => {
    setEditingBrand(brand);
    if (brand) {
      form.setFieldsValue({
        name: brand.name,
        description: brand.description,
        logo: brand.logo,
        website: brand.website,
        sort: brand.sort || 0,
        status: brand.status || 1
      });
    } else {
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  // 处理提交
  const handleSubmit = async (values) => {
    try {
      const url = editingBrand
        ? `${API_BASE_URL}/admin/brands/${editingBrand.id}`
        : `${API_BASE_URL}/admin/brands`;
      const method = editingBrand ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
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

  // 处理删除
  const handleDelete = async (brandId) => {
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
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (text) => <strong>{text}</strong>,
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
      render: (text) => text ? (
        <a href={text} target="_blank" rel="noopener noreferrer">{text}</a>
      ) : '-',
    },
    {
      title: '排序',
      dataIndex: 'sort',
      key: 'sort',
      width: 80,
      render: (text) => text || 0,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status) => (
        <span style={{ color: status === 1 ? '#52c41a' : '#ff4d4f' }}>
          {status === 1 ? '启用' : '禁用'}
        </span>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'create_time',
      key: 'create_time',
      width: 160,
      render: (text) => text ? text.substring(0, 19) : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
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
            onConfirm={() => handleDelete(record.id)}
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
    <div style={{ padding: '24px' }}>
      <Card title="品牌管理" extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
          新增品牌
        </Button>
      }>
        {/* 搜索栏 */}
        <Space style={{ marginBottom: '16px', display: 'flex' }}>
          <Input
            placeholder="搜索品牌名称"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 300 }}
            suffix={<SearchOutlined />}
          />
          <Button onClick={handleSearch}>搜索</Button>
          <Button onClick={handleReset}>重置</Button>
        </Space>

        {/* 品牌表格 */}
        <Table
          columns={columns}
          dataSource={brands}
          loading={loading}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page) => fetchBrands(page, searchText),
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
        visible={isModalVisible}
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
            name="name"
            label="品牌名称"
            rules={[{ required: true, message: '请输入品牌名称' }]}
          >
            <Input placeholder="请输入品牌名称" />
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
            name="logo"
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
            name="sort"
            label="排序"
          >
            <Input type="number" placeholder="请输入排序号" />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
          >
            <select style={{ width: '100%', padding: '4px 8px', borderRadius: '2px', border: '1px solid #d9d9d9' }}>
              <option value="1">启用</option>
              <option value="0">禁用</option>
            </select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
