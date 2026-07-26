'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input, Space, Table, Modal, Form, Select, message, Card, Tooltip, Tag, Drawer } from 'antd';
import { DeleteOutlined, ExclamationCircleOutlined, EyeOutlined, SendOutlined } from '@ant-design/icons';
import { apiClient } from '@/lib/api/client';

interface SampleApply {
  id: number;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  company_name?: string;
  product_id?: number;
  quantity: number;
  application_reason?: string;
  delivery_address?: string;
  expected_delivery_date?: string;
  status: number;
  tracking_number?: string;
  handled_at?: string;
  created_at: string;
}

const statusOptions = [
  { label: '待审核', value: 0 },
  { label: '已批准', value: 1 },
  { label: '已发货', value: 2 },
  { label: '已拒绝', value: 3 },
];

const statusColors: Record<number, string> = {
  0: 'default',
  1: 'processing',
  2: 'success',
  3: 'error',
};

export default function SampleApplicationsPage() {
  const [applications, setApplications] = useState<SampleApply[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [isHandleModalVisible, setIsHandleModalVisible] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<SampleApply | null>(null);
  const [form] = Form.useForm();
  const [handleForm] = Form.useForm();

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (searchKeyword) params.keyword = searchKeyword;
      if (statusFilter !== undefined) params.status = statusFilter;

      const response = await apiClient.get('/admin/sample-applications', { params });
      if (response.data.code === 200 && response.data.data) {
        setApplications(response.data.data.list || []);
        setTotal(response.data.data.total || 0);
      }
    } catch (error) {
      message.error('获取样品申请列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [page, pageSize, searchKeyword, statusFilter]);

  const handleViewDetail = async (record: SampleApply) => {
    setSelectedApplication(record);
    try {
      const response = await apiClient.get(`/admin/sample-applications/${record.id}`);
      if (response.data.code === 200) {
        setSelectedApplication(response.data.data);
      }
    } catch (error) {
      message.error('获取详情失败');
    }
    setIsDetailDrawerVisible(true);
  };

  const handleHandle = (record: SampleApply) => {
    setSelectedApplication(record);
    handleForm.setFieldsValue({
      status: record.status,
      tracking_number: record.tracking_number || '',
    });
    setIsHandleModalVisible(true);
  };

  const handleDelete = (record: SampleApply) => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确认删除来自"${record.applicant_name}"的样品申请吗？`,
      okText: '删除',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await apiClient.delete(`/admin/sample-applications/${record.id}`);
          if (response.data.code === 200) {
            message.success('删除成功');
            fetchApplications();
          } else {
            message.error(response.data.message || '删除失败');
          }
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const handleSaveApplication = async (values: any) => {
    if (!selectedApplication) return;
    try {
      const response = await apiClient.put(`/admin/sample-applications/${selectedApplication.id}`, values);
      if (response.data.code === 200) {
        message.success('更新成功');
        setIsHandleModalVisible(false);
        handleForm.resetFields();
        setSelectedApplication(null);
        fetchApplications();
      } else {
        message.error(response.data.message || '操作失败');
      }
    } catch (error) {
      message.error('操作失败');
    }
  };

  const columns = [
    {
      title: '申请人',
      dataIndex: 'applicant_name',
      key: 'applicant_name',
      width: 120,
    },
    {
      title: '邮箱',
      dataIndex: 'applicant_email',
      key: 'applicant_email',
      width: 150,
      ellipsis: true,
    },
    {
      title: '电话',
      dataIndex: 'applicant_phone',
      key: 'applicant_phone',
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
      width: 80,
      align: 'center' as const,
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
      title: '快递单号',
      dataIndex: 'tracking_number',
      key: 'tracking_number',
      width: 150,
      ellipsis: true,
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
      render: (_: any, record: SampleApply) => (
        <Space>
          <Tooltip title="查看详情">
            <Button
              type="default"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          <Tooltip title="处理">
            <Button
              type="primary"
              size="small"
              icon={<SendOutlined />}
              onClick={() => handleHandle(record)}
            >
              处理
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
          <h1 className="text-2xl font-bold">样品申请</h1>
        </div>

        <Space className="mb-4" direction="vertical" style={{ width: '100%' }}>
          <div className="flex gap-2">
            <Input
              placeholder="搜索申请人、邮箱或公司名..."
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
          dataSource={applications}
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
        title="样品申请详情"
        onClose={() => setIsDetailDrawerVisible(false)}
        open={isDetailDrawerVisible}
      >
        {selectedApplication && (
          <div className="space-y-4">
            <div>
              <strong>申请人：</strong> {selectedApplication.applicant_name}
            </div>
            <div>
              <strong>邮箱：</strong> {selectedApplication.applicant_email}
            </div>
            <div>
              <strong>电话：</strong> {selectedApplication.applicant_phone}
            </div>
            {selectedApplication.company_name && (
              <div>
                <strong>公司名称：</strong> {selectedApplication.company_name}
              </div>
            )}
            {selectedApplication.product_id && (
              <div>
                <strong>产品ID：</strong> {selectedApplication.product_id}
              </div>
            )}
            <div>
              <strong>样品数量：</strong> {selectedApplication.quantity}
            </div>
            {selectedApplication.application_reason && (
              <div>
                <strong>申请原因：</strong>
                <p className="mt-2 p-2 bg-gray-100 rounded">{selectedApplication.application_reason}</p>
              </div>
            )}
            {selectedApplication.delivery_address && (
              <div>
                <strong>送样地址：</strong> {selectedApplication.delivery_address}
              </div>
            )}
            {selectedApplication.expected_delivery_date && (
              <div>
                <strong>期望收样日期：</strong> {selectedApplication.expected_delivery_date}
              </div>
            )}
            <div>
              <strong>状态：</strong> {statusOptions.find((o) => o.value === selectedApplication.status)?.label}
            </div>
            {selectedApplication.tracking_number && (
              <div>
                <strong>快递单号：</strong> {selectedApplication.tracking_number}
              </div>
            )}
            <div>
              <strong>创建时间：</strong> {new Date(selectedApplication.created_at).toLocaleString('zh-CN')}
            </div>
            <Button type="primary" onClick={() => {
              setIsDetailDrawerVisible(false);
              handleHandle(selectedApplication);
            }} block>
              处理申请
            </Button>
          </div>
        )}
      </Drawer>

      {/* Handle Modal */}
      <Modal
        title="处理样品申请"
        open={isHandleModalVisible}
        onOk={() => handleForm.submit()}
        onCancel={() => {
          setIsHandleModalVisible(false);
          handleForm.resetFields();
        }}
        width={600}
      >
        <Form
          form={handleForm}
          layout="vertical"
          onFinish={handleSaveApplication}
        >
          <Form.Item
            name="status"
            label="处理状态"
            rules={[{ required: true, message: '请选择处理状态' }]}
          >
            <Select>
              {statusOptions.map((option) => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="tracking_number"
            label="快递单号（发货时需填）"
          >
            <Input placeholder="请输入快递单号" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
