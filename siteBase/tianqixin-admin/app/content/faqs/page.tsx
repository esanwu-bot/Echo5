'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input, Space, Table, Modal, Form, Select, message, Card, Tooltip, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { API_BASE_URL } from '@/lib/api/config';
// import MultiLangInput from '@/components/MultiLangInput';

interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
  product_id?: number;
  is_hot: number;
  status: number;
  views: number;
  sort: number;
  created_at: string;
}

export default function FaqPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/faqs?page=${page}&pageSize=${pageSize}&keyword=${searchKeyword}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
        }
      );
      const data = await response.json();
      if (data.code === 0 && data.data) {
        setFaqs(data.data.list || []);
        setTotal(data.data.total || 0);
      }
    } catch (error) {
      message.error('获取FAQ列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, [page, pageSize, searchKeyword]);

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = async (record: FAQ) => {
    setEditingId(record.id);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/faqs/${record.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
        },
      });
      const data = await response.json();
      if (data.code === 200 || data.code === 0) {
        const faq = data.data;
        form.setFieldsValue({
          ...faq,
          question: faq.question || '',
          answer: faq.answer || ''
        });
      }
    } catch (error) {
      message.error('获取FAQ详情失败');
    }
    setIsModalVisible(true);
  };

const handleDelete = (record: FAQ) => {
  Modal.confirm({
    title: '确认删除',
    icon: <ExclamationCircleOutlined />,
    content: `确认删除问题"${record.question}"吗？`,
    okText: '删除',
    cancelText: '取消',
    onOk: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/admin/faqs/${record.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
        });
        const data = await response.json();
        if (data.code === 200 || data.code === 0) {
          message.success('删除成功');
          fetchFaqs();
        } else {
          message.error(data.message || data.msg || '删除失败');
        }
      } catch (error) {
        message.error('删除失败');
      }
    },
  });
};

const handleBatchDelete = () => {
  if (selectedRowKeys.length === 0) return;
  Modal.confirm({
    title: '确认批量删除',
    icon: <ExclamationCircleOutlined />,
    content: `确认删除选中的 ${selectedRowKeys.length} 条FAQ吗？`,
    okText: '删除',
    cancelText: '取消',
    onOk: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/admin/faqs/batch-delete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
          body: JSON.stringify({ ids: selectedRowKeys }),
        });
        const data = await response.json();
        if (data.code === 200 || data.code === 0) {
          message.success('批量删除成功');
          setSelectedRowKeys([]);
          fetchFaqs();
        } else {
          message.error(data.message || data.msg || '批量删除失败');
        }
      } catch (error) {
        message.error('批量删除失败');
      }
    },
  });
};

const handleSave = async (values: any) => {
  try {
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId
      ? `${API_BASE_URL}/admin/faqs/${editingId}`
      : `${API_BASE_URL}/admin/faqs`;

    const payload: any = { ...values };

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (data.code === 200 || data.code === 0) {
      message.success(editingId ? '更新成功' : '创建成功');
      setIsModalVisible(false);
      form.resetFields();
      fetchFaqs();
    } else {
      message.error(data.message || data.msg || '操作失败');
    }
  } catch (error) {
    message.error('操作失败');
  }
};

const columns = [
  {
    title: '问题',
    dataIndex: 'question',
    key: 'question',
    ellipsis: true,
  },
  {
    title: '分类',
    dataIndex: 'category',
    key: 'category',
    width: 120,
  },
  {
    title: '热门',
    dataIndex: 'is_hot',
    key: 'is_hot',
    width: 80,
    render: (is_hot: number) => is_hot === 1 ? '✓ 是' : '否',
  },
  {
    title: '浏览次数',
    dataIndex: 'views',
    key: 'views',
    width: 100,
    align: 'center' as const,
  },
  {
    title: '排序',
    dataIndex: 'sort',
    key: 'sort',
    width: 80,
    align: 'center' as const,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    render: (status: number) => status === 1 ? '启用' : '禁用',
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 180,
    render: (text: string) => new Date(text).toLocaleString('zh-CN'),
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    render: (_: any, record: FAQ) => (
      <Space>
        <Tooltip title="编辑">
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
        </Tooltip>
        <Tooltip title="删除">
          <Button
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          />
        </Tooltip>
      </Space>
    ),
  },
];

return (
  <div className="p-4">
    <div className="flex justify-between items-center mb-4">
      <h1 className="text-2xl font-bold">FAQ管理</h1>
      <Space>
        {selectedRowKeys.length > 0 && (
          <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>
            批量删除 ({selectedRowKeys.length})
          </Button>
        )}
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增问题
        </Button>
      </Space>
    </div>

    <Card className="mb-4">
      <Space>
        <Input.Search
          placeholder="搜索问题或答案..."
          allowClear
          enterButton="搜索"
          style={{ width: 300 }}
          value={searchKeyword}
          onChange={(e) => {
            setSearchKeyword(e.target.value);
            setPage(1);
          }}
        />
        <Button onClick={() => { setSearchKeyword(''); setPage(1); setSelectedRowKeys([]); }}>重置</Button>
      </Space>
    </Card>

    <Card>

      <Table
        columns={columns}
        dataSource={faqs}
        rowKey="id"
        rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
        loading={loading}
        pagination={{
          current: page,
          pageSize: pageSize,
          total: total,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />
    </Card>

    <Modal
      title={editingId ? '编辑问题' : '新增问题'}
      open={isModalVisible}
      onOk={() => form.submit()}
      onCancel={() => {
        setIsModalVisible(false);
        form.resetFields();
      }}
      width={700}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
      >
        <Form.Item
          name="question"
          label="问题"
          rules={[{ required: true, message: '请输入问题' }]}
        >
          <Input placeholder="请输入问题" />
        </Form.Item>

        <Form.Item
          name="answer"
          label="答案"
          rules={[{ required: true, message: '请输入答案' }]}
        >
          <Input.TextArea rows={4} placeholder="请输入答案" />
        </Form.Item>

        <Form.Item
          name="category"
          label="分类"
        >
          <Input placeholder="如：产品、技术、服务等" />
        </Form.Item>

        <Form.Item
          name="product_id"
          label="关联产品ID"
        >
          <Input type="number" placeholder="可选" />
        </Form.Item>

        <Form.Item
          name="is_hot"
          label="是否热门"
          valuePropName="checked"
          initialValue={0}
        >
          <Switch checkedChildren="是" unCheckedChildren="否" />
        </Form.Item>

        <Form.Item
          name="status"
          label="状态"
          initialValue={1}
        >
          <Select>
            <Select.Option value={1}>启用</Select.Option>
            <Select.Option value={0}>禁用</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="sort"
          label="排序"
          initialValue={0}
        >
          <Input type="number" placeholder="排序号，数字越小越靠前" />
        </Form.Item>
      </Form>
    </Modal>
  </div>
);
}
