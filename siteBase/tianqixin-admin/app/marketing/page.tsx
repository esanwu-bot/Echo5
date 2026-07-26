'use client';

import { useState, useEffect } from 'react';
import { Table, Input, Button, Space, Tag, Card, Statistic, Row, Col, Modal, Form, Select, DatePicker, InputNumber, message } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { API_BASE_URL } from '../../lib/api/config';
import { useFormSubmit } from '../../hooks/useFormSubmit';

const { Option } = Select;
const { RangePicker } = DatePicker;

interface Activity {
  id: number;
  name: string;
  type: string;
  discount_type: string;
  discount_value: number;
  status: string;
  start_time: string;
  end_time: string;
  participant_count: number;
  created_at: string;
}

export default function MarketingList() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [form] = Form.useForm();
  const { submit } = useFormSubmit(form);

  // 获取认证头
  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };
  const [statistics, setStatistics] = useState({
    total: 25,
    active: 8,
    upcoming: 5,
    ended: 12
  });

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      
      const params = new URLSearchParams();
      if (searchText) params.append('search', searchText);
      
      const response = await fetch(`${API_BASE_URL}/admin/marketing?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.code === 200 && data.data) {
          const activityList = data.data.list || data.data.items || data.data || [];
          setActivities(activityList);
        } else {
          message.error(data.message || '获取活动列表失败');
        }
      } else {
        throw new Error('API request failed');
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      message.error('获取活动列表失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      
      const response = await fetch(`${API_BASE_URL}/admin/marketing/statistics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.code === 200 && data.data) {
          setStatistics(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    }
  };

  useEffect(() => {
    fetchStatistics();
    fetchActivities();
  }, []);

  const handleSearch = () => {
    setSelectedRowKeys([]);
    fetchActivities();
  };

  const handleReset = () => {
    setSearchText('');
    setSelectedRowKeys([]);
    fetchActivities();
  };

  const handleBatchDelete = () => {
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个活动吗？`,
      okText: '确定删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/admin/marketing/batch-delete`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ ids: selectedRowKeys }),
          });
          const data = await res.json();
          if (data.code === 200) {
            message.success('批量删除成功');
            setSelectedRowKeys([]);
            fetchActivities();
          } else {
            message.error(data.message || '批量删除失败');
          }
        } catch (error) {
          message.error('批量删除失败');
        }
      }
    });
  };

  const getTypeInfo = (type: string) => {
    const types: Record<string, { label: string; color: string }> = {
      discount: { label: '折扣活动', color: 'blue' },
      coupon: { label: '优惠券', color: 'green' },
      gift: { label: '赠品活动', color: 'orange' },
      bundle: { label: '套餐优惠', color: 'purple' },
      flash: { label: '限时抢购', color: 'red' }
    };
    return types[type] || { label: '未知类型', color: 'default' };
  };

  const getStatusInfo = (status: string) => {
    const statuses: Record<string, { label: string; color: string }> = {
      draft: { label: '草稿', color: 'default' },
      active: { label: '进行中', color: 'green' },
      upcoming: { label: '未开始', color: 'blue' },
      ended: { label: '已结束', color: 'gray' },
      paused: { label: '已暂停', color: 'orange' }
    };
    return statuses[status] || { label: '未知状态', color: 'default' };
  };

  const showModal = (activity: Activity | null = null) => {
    setEditingActivity(activity);
    setIsModalVisible(true);
    if (activity) {
      form.setFieldsValue({
        ...activity,
        time_range: activity.start_time && activity.end_time ? 
          [dayjs(activity.start_time), dayjs(activity.end_time)] : undefined
      });
    } else {
      form.resetFields();
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      
      const url = editingActivity
        ? `${API_BASE_URL}/admin/marketing/${editingActivity.id}`
        : `${API_BASE_URL}/admin/marketing`;

      const method = editingActivity ? 'PUT' : 'POST';

      // 转换时间字段
      const payload = {
        ...values,
        start_time: values.time_range?.[0]?.format('YYYY-MM-DD HH:mm:ss'),
        end_time: values.time_range?.[1]?.format('YYYY-MM-DD HH:mm:ss'),
      };
      delete payload.time_range;

      const success = await submit(
        async () => {
          const res = await fetch(url, {
            method,
            headers: getAuthHeaders(),
            body: JSON.stringify(payload),
          });
          return res.json();
        },
        {
          successMessage: editingActivity ? '活动更新成功' : '活动创建成功',
          errorMessage: '保存活动失败',
          onSuccess: () => {
            setIsModalVisible(false);
            setEditingActivity(null);
            fetchActivities();
          },
        }
      );
    } catch (error: any) {
      if (error.errorFields) return; // Ant Design 验证错误，不处理
      console.error('Save failed:', error);
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingActivity(null);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/marketing/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.code === 200 || data.success) {
        message.success('删除成功');
        fetchActivities();
      } else {
        message.error(data.message || '删除失败');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      message.error('删除失败');
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '活动名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '活动类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => {
        const typeInfo = getTypeInfo(type);
        return <Tag color={typeInfo.color}>{typeInfo.label}</Tag>;
      }
    },
    {
      title: '优惠信息',
      key: 'discount_info',
      width: 150,
      render: (_: any, record: Activity) => {
        if (record.discount_type === 'percentage') {
          return <span>{record.discount_value}% 折扣</span>;
        } else if (record.discount_type === 'fixed') {
          return <span>减 $${Number(record.discount_value).toFixed(2)} USD</span>;
        } else {
          return <span>赠品活动</span>;
        }
      }
    },
    {
      title: '活动状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusInfo = getStatusInfo(status);
        return <Tag color={statusInfo.color}>{statusInfo.label}</Tag>;
      }
    },
    {
      title: '活动时间',
      key: 'time_range',
      width: 200,
      render: (_: any, record: Activity) => (
        <div style={{ fontSize: '12px' }}>
          <div>{new Date(record.start_time).toLocaleDateString()}</div>
          <div style={{ color: '#666' }}>
            至 {new Date(record.end_time).toLocaleDateString()}
          </div>
        </div>
      )
    },
    {
      title: '参与人数',
      dataIndex: 'participant_count',
      key: 'participant_count',
      width: 100,
      render: (count: number) => <span style={{ fontWeight: 'bold' }}>{count}</span>
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: Activity) => (
        <Space size="small">
          <Button 
            type="link" 
            size="small"
            icon={<EditOutlined />}
            onClick={() => showModal(record)}
          >
            编辑
          </Button>
          <Button 
            type="link" 
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '0 24px' }}>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总活动数"
              value={statistics.total}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="进行中"
              value={statistics.active}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="未开始"
              value={statistics.upcoming}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已结束"
              value={statistics.ended}
              valueStyle={{ color: '#8c8c8c' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 搜索和操作 */}
      <Card style={{ marginBottom: 24 }}>
        <Space>
          <Input 
            placeholder="搜索活动名称..." 
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={handleSearch}
          />
          <Button type="primary" onClick={handleSearch}>搜索</Button>
          <Button onClick={handleReset}>重置</Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => showModal()}
          >
            新建活动
          </Button>
        </Space>
      </Card>

      {/* 活动列表 */}
      <Card>
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
          columns={columns}
          dataSource={activities}
          rowKey="id"
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
            onChange: () => setSelectedRowKeys([]),
          }}
        />
      </Card>

      {/* 新建/编辑活动弹窗 */}
      <Modal
        title={editingActivity ? '编辑活动' : '新建活动'}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        width={600}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            type: 'discount',
            discount_type: 'percentage',
            status: 'draft'
          }}
        >
          <Form.Item
            name="name"
            label="活动名称"
            rules={[{ required: true, message: '请输入活动名称' }]}
          >
            <Input placeholder="请输入活动名称" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="type"
                label="活动类型"
                rules={[{ required: true, message: '请选择活动类型' }]}
              >
                <Select placeholder="请选择活动类型">
                  <Option value="discount">折扣活动</Option>
                  <Option value="coupon">优惠券</Option>
                  <Option value="gift">赠品活动</Option>
                  <Option value="bundle">套餐优惠</Option>
                  <Option value="flash">限时抢购</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="活动状态"
                rules={[{ required: true, message: '请选择活动状态' }]}
              >
                <Select placeholder="请选择活动状态">
                  <Option value="draft">草稿</Option>
                  <Option value="active">进行中</Option>
                  <Option value="upcoming">未开始</Option>
                  <Option value="paused">已暂停</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="discount_type"
                label="优惠类型"
              >
                <Select placeholder="请选择优惠类型">
                  <Option value="percentage">百分比折扣</Option>
                  <Option value="fixed">固定金额减免</Option>
                  <Option value="gift">赠品</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="discount_value"
                label="优惠值"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="优惠值"
                  min={0}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="time_range"
            label="活动时间"
            rules={[{ required: true, message: '请选择活动时间' }]}
          >
            <RangePicker
              style={{ width: '100%' }}
              showTime
              format="YYYY-MM-DD HH:mm:ss"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}