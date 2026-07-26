'use client';

import { useState, useEffect } from 'react';
import { Table, Input, Button, Space, Tag, Select, Card, Statistic, Row, Col, message, Modal } from 'antd';
import { SearchOutlined, EyeOutlined, ExportOutlined, DeleteOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../lib/api/config';

const { Option } = Select;

export default function OrderList() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statistics, setStatistics] = useState({
    total: 89,
    pending: 24,
    processing: 15,
    completed: 45,
    cancelled: 5,
    totalAmount: 15280
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [exportLoading, setExportLoading] = useState(false);

  const orderStatuses = [
    { value: '1', label: '待付款', color: 'orange' },
    { value: '2', label: '已付款', color: 'blue' },
    { value: '3', label: '已发货', color: 'cyan' },
    { value: '4', label: '已完成', color: 'green' },
    { value: '5', label: '已取消', color: 'red' },
    { value: 'pending', label: '待处理', color: 'orange' },
    { value: 'processing', label: '处理中', color: 'blue' },
    { value: 'completed', label: '已完成', color: 'green' },
    { value: 'cancelled', label: '已取消', color: 'red' }
  ];

  // Mock data
  const mockOrders = [
    {
      id: 1,
      order_no: 'WINE202305112',
      user: { nickname: '张先生', phone: '138****1234' },
      orderItems: [
        { product_name: '茅台飞天53°', quantity: 1 },
        { product_name: '茅台407', quantity: 1 }
      ],
      total_price: 2860,
      status: 1,
      created_at: '2023-05-11 08:12:23'
    },
    {
      id: 2,
      order_no: 'WINE202305111',
      user: { nickname: '李女士', phone: '139****5678' },
      orderItems: [
        { product_name: '拉菲传奇2018', quantity: 1 },
        { product_name: '黄牌45', quantity: 1 }
      ],
      total_price: 1520,
      status: 2,
      created_at: '2023-05-11 08:05:41'
    },
    {
      id: 3,
      order_no: 'WINE202305110',
      user: { nickname: '王先生', phone: '137****9012' },
      orderItems: [
        { product_name: '百威啤酒24听', quantity: 1 }
      ],
      total_price: 158,
      status: 4,
      created_at: '2023-05-11 07:58:12'
    }
  ];

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      
      // Build query parameters
      const params = new URLSearchParams();
      if (searchText) params.append('keyword', searchText);
      if (selectedStatus) params.append('status', selectedStatus);
      params.append('page', String(pagination.current));
      params.append('limit', String(pagination.pageSize));
      
      const response = await fetch(`${API_BASE_URL}/admin/orders?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.code === 200 && data.data) {
          const orderList = data.data.list || data.data.items || data.data || [];
          setOrders(orderList);
          
          if (data.data.total) {
            setPagination(prev => ({ ...prev, total: data.data.total }));
          }
        } else {
          message.error(data.message || '获取订单列表失败');
        }
      } else {
        throw new Error('API request failed');
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      message.error('获取订单列表失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      
      const response = await fetch(`${API_BASE_URL}/admin/orders/statistics`, {
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
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [pagination.current, pagination.pageSize]);

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchOrders();
  };

  const handleReset = () => {
    setSearchText('');
    setSelectedStatus('');
    setSelectedRowKeys([]);
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchOrders();
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedStatus) params.append('status', selectedStatus);
      if (searchText) params.append('keyword', searchText);
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const res = await fetch(`${API_BASE_URL}/admin/orders/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('导出失败');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('订单导出成功');
    } catch {
      message.error('导出失败，请稍后重试');
    } finally {
      setExportLoading(false);
    }
  };

  const handleBatchDelete = () => {
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个订单吗？`,
      okText: '确定删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
          const response = await fetch(`${API_BASE_URL}/admin/orders/batch-delete`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ ids: selectedRowKeys }),
          });
          const data = await response.json();
          if (data.code === 200) {
            message.success('批量删除成功');
            setSelectedRowKeys([]);
            fetchOrders();
          } else {
            message.error(data.message || '批量删除失败');
          }
        } catch (error) {
          message.error('批量删除失败');
        }
      }
    });
  };

  const getStatusInfo = (status?: number | string) => {
    const statusInfo = orderStatuses.find(s => s.value === String(status));
    return statusInfo || { label: '未知状态', color: 'default' };
  };

  const columns = [
    {
      title: '订单号',
      dataIndex: 'order_no',
      key: 'order_no',
      width: 180,
      render: (text: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{text}</span>
      )
    },
    {
      title: '客户信息',
      dataIndex: 'user',
      key: 'customer',
      width: 120,
      render: (user: any) => (
        <div>
          <div>{user?.nickname || '未知客户'}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {user?.phone || ''}
          </div>
        </div>
      )
    },
    {
      title: '商品信息',
      dataIndex: 'orderItems',
      key: 'products',
      width: 200,
      render: (items: any[]) => (
        <div>
          {items?.slice(0, 2).map((item: any, index: number) => (
            <Tag key={index} style={{ marginBottom: '2px', fontSize: '11px' }}>
              {item.product_name} x{item.quantity}
            </Tag>
          ))}
          {items?.length > 2 && (
            <Tag style={{ fontSize: '11px' }}>+{items.length - 2}个商品</Tag>
          )}
        </div>
      )
    },
    {
      title: '订单金额',
      dataIndex: 'total_amount',
      key: 'amount',
      width: 100,
      render: (amount?: number) => (
        <span style={{ fontWeight: 'bold', color: '#f50' }}>
          $${parseFloat(String(amount ?? 0)).toFixed(2)} USD
        </span>
      )
    },
    {
      title: '订单状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: number) => {
        const statusInfo = getStatusInfo(status);
        return <Tag color={statusInfo.color}>{statusInfo.label}</Tag>;
      }
    },
    {
      title: '下单时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (time: string) => (
        <div style={{ fontSize: '12px' }}>
          <div>{new Date(time).toLocaleDateString()}</div>
          <div style={{ color: '#666' }}>
            {new Date(time).toLocaleTimeString()}
          </div>
        </div>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button 
            type="link" 
            size="small"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/orders/${record.id}`)}
          >
            查看
          </Button>
          <Select
            size="small"
            value={String(record.status ?? '')}
            style={{ width: 90 }}
            onChange={(value) => console.log('更新状态:', record.id, value)}
          >
            {orderStatuses.map(status => (
              <Option key={status.value} value={status.value}>
                {status.label}
              </Option>
            ))}
          </Select>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-4">
      {/* 标题区域 */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">订单管理</h1>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={4}>
          <Card>
            <Statistic
              title="总订单数"
              value={statistics.total}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="待付款"
              value={statistics.pending}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="处理中"
              value={statistics.processing}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="已完成"
              value={statistics.completed}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="已取消"
              value={statistics.cancelled}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="总金额"
              value={statistics.totalAmount}
              precision={2}
              prefix="$"
              suffix=" USD"
              valueStyle={{ color: '#f50' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 搜索和筛选 */}
      <Card style={{ marginBottom: 24 }}>
        <Space wrap>
          <Input 
            placeholder="搜索订单号或客户信息..." 
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={handleSearch}
          />
          <Select
            placeholder="订单状态"
            style={{ width: 120 }}
            value={selectedStatus}
            onChange={(value) => setSelectedStatus(value)}
            allowClear
          >
            {orderStatuses.map(status => (
              <Option key={status.value} value={status.value}>
                {status.label}
              </Option>
            ))}
          </Select>
          <Button type="primary" onClick={handleSearch}>搜索</Button>
          <Button onClick={handleReset}>重置</Button>
          <Button
            icon={<ExportOutlined />}
            loading={exportLoading}
            onClick={handleExport}
          >
            导出
          </Button>
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

      {/* 订单列表 */}
      <Card>
        <Table
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
          columns={columns}
          dataSource={orders}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
          }}
          onChange={(paginationInfo) => {
            setSelectedRowKeys([]);
            setPagination({
              current: paginationInfo.current || 1,
              pageSize: paginationInfo.pageSize || 10,
              total: paginationInfo.total || 0
            });
          }}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
}