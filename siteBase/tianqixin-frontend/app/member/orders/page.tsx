'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { userApi, getAuthToken } from '../../../lib/api-client';
import { Empty, Table, Tag, Button } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { toast } from 'sonner';

const OrdersPage = () => {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrders = async () => {
      const token = getAuthToken();
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const response = await userApi.getOrders({ page: 1, limit: 20 });
        if (response.code === 200) {
          const list = response.data?.list || response.data?.data || response.data || [];
          setOrders(Array.isArray(list) ? list : []);
        }
      } catch (error) {
        console.error('获取订单失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [router]);

  const handleCancel = async (id: number) => {
    toast.info('取消订单功能开发中，请联系客服');
  };

  const statusMap: Record<string, { text: string; color: string }> = {
    pending: { text: '待处理', color: 'orange' },
    processing: { text: '处理中', color: 'blue' },
    shipped: { text: '已发货', color: 'blue' },
    completed: { text: '已完成', color: 'green' },
    cancelled: { text: '已取消', color: 'gray' },
  };

  const columns = [
    {
      title: '订单编号',
      dataIndex: 'order_no',
      key: 'order_no',
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: '商品数量',
      dataIndex: 'item_count',
      key: 'item_count',
      render: (count: number) => count ?? '-',
    },
    {
      title: '订单金额',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount: number) => <strong>${amount?.toFixed(2)} USD</strong>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const mapping = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={mapping.color}>{mapping.text}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <div className="flex space-x-2">
          <Button size="small" icon={<EyeOutlined />}>查看</Button>
          {record.status === 'pending' && (
            <Button size="small" danger onClick={() => handleCancel(record.id)}>取消</Button>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e60012]"></div>
    </div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">我的订单</h1>

      {orders.length === 0 ? (
        <Empty description="暂无订单" />
      ) : (
        <Table
          columns={columns}
          dataSource={orders}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      )}
    </div>
  );
};

export default OrdersPage;
