"use client";

import { useState, useEffect } from 'react';
import {
  Table,
  Input,
  Button,
  Space,
  Tag,
  Select,
  message,
  Modal,
  Form,
  InputNumber,
  Switch,
  Tabs,
  Card,
  Statistic,
  Row,
  Col,
  Drawer
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
  FileTextOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { apiClient } from '../../../lib/api/client';

const { Option } = Select;
const { TextArea } = Input;

interface Job {
  id: number;
  job_title: string;
  department: string;
  location: string;
  job_type: 'full-time' | 'part-time' | 'contract' | 'intern';
  salary_range?: string;
  requirements: string;
  responsibilities: string;
  status: 'active' | 'inactive';
  create_time: number;
  update_time: number;
  application_count?: number;
}

interface JobApplication {
  id: number;
  job_id: number;
  name: string;
  email: string;
  phone: string;
  resume_url?: string;
  cover_letter?: string;
  status: 'pending' | 'interviewed' | 'hired' | 'rejected';
  create_time: number;
  update_time: number;
  job_title?: string;
  department?: string;
  location?: string;
}

interface JobStatistics {
  total_jobs: number;
  active_jobs: number;
  total_applications: number;
  application_by_status: Array<{ status: string, count: number }>;
  recent_applications: Array<{ date: string, count: number }>;
  applications_by_department: Array<{ department: string, count: number }>;
}

const RecruitmentManagement = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [statistics, setStatistics] = useState<JobStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [applicationModalVisible, setApplicationModalVisible] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [viewingApplication, setViewingApplication] = useState<JobApplication | null>(null);
  const [activeTab, setActiveTab] = useState('jobs');
  const [form] = Form.useForm();
  const [applicationForm] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // 获取职位列表
  const fetchJobs = async (params: any = {}) => {
    setLoading(true);
    try {
      const response = await apiClient.get('/admin/job', { params });
      if (response.data.code === 200) {
        // 后端返回的是分页数据: { list, total, page, limit, pages }
        const paginatedData = response.data.data;
        setJobs(paginatedData.list || []);
      } else {
        message.error(response.data.message || '获取职位列表失败');
      }
    } catch (error: any) {
      message.error(error.message || '获取职位列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 批量删除职位
  const handleBatchDelete = () => {
    Modal.confirm({
      title: '确认批量删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除选中的 ${selectedRowKeys.length} 个职位吗？`,
      okText: '确定删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const response = await apiClient.post('/admin/job/batch', { action: 'delete', ids: selectedRowKeys });
          if (response.data.code === 200) {
            message.success('批量删除成功');
            setSelectedRowKeys([]);
            fetchJobs();
            fetchStatistics();
          } else {
            message.error(response.data.message || '批量删除失败');
          }
        } catch (error: any) {
          message.error(error.message || '批量删除失败');
        }
      }
    });
  };

  // 获取申请列表
  const fetchApplications = async (params: any = {}) => {
    setLoading(true);
    try {
      const response = await apiClient.get('/admin/job/applications', { params });
      if (response.data.code === 200) {
        // 后端返回的是分页数据: { list, total, page, limit, pages }
        const paginatedData = response.data.data;
        setApplications(paginatedData.list || []);
      } else {
        message.error(response.data.message || '获取申请列表失败');
      }
    } catch (error: any) {
      message.error(error.message || '获取申请列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取统计数据
  const fetchStatistics = async () => {
    try {
      const response = await apiClient.get('/admin/job/statistics');
      if (response.data.code === 200) {
        setStatistics(response.data.data);
      } else {
        message.error(response.data.message || '获取统计数据失败');
      }
    } catch (error: any) {
      message.error(error.message || '获取统计数据失败');
    }
  };

  // 保存职位
  const saveJob = async (values: any) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        status: values.status ? 'active' : 'inactive'
      };
      const response = editingJob
        ? await apiClient.put(`/admin/job/${editingJob.id}`, payload)
        : await apiClient.post('/admin/job', payload);

      if (response.data.code === 200) {
        message.success(editingJob ? '职位更新成功' : '职位创建成功');
        setModalVisible(false);
        setEditingJob(null);
        form.resetFields();
        fetchJobs();
        fetchStatistics();
      } else {
        message.error(response.data.message || (editingJob ? '更新职位失败' : '创建职位失败'));
      }
    } catch (error: any) {
      message.error(error.message || (editingJob ? '更新职位失败' : '创建职位失败'));
    } finally {
      setLoading(false);
    }
  };

  // 删除职位
  const deleteJob = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: '确定要删除这个职位吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await apiClient.delete(`/admin/job/${id}`);
          if (response.data.code === 200) {
            message.success('职位删除成功');
            fetchJobs();
            fetchStatistics();
          } else {
            message.error(response.data.message || '删除职位失败');
          }
        } catch (error: any) {
          message.error(error.message || '删除职位失败');
        }
      },
    });
  };

  // 更新申请状态
  const updateApplicationStatus = async (id: number, status: string) => {
    try {
      const response = await apiClient.put(`/admin/job/application/${id}`, { status });
      if (response.data.code === 200) {
        message.success('申请状态更新成功');
        fetchApplications();
        fetchStatistics();
      } else {
        message.error(response.data.message || '更新申请状态失败');
      }
    } catch (error: any) {
      message.error(error.message || '更新申请状态失败');
    }
  };

  // 查看申请详情
  const viewApplicationDetail = async (id: number) => {
    try {
      const response = await apiClient.get(`/admin/job/application/${id}`);
      if (response.data.code === 200) {
        setViewingApplication(response.data.data);
        setApplicationModalVisible(true);
      } else {
        message.error(response.data.message || '获取申请详情失败');
      }
    } catch (error: any) {
      message.error(error.message || '获取申请详情失败');
    }
  };

  // 编辑职位
  const editJob = (job: Job) => {
    setEditingJob(job);
    form.setFieldsValue({
      ...job,
      status: job.status === 'active'
    });
    setModalVisible(true);
  };

  // 新增职位
  const addJob = () => {
    setEditingJob(null);
    form.resetFields();
    setModalVisible(true);
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('zh-CN');
  };

  // 获取状态标签
  const getStatusTag = (status: string) => {
    const statusConfig = {
      active: { color: 'green', text: '发布中' },
      inactive: { color: 'red', text: '已下线' },
      pending: { color: 'blue', text: '待处理' },
      interviewed: { color: 'orange', text: '已面试' },
      hired: { color: 'green', text: '已录用' },
      rejected: { color: 'red', text: '已拒绝' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 获取工作类型标签
  const getJobTypeTag = (type: string) => {
    const typeConfig = {
      'full-time': { color: 'blue', text: '全职' },
      'part-time': { color: 'green', text: '兼职' },
      'contract': { color: 'orange', text: '合同工' },
      'intern': { color: 'purple', text: '实习' },
    };
    const config = typeConfig[type as keyof typeof typeConfig] || { color: 'default', text: type };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  useEffect(() => {
    fetchJobs();
    fetchApplications();
    fetchStatistics();
  }, []);

  // 职位表格列
  const jobColumns = [
    {
      title: '职位名称',
      dataIndex: 'job_title',
      key: 'job_title',
      width: 200,
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
      width: 120,
    },
    {
      title: '工作地点',
      dataIndex: 'location',
      key: 'location',
      width: 150,
    },
    {
      title: '工作类型',
      dataIndex: 'job_type',
      key: 'job_type',
      width: 100,
      render: (type: string) => getJobTypeTag(type),
    },
    {
      title: '薪资范围',
      dataIndex: 'salary_range',
      key: 'salary_range',
      width: 120,
    },
    {
      title: '申请数量',
      dataIndex: 'application_count',
      key: 'application_count',
      width: 100,
      render: (count: number) => (
        <Tag color="blue">{count || 0}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '创建时间',
      dataIndex: 'create_time',
      key: 'create_time',
      width: 120,
      render: (time: number) => formatTime(time),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 150,
      render: (_, record: Job) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => editJob(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => deleteJob(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  // 申请表格列
  const applicationColumns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
    },
    {
      title: '申请职位',
      dataIndex: 'job_title',
      key: 'job_title',
      width: 200,
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
      width: 120,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 180,
    },
    {
      title: '电话',
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '申请时间',
      dataIndex: 'create_time',
      key: 'create_time',
      width: 120,
      render: (time: number) => formatTime(time),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 200,
      render: (_, record: JobApplication) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => viewApplicationDetail(record.id)}
          >
            查看
          </Button>
          {record.status === 'pending' && (
            <>
              <Button
                type="link"
                icon={<CheckOutlined />}
                onClick={() => updateApplicationStatus(record.id, 'interviewed')}
              >
                面试
              </Button>
              <Button
                type="link"
                danger
                icon={<CloseOutlined />}
                onClick={() => updateApplicationStatus(record.id, 'rejected')}
              >
                拒绝
              </Button>
            </>
          )}
          {record.status === 'interviewed' && (
            <>
              <Button
                type="link"
                icon={<CheckOutlined />}
                onClick={() => updateApplicationStatus(record.id, 'hired')}
              >
                录用
              </Button>
              <Button
                type="link"
                danger
                icon={<CloseOutlined />}
                onClick={() => updateApplicationStatus(record.id, 'rejected')}
              >
                拒绝
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'jobs',
      label: <span><TeamOutlined />职位管理</span>,
      children: (
        <>
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
            <Space>
              <Input
                placeholder="搜索职位名称"
                prefix={<SearchOutlined />}
                style={{ width: 200 }}
                onPressEnter={(e) => {
                  const value = (e.target as HTMLInputElement).value;
                  fetchJobs({ keyword: value });
                }}
              />
              <Select
                placeholder="部门"
                style={{ width: 120 }}
                allowClear
                onChange={(value) => fetchJobs({ department: value })}
              >
                <Option value="研发部">研发部</Option>
                <Option value="销售部">销售部</Option>
                <Option value="市场部">市场部</Option>
                <Option value="产品部">产品部</Option>
              </Select>
              <Select
                placeholder="状态"
                style={{ width: 120 }}
                allowClear
                onChange={(value) => fetchJobs({ status: value })}
              >
                <Option value="active">发布中</Option>
                <Option value="inactive">已下线</Option>
              </Select>
              <Button onClick={() => { fetchJobs({}); setSelectedRowKeys([]); }}>重置</Button>
            </Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={addJob}
            >
              新增职位
            </Button>
          </div>
          <div className="mb-4">
            <Space>
              <span>已选择 {selectedRowKeys.length} 项</span>
              <Button
                danger
                icon={<DeleteOutlined />}
                disabled={selectedRowKeys.length === 0}
                onClick={handleBatchDelete}
              >
                批量删除
              </Button>
            </Space>
          </div>
          <Table
            columns={jobColumns}
            dataSource={jobs}
            rowKey="id"
            loading={loading}
            scroll={{ x: 1200 }}
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys),
            }}
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
              onChange: () => setSelectedRowKeys([]),
            }}
          />
        </>
      )
    },
    {
      key: 'applications',
      label: <span><FileTextOutlined />申请管理</span>,
      children: (
        <>
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
            <Space>
              <Input
                placeholder="搜索姓名或职位"
                prefix={<SearchOutlined />}
                style={{ width: 200 }}
                onPressEnter={(e) => {
                  const value = (e.target as HTMLInputElement).value;
                  fetchApplications({ keyword: value });
                }}
              />
              <Button onClick={() => fetchApplications({})}>重置</Button>
              <Select
                placeholder="状态"
                style={{ width: 120 }}
                allowClear
                onChange={(value) => fetchApplications({ status: value })}
              >
                <Option value="pending">待处理</Option>
                <Option value="interviewed">已面试</Option>
                <Option value="hired">已录用</Option>
                <Option value="rejected">已拒绝</Option>
              </Select>
            </Space>
          </div>
          <Table
            columns={applicationColumns}
            dataSource={applications}
            rowKey="id"
            loading={loading}
            scroll={{ x: 1200 }}
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
            }}
          />
        </>
      )
    },
    {
      key: 'statistics',
      label: <span><TeamOutlined />数据统计</span>,
      children: (
        statistics && (
          <div>
            <Row gutter={16} style={{ marginBottom: '24px' }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="总职位数"
                    value={statistics.total_jobs}
                    prefix={<TeamOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="活跃职位"
                    value={statistics.active_jobs}
                    prefix={<TeamOutlined />}
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="总申请数"
                    value={statistics.total_applications}
                    prefix={<FileTextOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="平均申请/职位"
                    value={statistics.total_jobs ? (statistics.total_applications / statistics.total_jobs).toFixed(1) : 0}
                    suffix="人"
                  />
                </Card>
              </Col>
            </Row>
          </div>
        )
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

      </Card>

      {/* 职位编辑/新增弹窗 */}
      <Modal
        title={editingJob ? '编辑职位' : '新增职位'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingJob(null);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={saveJob}
          initialValues={{
            status: true,
            job_type: 'full-time'
          }}
        >
          <Form.Item
            name="job_title"
            label="职位名称"
            rules={[{ required: true, message: '请输入职位名称' }]}
          >
            <Input placeholder="请输入职位名称" />
          </Form.Item>

          <Form.Item
            name="department"
            label="部门"
            rules={[{ required: true, message: '请选择部门' }]}
          >
            <Select placeholder="请选择部门">
              <Option value="研发部">研发部</Option>
              <Option value="销售部">销售部</Option>
              <Option value="市场部">市场部</Option>
              <Option value="产品部">产品部</Option>
              <Option value="人事部">人事部</Option>
              <Option value="财务部">财务部</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="location"
            label="工作地点"
            rules={[{ required: true, message: '请输入工作地点' }]}
          >
            <Input placeholder="请输入工作地点" />
          </Form.Item>

          <Form.Item
            name="job_type"
            label="工作类型"
            rules={[{ required: true, message: '请选择工作类型' }]}
          >
            <Select placeholder="请选择工作类型">
              <Option value="full-time">全职</Option>
              <Option value="part-time">兼职</Option>
              <Option value="contract">合同工</Option>
              <Option value="intern">实习</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="salary_range"
            label="薪资范围"
          >
            <Input placeholder="如：10K-20K" />
          </Form.Item>

          <Form.Item
            name="requirements"
            label="职位要求"
            rules={[{ required: true, message: '请输入职位要求' }]}
          >
            <TextArea rows={4} placeholder="请输入职位要求" />
          </Form.Item>

          <Form.Item
            name="responsibilities"
            label="工作职责"
            rules={[{ required: true, message: '请输入工作职责' }]}
          >
            <TextArea rows={4} placeholder="请输入工作职责" />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            valuePropName="checked"
          >
            <Switch checkedChildren="发布中" unCheckedChildren="已下线" />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => {
                setModalVisible(false);
                setEditingJob(null);
                form.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingJob ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 申请详情弹窗 */}
      <Drawer
        title="申请详情"
        placement="right"
        onClose={() => {
          setApplicationModalVisible(false);
          setViewingApplication(null);
        }}
        open={applicationModalVisible}
        width={600}
      >
        {viewingApplication && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h4>基本信息</h4>
              <p><strong>姓名：</strong>{viewingApplication.name}</p>
              <p><strong>邮箱：</strong>{viewingApplication.email}</p>
              <p><strong>电话：</strong>{viewingApplication.phone}</p>
              <p><strong>申请职位：</strong>{viewingApplication.job_title}</p>
              <p><strong>部门：</strong>{viewingApplication.department}</p>
              <p><strong>工作地点：</strong>{viewingApplication.location}</p>
              <p><strong>状态：</strong>{getStatusTag(viewingApplication.status)}</p>
              <p><strong>申请时间：</strong>{formatTime(viewingApplication.create_time)}</p>
            </div>

            {viewingApplication.cover_letter && (
              <div style={{ marginBottom: '24px' }}>
                <h4>求职信</h4>
                <p>{viewingApplication.cover_letter}</p>
              </div>
            )}

            {viewingApplication.resume_url && (
              <div style={{ marginBottom: '24px' }}>
                <h4>简历</h4>
                <Button type="primary" href={viewingApplication.resume_url} target="_blank">
                  查看简历
                </Button>
              </div>
            )}

            <div style={{ textAlign: 'right' }}>
              <Space>
                {viewingApplication.status === 'pending' && (
                  <>
                    <Button
                      type="primary"
                      icon={<CheckOutlined />}
                      onClick={() => updateApplicationStatus(viewingApplication.id, 'interviewed')}
                    >
                      通知面试
                    </Button>
                    <Button
                      danger
                      icon={<CloseOutlined />}
                      onClick={() => updateApplicationStatus(viewingApplication.id, 'rejected')}
                    >
                      拒绝
                    </Button>
                  </>
                )}
                {viewingApplication.status === 'interviewed' && (
                  <>
                    <Button
                      type="primary"
                      icon={<CheckOutlined />}
                      onClick={() => updateApplicationStatus(viewingApplication.id, 'hired')}
                    >
                      录用
                    </Button>
                    <Button
                      danger
                      icon={<CloseOutlined />}
                      onClick={() => updateApplicationStatus(viewingApplication.id, 'rejected')}
                    >
                      拒绝
                    </Button>
                  </>
                )}
              </Space>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default RecruitmentManagement;