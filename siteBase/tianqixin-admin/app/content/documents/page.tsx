'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input, Space, Table, Modal, Form, Select, message, Tabs, Card, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/api/config';
// import MultiLangInput from '@/components/MultiLangInput';

interface Document {
  id: number;
  title: string;
  category: string;
  product_id?: number;
  status: number;
  views: number;
  created_at: string;
  updated_at: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Fetch documents
  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/documents?page=${page}&pageSize=${pageSize}&keyword=${searchKeyword}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
        }
      );
      const data = await response.json();
      if (data.code === 0 && data.data) {
        setDocuments(data.data.list || []);
        setTotal(data.data.total || 0);
      }
    } catch (error) {
      message.error('获取文档列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [page, pageSize, searchKeyword]);

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = async (record: Document) => {
    setEditingId(record.id);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/documents/${record.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
        },
      });
      const data = await response.json();
      if (data.code === 200 || data.code === 0) {
        const doc = data.data;
        form.setFieldsValue({
          ...doc,
          title: doc.title || '',
          content: doc.content || ''
        });
      }
    } catch (error) {
      message.error('获取文档详情失败');
    }
    setIsModalVisible(true);
  };

const handleDelete = (record: Document) => {
  Modal.confirm({
    title: '确认删除',
    icon: <ExclamationCircleOutlined />,
    content: `确认删除文档"${record.title}"吗？`,
    okText: '删除',
    cancelText: '取消',
    onOk: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/admin/documents/${record.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
        });
        const data = await response.json();
        if (data.code === 200 || data.code === 0) {
          message.success('删除成功');
          fetchDocuments();
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
    content: `确认删除选中的 ${selectedRowKeys.length} 篇文档吗？`,
    okText: '删除',
    cancelText: '取消',
    onOk: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/admin/documents/batch-delete`, {
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
          fetchDocuments();
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
      ? `${API_BASE_URL}/admin/documents/${editingId}`
      : `${API_BASE_URL}/admin/documents`;

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
      fetchDocuments();
    } else {
      message.error(data.message || data.msg || '操作失败');
    }
  } catch (error) {
    message.error('操作失败');
  }
};

const columns = [
  {
    title: '文档标题',
    dataIndex: 'title',
    key: 'title',
    ellipsis: true,
  },
  {
    title: '分类',
    dataIndex: 'category',
    key: 'category',
    width: 120,
  },
  {
    title: '产品ID',
    dataIndex: 'product_id',
    key: 'product_id',
    width: 100,
  },
  {
    title: '浏览次数',
    dataIndex: 'views',
    key: 'views',
    width: 100,
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
    render: (_: any, record: Document) => (
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
      <h1 className="text-2xl font-bold">文档管理</h1>
      <Space>
        {selectedRowKeys.length > 0 && (
          <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>
            批量删除 ({selectedRowKeys.length})
          </Button>
        )}
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增文档
        </Button>
      </Space>
    </div>

    <Card className="mb-4">
      <Space>
        <Input.Search
          placeholder="搜索文档标题、内容或分类..."
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
        dataSource={documents}
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
      title={editingId ? '编辑文档' : '新增文档'}
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
          name="title"
          label="文档标题"
          rules={[{ required: true, message: '请输入文档标题' }]}
        >
          <Input placeholder="请输入文档标题" />
        </Form.Item>

        <Form.Item
          name="category"
          label="分类"
        >
          <Input placeholder="如：技术文档、产品介绍等" />
        </Form.Item>

        <Form.Item
          name="content"
          label="文档内容"
        >
          <Input.TextArea rows={4} placeholder="请输入文档内容" />
        </Form.Item>

        <Form.Item
          name="file_url"
          label="附件链接"
        >
          <Input placeholder="请输入附件URL" />
        </Form.Item>

        <Form.Item
          name="product_id"
          label="关联产品ID"
        >
          <Input type="number" placeholder="可选" />
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
