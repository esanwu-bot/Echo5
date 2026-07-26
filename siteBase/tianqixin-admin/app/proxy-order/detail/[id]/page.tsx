'use client';

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../../../lib/api/config';
import {
  Card,
  Button,
  Descriptions,
  Table,
  Tag,
  Typography,
  Row,
  Col,
  Avatar,
  Image,
  Spin,
  message,
  Breadcrumb
} from 'antd';
import {
  ArrowLeftOutlined,
  UserOutlined
} from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface OrderDetail {
  id: number;
  order_no: string;
  status: string;
  payment_status: string;
  payment_method: number;
  goods_amount: number;
  delivery_fee: number;
  discount_amount: number;
  total_amount: number;
  created_at: string;
  paid_at: string;
  shipped_at: string;
  completed_at: string;
  remark: string;
  username: string;
  nickname: string;
  user_phone: string;
  avatar: string;
  receiver_name: string;
  receiver_phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  items: OrderItem[];
}

interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  product_image: string;
  spec_name: string;
  price: number;
  quantity: number;
  total_amount: number;
}

export default function ProxyOrderDetailPage() {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useParams();

  const orderId = params?.id as string;

  // 获取认证头
  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  // 订单状态映射
  const statusMap = {
    pending: { text: '待付款', color: 'orange' },
    paid: { text: '已付款', color: 'blue' },
    shipped: { text: '已发货', color: 'cyan' },
    completed: { text: '已完成', color: 'green' },
    cancelled: { text: '已取消', color: 'red' }
  };

  // 支付方式映射
  const paymentMethodMap = {
    1: '微信支付',
    2: '支付宝',
    3: '银行卡'
  };

  // 获取订单详情
  const fetchOrderDetail = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/proxy-order/detail/${orderId}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (data.code === 200) {
        setOrder(data.data);
      } else {
        message.error(data.message);
      }
    } catch (error) {
      message.error('获取订单详情失败');
    } finally {
      setLoading(false);
    }
  };

  // 订单商品表格列配置
  const itemColumns = [
    {
      title: '商品信息',
      key: 'product',
      render: (record: OrderItem) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Image
            width={60}
            height={60}
            src={record.product_image}
            placeholder
            style={{ borderRadius: 4, marginRight: 12 }}
          />
          <div>
            <Text strong>{record.product_name}</Text>
            {record.spec_name && (
              <>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  规格: {record.spec_name}
                </Text>
              </>
            )}
          </div>
        </div>
      )
    },
    {
      title: '单价',
      dataIndex: 'price',
      key: 'price',
      width: 100,
      render: (price: number) => <Text>¥{price.toFixed(2)}</Text>
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      render: (quantity: number) => <Text>{quantity}</Text>
    },
    {
      title: '小计',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 120,
      render: (amount: number) => <Text strong>¥{amount.toFixed(2)}</Text>
    }
  ];

  useEffect(() => {
    if (orderId) {
      fetchOrderDetail();
    }
  }, [orderId]);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Text type="secondary">订单不存在</Text>
      </div>
    );
  }

  const statusInfo = statusMap[order.status as keyof typeof statusMap] || { text: order.status, color: 'default' };

  return (
    <div style={{ padding: 24 }}>
      {/* 面包屑导航 */}
      <div style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => router.back()}
          style={{ marginRight: 16 }}
        >
          返回
        </Button>
        <Breadcrumb items={[
          { title: '代客下单管理' },
          { title: '订单详情' }
        ]} />
      </div>

      <Row gutter={24}>
        <Col span={24}>
          <Card>
            <Title level={4}>
              订单详情 - {order.order_no}
              <Tag color={statusInfo.color} style={{ marginLeft: 12 }}>
                {statusInfo.text}
              </Tag>
            </Title>

            {/* 订单基本信息 */}
            <Card size="small" title="订单信息" style={{ marginBottom: 16 }}>
              <Row gutter={24}>
                <Col span={12}>
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="订单号">
                      <Text copyable>{order.order_no}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="订单状态">
                      <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="支付方式">
                      {paymentMethodMap[order.payment_method as keyof typeof paymentMethodMap] || '未知'}
                    </Descriptions.Item>
                    <Descriptions.Item label="创建时间">
                      {dayjs(order.created_at).format('YYYY-MM-DD HH:mm:ss')}
                    </Descriptions.Item>
                    {order.paid_at && (
                      <Descriptions.Item label="支付时间">
                        {dayjs(order.paid_at).format('YYYY-MM-DD HH:mm:ss')}
                      </Descriptions.Item>
                    )}
                    {order.shipped_at && (
                      <Descriptions.Item label="发货时间">
                        {dayjs(order.shipped_at).format('YYYY-MM-DD HH:mm:ss')}
                      </Descriptions.Item>
                    )}
                    {order.completed_at && (
                      <Descriptions.Item label="完成时间">
                        {dayjs(order.completed_at).format('YYYY-MM-DD HH:mm:ss')}
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                </Col>
                <Col span={12}>
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="商品金额">
                      <Text>¥{order.goods_amount.toFixed(2)}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="运费">
                      <Text>¥{order.delivery_fee.toFixed(2)}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="优惠金额">
                      <Text>-¥{order.discount_amount.toFixed(2)}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="订单总额">
                      <Text strong style={{ fontSize: 16, color: '#f5222d' }}>
                        ¥{order.total_amount.toFixed(2)}
                      </Text>
                    </Descriptions.Item>
                    {order.remark && (
                      <Descriptions.Item label="订单备注">
                        <Text>{order.remark}</Text>
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                </Col>
              </Row>
            </Card>

            {/* 用户信息 */}
            <Card size="small" title="用户信息" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Avatar
                  size={64}
                  icon={<UserOutlined />}
                  src={order.avatar}
                  style={{ marginRight: 16 }}
                />
                <div>
                  <Text strong style={{ fontSize: 16 }}>
                    {order.nickname || order.username}
                  </Text>
                  <br />
                  <Text type="secondary">用户名: {order.username}</Text>
                  <br />
                  <Text type="secondary">手机号: {order.user_phone}</Text>
                </div>
              </div>
            </Card>

            {/* 收货地址 */}
            <Card size="small" title="收货地址" style={{ marginBottom: 16 }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="收货人">
                  {order.receiver_name} {order.receiver_phone}
                </Descriptions.Item>
                <Descriptions.Item label="收货地址">
                  {order.province}{order.city}{order.district}{order.detail}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* 商品信息 */}
            <Card size="small" title="商品明细" style={{ marginBottom: 16 }}>
              <Table
                columns={itemColumns}
                dataSource={order.items}
                rowKey="id"
                pagination={false}
                size="small"
              />
              
              <div style={{ textAlign: 'right', marginTop: 16, padding: 16, background: '#fafafa', borderRadius: 4 }}>
                <Row justify="end">
                  <Col span={8}>
                    <div style={{ marginBottom: 8 }}>
                      <Text>商品金额：</Text>
                      <Text>¥{order.goods_amount.toFixed(2)}</Text>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <Text>运费：</Text>
                      <Text>¥{order.delivery_fee.toFixed(2)}</Text>
                    </div>
                    {order.discount_amount > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <Text>优惠金额：</Text>
                        <Text>-¥{order.discount_amount.toFixed(2)}</Text>
                      </div>
                    )}
                    <div style={{ borderTop: '1px solid #d9d9d9', paddingTop: 8 }}>
                      <Text strong style={{ fontSize: 16 }}>
                        订单总额：¥{order.total_amount.toFixed(2)}
                      </Text>
                    </div>
                  </Col>
                </Row>
              </div>
            </Card>
          </Card>
        </Col>
      </Row>
    </div>
  );
}