'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input, Space, Table, Modal, Form, Select, message, Card, Tooltip, Tag, Drawer } from 'antd';
import { DeleteOutlined, ExclamationCircleOutlined, MailOutlined } from '@ant-design/icons';
import { API_BASE_URL } from '@/lib/api/config';

interface Message {
  id: number;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  content: string;
  message_type?: string;
  is_read: number;
  reply_content?: string;
  status: number;
  created_at: string;
}

const statusOptions = [
  { label: '待处理', value: 1 },
  { label: '已处理', value: 2 },
  { label: '已关闭', value: 3 },
];

const statusColors: Record<number, string> = {
  1: 'orange',
  2: 'blue',
  3: 'gray',
};

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [isReplyDrawerVisible, setIsReplyDrawerVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [form] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/messages?page=${page}&pageSize=${pageSize}&keyword=${searchKeyword}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
        }
      );
      const data = await response.json();
      if (data.code === 0 && data.data) {
        setMessages(data.data.list || []);
        setTotal(data.data.total || 0);
      }
    } catch (error) {
      message.error('获取留言列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [page, pageSize, searchKeyword]);

  const handleViewDetail = async (record: Message) => {
    setSelectedMessage(record);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/messages/${record.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
        },
      });
      const data = await response.json();
      if (data.code === 0) {
        setSelectedMessage(data.data);
      }
    } catch (error) {
      message.error('获取留言详情失败');
    }
  };

  const handleReply = (record: Message) => {
    setSelectedMessage(record);
    form.setFieldsValue({
      status: 2,
      reply_content: '',
    });
    setIsReplyDrawerVisible(true);
  };

  const handleDelete = (record: Message) => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确认删除来自"${record.name}"的留言吗？`,
      okText: '删除',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/admin/messages/${record.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
            },
          });
          const data = await response.json();
          if (data.code === 0) {
            message.success('删除成功');
            fetchMessages();
          } else {
            message.error(data.msg || '删除失败');
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
      content: `确认删除选中的 ${selectedRowKeys.length} 条留言吗？`,
      okText: '删除',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/admin/messages/batch-delete`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
            },
            body: JSON.stringify({ ids: selectedRowKeys }),
          });
          const data = await response.json();
          if (data.code === 0) {
            message.success('批量删除成功');
            setSelectedRowKeys([]);
            fetchMessages();
          } else {
            message.error(data.msg || '批量删除失败');
          }
        } catch (error) {
          message.error('批量删除失败');
        }
      },
    });
  };

  const handleSaveReply = async (values: any) => {
    if (!selectedMessage) return;
    try {
      const response = await fetch(`${API_BASE_URL}/admin/messages/${selectedMessage.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();
      if (data.code === 0) {
        message.success('回复成功');
        setIsReplyDrawerVisible(false);
        form.resetFields();
        setSelectedMessage(null);
        fetchMessages();
      } else {
        message.error(data.msg || '操作失败');
      }
    } catch (error) {
      message.error('操作失败');
    }
  };

  const columns = [
    {
      title: '发件人',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 180,
      ellipsis: true,
    },
    {
      title: '主题',
      dataIndex: 'subject',
      key: 'subject',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: number) => {
        const option = statusOptions.find((o) => o.value === status);
        return <Tag color={statusColors[status]}>{option?.label}</Tag>;
      },
    },
    {
      title: '未读',
      dataIndex: 'is_read',
      key: 'is_read',
      width: 80,
      render: (is_read: number) => (
        is_read === 0 ? <Tag color="red">未读</Tag> : '已读'
      ),
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
      width: 200,
      render: (_: any, record: Message) => (
        <Space>
          <Tooltip title="查看详情">
            <Button
              type="default"
              size="small"
              icon={<MailOutlined />}
              onClick={() => handleViewDetail(record)}
            >
              查看
            </Button>
          </Tooltip>
          <Tooltip title="回复">
            <Button
              type="primary"
              size="small"
              icon={<MailOutlined />}
              onClick={() => handleReply(record)}
            >
              回复
            </Button>
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
        <h1 className="text-2xl font-bold">客户留言</h1>
        {selectedRowKeys.length > 0 && (
          <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>
            批量删除 ({selectedRowKeys.length})
          </Button>
        )}
      </div>

      <Card className="mb-4">
        <Space>
          <Input.Search
            placeholder="搜索发件人、邮箱或主题..."
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
          dataSource={messages}
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

      {/* Detail Drawer */}
      <Drawer
        title="留言详情"
        onClose={() => setSelectedMessage(null)}
        open={selectedMessage !== null && !isReplyDrawerVisible}
      >
        {selectedMessage && (
          <div className="space-y-4">
            <div>
              <strong>发件人：</strong> {selectedMessage.name}
            </div>
            <div>
              <strong>邮箱：</strong> {selectedMessage.email}
            </div>
            {selectedMessage.phone && (
              <div>
                <strong>电话：</strong> {selectedMessage.phone}
              </div>
            )}
            <div>
              <strong>主题：</strong> {selectedMessage.subject}
            </div>
            <div>
              <strong>内容：</strong>
              <p className="mt-2 p-2 bg-gray-100 rounded">{selectedMessage.content}</p>
            </div>
            {selectedMessage.reply_content && (
              <div>
                <strong>回复：</strong>
                <p className="mt-2 p-2 bg-blue-50 rounded">{selectedMessage.reply_content}</p>
              </div>
            )}
            <div>
              <strong>创建时间：</strong> {new Date(selectedMessage.created_at).toLocaleString('zh-CN')}
            </div>
            <Button type="primary" onClick={() => handleReply(selectedMessage)} block>
              回复
            </Button>
          </div>
        )}
      </Drawer>

      {/* Reply Drawer */}
      <Drawer
        title="回复留言"
        onClose={() => {
          setIsReplyDrawerVisible(false);
          form.resetFields();
        }}
        open={isReplyDrawerVisible}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveReply}
        >
          <Form.Item
            name="reply_content"
            label="回复内容"
            rules={[{ required: true, message: '请输入回复内容' }]}
          >
            <Input.TextArea rows={6} placeholder="请输入回复内容" />
          </Form.Item>

          <Form.Item
            name="status"
            label="处理状态"
            initialValue={2}
          >
            <Select>
              {statusOptions.map((option) => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Button type="primary" htmlType="submit" block>
            保存回复
          </Button>
        </Form>
      </Drawer>
    </div>
  );
}
