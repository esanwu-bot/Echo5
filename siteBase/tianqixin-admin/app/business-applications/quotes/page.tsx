'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input, Space, Table, Modal, Form, Select, message, Card, Tooltip, Tag, Drawer, InputNumber } from 'antd';
import { DeleteOutlined, ExclamationCircleOutlined, EyeOutlined, DollarOutlined } from '@ant-design/icons';
import { apiClient } from '@/lib/api/client';

interface QuoteRequest {
  id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  company_name?: string;
  product_id?: number;
  quantity?: number;
  budget?: number;
  status: number;
  quote_price?: number;
  quoted_at?: string;
  created_at: string;
}

const statusOptions = [
  { label: '待处理', value: 0 },
  { label: '已报价', value: 1 },
  { label: '已成单', value: 2 },
  { label: '已取消', value: 3 },
];

const statusColors: Record<number, string> = {
  0: 'default',
  1: 'processing',
  2: 'success',
  3: 'error',
};

export default function QuoteRequestsPage() {
  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [isQuoteModalVisible, setIsQuoteModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<QuoteRequest | null>(null);
  const [form] = Form.useForm();
  const [quoteForm] = Form.useForm();

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (searchKeyword) params.keyword = searchKeyword;
      if (statusFilter !== undefined) params.status = statusFilter;

      const response = await apiClient.get('/admin/quote-requests', { params });
      if (response.data.code === 200 && response.data.data) {
        setRequests(response.data.data.list || []);
        setTotal(response.data.data.total || 0);
      }
    } catch (error) {
      message.error('获取报价请求列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [page, pageSize, searchKeyword, statusFilter]);

  const handleViewDetail = async (record: QuoteRequest) => {
    setSelectedRequest(record);
    try {
      const response = await apiClient.get(`/admin/quote-requests/${record.id}`);
      if (response.data.code === 200) {
        setSelectedRequest(response.data.data);
      }
    } catch (error) {
      message.error('获取详情失败');
    }
    setIsDetailDrawerVisible(true);
  };

  const handleQuote = (record: QuoteRequest) => {
    setSelectedRequest(record);
    quoteForm.setFieldsValue({
      status: 1,
      quote_price: record.quote_price || '',
    });
    setIsQuoteModalVisible(true);
  };

  const handleDelete = (record: QuoteRequest) => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确认删除来自"${record.customer_name}"的报价请求吗？`,
      okText: '删除',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await apiClient.delete(`/admin/quote-requests/${record.id}`);
          if (response.data.code === 200) {
            message.success('删除成功');
            fetchRequests();
          } else {
            message.error(response.data.message || '删除失败');
          }
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const handleSaveQuote = async (values: any) => {
    if (!selectedRequest) return;
    try {
      const response = await apiClient.put(`/admin/quote-requests/${selectedRequest.id}`, values);
      if (response.data.code === 200) {
        message.success('报价成功');
        setIsQuoteModalVisible(false);
        quoteForm.resetFields();
        setSelectedRequest(null);
        fetchRequests();
      } else {
        message.error(response.data.message || '操作失败');
      }
    } catch (error) {
      message.error('操作失败');
    }
  };

  const columns = [
    {
      title: '客户名称',
      dataIndex: 'customer_name',
      key: 'customer_name',
      width: 120,
    },
    {
      title: '邮箱',
      dataIndex: 'customer_email',
      key: 'customer_email',
      width: 150,
      ellipsis: true,
    },
    {
      title: '电话',
      dataIndex: 'customer_phone',
      key: 'customer_phone',
      width: 120,
    },
    {
      title: '产品ID',
      dataIndex: 'product_id',
      key: 'product_id',
      width: 100,
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
    },
    {
      title: '预算',
      dataIndex: 'budget',
      key: 'budget',
      width: 100,
      render: (budget: number) => budget ? `$${budget.toFixed(2)} USD` : '-',
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
      render: (_: any, record: QuoteRequest) => (
        <Space>
          <Tooltip title="查看详情">
            <Button
              type="default"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          <Tooltip title="报价">
            <Button
              type="primary"
              size="small"
              icon={<DollarOutlined />}
              onClick={() => handleQuote(record)}
            >
              报价
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
    <div className="p-6">
      <Card>
        <div className="mb-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">报价请求</h1>
        </div>

        <Space className="mb-4" direction="vertical" style={{ width: '100%' }}>
          <div className="flex gap-2">
            <Input
              placeholder="搜索客户名称、邮箱或公司名..."
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value);
                setPage(1);
              }}
              allowClear
              style={{ width: 300 }}
            />
            <Select
              style={{ width: 150 }}
              placeholder="按状态筛选"
              allowClear
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              {statusOptions.map((option) => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </div>
        </Space>

        <Table
          columns={columns}
          dataSource={requests}
          rowKey="id"
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
        title="报价请求详情"
        onClose={() => setIsDetailDrawerVisible(false)}
        open={isDetailDrawerVisible}
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div>
              <strong>客户名称：</strong> {selectedRequest.customer_name}
            </div>
            <div>
              <strong>邮箱：</strong> {selectedRequest.customer_email}
            </div>
            <div>
              <strong>电话：</strong> {selectedRequest.customer_phone}
            </div>
            {selectedRequest.company_name && (
              <div>
                <strong>公司名称：</strong> {selectedRequest.company_name}
              </div>
            )}
            {selectedRequest.product_id && (
              <div>
                <strong>产品ID：</strong> {selectedRequest.product_id}
              </div>
            )}
            {selectedRequest.quantity && (
              <div>
                <strong>数量：</strong> {selectedRequest.quantity}
              </div>
            )}
            {selectedRequest.budget && (
              <div>
                <strong>预算：</strong> $${selectedRequest.budget.toFixed(2)} USD
              </div>
            )}
            <div>
              <strong>状态：</strong> {statusOptions.find((o) => o.value === selectedRequest.status)?.label}
            </div>
            {selectedRequest.quote_price && (
              <div>
                <strong>报价金额：</strong> $${selectedRequest.quote_price.toFixed(2)} USD
              </div>
            )}
            <div>
              <strong>创建时间：</strong> {new Date(selectedRequest.created_at).toLocaleString('zh-CN')}
            </div>
            <Button type="primary" onClick={() => {
              setIsDetailDrawerVisible(false);
              handleQuote(selectedRequest);
            }} block>
              报价
            </Button>
          </div>
        )}
      </Drawer>

      {/* Quote Modal */}
      <Modal
        title="提交报价"
        open={isQuoteModalVisible}
        onOk={() => quoteForm.submit()}
        onCancel={() => {
          setIsQuoteModalVisible(false);
          quoteForm.resetFields();
        }}
        width={600}
      >
        <Form
          form={quoteForm}
          layout="vertical"
          onFinish={handleSaveQuote}
        >
          <Form.Item
            name="quote_price"
            label="报价金额（USD）"
            rules={[{ required: true, message: '请输入报价金额' }]}
          >
            <InputNumber min={0} step={0.01} precision={2} placeholder="请输入报价金额" />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            initialValue={1}
          >
            <Select>
              {statusOptions.map((option) => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
