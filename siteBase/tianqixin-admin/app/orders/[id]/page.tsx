'use client';

import { useState, useEffect } from 'react';
import { Card, Descriptions, Tag, Button, Space, Divider, Table, Typography, Row, Col, Statistic, Timeline, message } from 'antd';
import { ArrowLeftOutlined, PrinterOutlined, EditOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';

const { Title, Text } = Typography;

// Mock order data
const mockOrderDetail = {
  id: 1,
  order_no: 'WINE202305112',
  user: { 
    nickname: '张先生', 
    phone: '138****1234',
    email: 'zhang@example.com'
  },
  orderItems: [
    { 
      product_name: '茅台飞天53°', 
      quantity: 1, 
      price: 2680,
      image: '/images/maotai.jpg',
      sku: 'MT-001'
    },
    { 
      product_name: '茅台407', 
      quantity: 1, 
      price: 180,
      image: '/images/maotai407.jpg',
      sku: 'MT-407'
    }
  ],
  total_price: 2860,
  discount: 0,
  shipping_fee: 0,
  final_price: 2860,
  status: 1,
  payment_method: '微信支付',
  payment_time: '2023-05-11 08:15:23',
  shipping_address: {
    name: '张先生',
    phone: '13800138000',
    address: '北京市朝阳区建国门外大街1号国贸大厦A座1001室',
    postal_code: '100004'
  },
  created_at: '2023-05-11 08:12:23',
  updated_at: '2023-05-11 08:15:23',
  order_notes: '请尽快发货，急用',
  tracking_number: 'SF1234567890',
  shipping_company: '顺丰速运'
};

const orderStatuses = [
  { value: '1', label: '待付款', color: 'orange' },
  { value: '2', label: '已付款', color: 'blue' },
  { value: '3', label: '已发货', color: 'cyan' },
  { value: '4', label: '已完成', color: 'green' },
  { value: '5', label: '已取消', color: 'red' }
];

const orderTimeline = [
  {
    time: '2023-05-11 08:12:23',
    status: '订单创建',
    description: '用户提交订单'
  },
  {
    time: '2023-05-11 08:15:23',
    status: '支付成功',
    description: '微信支付完成'
  }
];

export default function OrderDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [order, setOrder] = useState<any>(mockOrderDetail);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOrderDetail();
  }, [params.id]);

  const fetchOrderDetail = () => {
    setLoading(true);
    setTimeout(() => {
      // In a real app, this would be an API call
      setOrder(mockOrderDetail);
      setLoading(false);
    }, 500);
  };

  const getStatusInfo = (status: number) => {
    const statusInfo = orderStatuses.find(s => s.value === status.toString());
    return statusInfo || { label: '未知状态', color: 'default' };
  };

  const productColumns = [
    {
      title: '商品',
      dataIndex: 'product_name',
      key: 'product',
      render: (text: string, record: any) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ 
            width: 50, 
            height: 50, 
            backgroundColor: '#f5f5f5', 
            borderRadius: 4,
            marginRight: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999'
          }}>
            图片
          </div>
          <div>
            <div style={{ fontWeight: 'bold' }}>{text}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>SKU: {record.sku}</div>
          </div>
        </div>
      )
    },
    {
      title: '单价',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => `$${parseFloat(price.toString()).toFixed(2)} USD`
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity'
    },
    {
      title: '小计',
      key: 'subtotal',
      render: (_: any, record: any) => `$${(record.price * record.quantity).toFixed(2)} USD`
    }
  ];

  const handlePrint = () => {
    message.info('打印功能开发中');
  };

  const handleEdit = () => {
    message.info('编辑功能开发中');
  };

  const handleBack = () => {
    router.back();
  };

  const statusInfo = getStatusInfo(order.status);

  return (
    <div style={{ padding: '0 24px' }}>
      {/* 页面头部 */}
      <div style={{ marginBottom: 24 }}>
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />} 
          onClick={handleBack}
          style={{ marginBottom: 16 }}
        >
          返回订单列表
        </Button>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              订单详情
            </Title>
            <Text type="secondary">
              订单号: {order.order_no}
            </Text>
          </div>
          
          <Space>
            <Button icon={<PrinterOutlined />} onClick={handlePrint}>
              打印订单
            </Button>
            <Button type="primary" icon={<EditOutlined />} onClick={handleEdit}>
              编辑订单
            </Button>
          </Space>
        </div>
      </div>

      <Row gutter={16}>
        {/* 左侧信息 */}
        <Col span={16}>
          {/* 订单基本信息 */}
          <Card title="订单信息" style={{ marginBottom: 16 }} loading={loading}>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="订单状态">
                <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="订单金额">
                <Text strong style={{ color: '#f50', fontSize: '16px' }}>
                  $${parseFloat(order.final_price).toFixed(2)} USD
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="下单时间">
                {order.created_at}
              </Descriptions.Item>
              <Descriptions.Item label="支付时间">
                {order.payment_time}
              </Descriptions.Item>
              <Descriptions.Item label="支付方式">
                {order.payment_method}
              </Descriptions.Item>
              <Descriptions.Item label="客户备注">
                {order.order_notes || '无'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 商品信息 */}
          <Card title="商品信息" style={{ marginBottom: 16 }} loading={loading}>
            <Table
              columns={productColumns}
              dataSource={order.orderItems}
              rowKey="sku"
              pagination={false}
              summary={() => (
                <Table.Summary>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={3}>
                      <div style={{ textAlign: 'right', fontWeight: 'bold' }}>
                        总计:
                      </div>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1}>
                      <Text strong style={{ color: '#f50', fontSize: '16px' }}>
                        $${parseFloat(order.total_price).toFixed(2)} USD
                      </Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={3}>
                      <div style={{ textAlign: 'right' }}>
                        优惠:
                      </div>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1}>
                      -$${parseFloat(order.discount).toFixed(2)} USD
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={3}>
                      <div style={{ textAlign: 'right' }}>
                        运费:
                      </div>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1}>
                      $${parseFloat(order.shipping_fee).toFixed(2)} USD
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={3}>
                      <div style={{ textAlign: 'right', fontWeight: 'bold' }}>
                        实付金额:
                      </div>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1}>
                      <Text strong style={{ color: '#f50', fontSize: '16px' }}>
                        $${parseFloat(order.final_price).toFixed(2)} USD
                      </Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </Card>

          {/* 配送信息 */}
          <Card title="配送信息" loading={loading}>
            <Descriptions column={1} bordered>
              <Descriptions.Item label="收货人">
                {order.shipping_address.name}
              </Descriptions.Item>
              <Descriptions.Item label="联系电话">
                {order.shipping_address.phone}
              </Descriptions.Item>
              <Descriptions.Item label="收货地址">
                {order.shipping_address.address}
              </Descriptions.Item>
              <Descriptions.Item label="邮政编码">
                {order.shipping_address.postal_code}
              </Descriptions.Item>
              {order.tracking_number && (
                <Descriptions.Item label="物流信息">
                  <div>
                    <div>快递公司: {order.shipping_company}</div>
                    <div>运单号: {order.tracking_number}</div>
                  </div>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>

        {/* 右侧信息 */}
        <Col span={8}>
          {/* 客户信息 */}
          <Card title="客户信息" style={{ marginBottom: 16 }} loading={loading}>
            <Descriptions column={1}>
              <Descriptions.Item label="客户姓名">
                {order.user.nickname}
              </Descriptions.Item>
              <Descriptions.Item label="联系电话">
                {order.user.phone}
              </Descriptions.Item>
              <Descriptions.Item label="邮箱">
                {order.user.email}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 订单统计 */}
          <Card title="订单统计" style={{ marginBottom: 16 }} loading={loading}>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="商品数量"
                  value={order.orderItems.reduce((sum: number, item: any) => sum + item.quantity, 0)}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="商品种类"
                  value={order.orderItems.length}
                />
              </Col>
            </Row>
            <Divider style={{ margin: '16px 0' }} />
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="订单金额"
                  value={order.total_price}
                  precision={2}
                  prefix="$"
                  suffix=" USD"
                  valueStyle={{ color: '#f50' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="实付金额"
                  value={order.final_price}
                  precision={2}
                  prefix="$"
                  suffix=" USD"
                  valueStyle={{ color: '#f50' }}
                />
              </Col>
            </Row>
          </Card>

          {/* 订单时间线 */}
          <Card title="订单进度" loading={loading}>
            <Timeline
              items={orderTimeline.map((item, index) => ({
                key: index,
                children: (
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{item.status}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {item.time}
                    </div>
                    <div style={{ fontSize: '12px' }}>{item.description}</div>
                  </div>
                )
              }))}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}