'use client';

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../lib/api/config';
import {
  Card,
  Button,
  Table,
  Input,
  Select,
  DatePicker,
  Modal,
  Form,
  InputNumber,
  AutoComplete,
  Space,
  Tag,
  Typography,
  Divider,
  Row,
  Col,
  Avatar,
  Image,
  message,
  Popconfirm
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import dayjs, { Dayjs } from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface User {
  id: number;
  username: string;
  phone: string;
  nickname: string;
  avatar?: string;
}

interface Product {
  id: number;
  sku: string;
  name: string;
  price: number;
  original_price: number;
  stock: number;
  main_image: string;
  brand: string;
}

interface Address {
  id: number;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  is_default: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface ProxyOrder {
  id: number;
  order_no: string;
  status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
  remark: string;
  username: string;
  nickname: string;
  phone: string;
}

export default function ProxyOrderPage() {
  const [orders, setOrders] = useState<ProxyOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState({
    order_no: '',
    status: '',
    date_range: null as [Dayjs, Dayjs] | null
  });

  // 代客下单模态框状态
  const [createOrderVisible, setCreateOrderVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userOptions, setUserOptions] = useState<{ value: string; label: string; user: User }[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<number | null>(null);
  const [form] = Form.useForm();

  const router = useRouter();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

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

  // 获取代客下单列表
  const fetchProxyOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.current.toString(),
        limit: pagination.pageSize.toString()
      });

      if (filters.order_no) params.append('order_no', filters.order_no);
      if (filters.status) params.append('status', filters.status);
      if (filters.date_range) {
        params.append('start_date', filters.date_range[0].format('YYYY-MM-DD'));
        params.append('end_date', filters.date_range[1].format('YYYY-MM-DD'));
      }

      const response = await fetch(`${API_BASE_URL}/admin/proxy-order/list?${params}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (data.code === 200) {
        setOrders(data.data.list);
        setPagination(prev => ({ ...prev, total: data.data.total }));
      } else {
        message.error(data.message);
      }
    } catch (error) {
      message.error('获取订单列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 批量删除
  const handleBatchDelete = () => {
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 条订单吗？`,
      okText: '确定删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/admin/proxy-order/batch-delete`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ ids: selectedRowKeys }),
          });
          const data = await res.json();
          if (data.code === 200) {
            message.success('批量删除成功');
            setSelectedRowKeys([]);
            fetchProxyOrders();
          } else {
            message.error(data.message || '批量删除失败');
          }
        } catch (error) {
          message.error('批量删除失败');
        }
      }
    });
  };

  // 搜索用户
  const searchUsers = async (keyword: string) => {
    if (!keyword) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/admin/proxy-order/search-users?keyword=${encodeURIComponent(keyword)}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      
      if (data.code === 200) {
        const options = data.data.list.map((user: User) => ({
          value: `${user.username} (${user.phone})`,
          label: (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Avatar size="small" icon={<UserOutlined />} src={user.avatar} />
              <span style={{ marginLeft: 8 }}>
                {user.nickname || user.username} ({user.phone})
              </span>
            </div>
          ),
          user
        }));
        setUserOptions(options);
      }
    } catch (error) {
      message.error('搜索用户失败');
    }
  };

  // 获取商品列表
  const fetchProducts = async (keyword = '') => {
    setProductLoading(true);
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '50'
      });
      if (keyword) params.append('keyword', keyword);

      const response = await fetch(`${API_BASE_URL}/admin/proxy-order/products?${params}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (data.code === 200) {
        setProducts(data.data.list);
      }
    } catch (error) {
      message.error('获取商品列表失败');
    } finally {
      setProductLoading(false);
    }
  };

  // 获取用户地址
  const fetchUserAddresses = async (userId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/proxy-order/user-addresses?user_id=${userId}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (data.code === 200) {
        setAddresses(data.data.list);
        // 自动选择默认地址
        const defaultAddress = data.data.list.find((addr: Address) => addr.is_default === 1);
        if (defaultAddress) {
          setSelectedAddress(defaultAddress.id);
        }
      }
    } catch (error) {
      message.error('获取用户地址失败');
    }
  };

  // 添加商品到购物车
  const addToCart = (product: Product, quantity: number) => {
    const existingIndex = cart.findIndex(item => item.product.id === product.id);
    
    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += quantity;
      setCart(newCart);
    } else {
      setCart([...cart, { product, quantity }]);
    }
    
    message.success('已添加到购物车');
  };

  // 从购物车移除商品
  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  // 更新购物车商品数量
  const updateCartQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const newCart = cart.map(item => 
      item.product.id === productId 
        ? { ...item, quantity }
        : item
    );
    setCart(newCart);
  };

  // 提交代客下单
  const submitOrder = async (values: any) => {
    if (!selectedUser) {
      message.error('请选择用户');
      return;
    }

    if (cart.length === 0) {
      message.error('购物车不能为空');
      return;
    }

    if (!selectedAddress) {
      message.error('请选择收货地址');
      return;
    }

    try {
      const orderData = {
        user_id: selectedUser.id,
        address_id: selectedAddress,
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity
        })),
        remark: values.remark || ''
      };

      const response = await fetch(`${API_BASE_URL}/admin/proxy-order/create`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(orderData)
      });

      const data = await response.json();

      if (data.code === 200) {
        message.success('代客下单成功');
        setCreateOrderVisible(false);
        resetOrderForm();
        fetchProxyOrders();
      } else {
        message.error(data.message);
      }
    } catch (error) {
      message.error('提交订单失败');
    }
  };

  // 重置下单表单
  const resetOrderForm = () => {
    setSelectedUser(null);
    setCart([]);
    setAddresses([]);
    setSelectedAddress(null);
    form.resetFields();
  };

  // 查看订单详情
  const viewOrderDetail = (orderId: number) => {
    router.push(`/proxy-order/detail/${orderId}`);
  };

  // 表格列配置
  const columns = [
    {
      title: '订单号',
      dataIndex: 'order_no',
      key: 'order_no',
      width: 160,
      render: (text: string) => <Text copyable>{text}</Text>
    },
    {
      title: '用户信息',
      key: 'user',
      width: 200,
      render: (record: ProxyOrder) => (
        <div>
          <Text strong>{record.nickname || record.username}</Text>
          <br />
          <Text type="secondary">{record.phone}</Text>
        </div>
      )
    },
    {
      title: '订单金额',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 120,
      render: (amount: number) => <Text strong>¥{amount.toFixed(2)}</Text>
    },
    {
      title: '订单状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusInfo = statusMap[status as keyof typeof statusMap] || { text: status, color: 'default' };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      }
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (record: ProxyOrder) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => viewOrderDetail(record.id)}
        >
          查看
        </Button>
      )
    }
  ];

  // 计算购物车总金额
  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  };

  useEffect(() => {
    fetchProxyOrders();
  }, [pagination.current, pagination.pageSize]);

  useEffect(() => {
    if (createOrderVisible) {
      fetchProducts();
    }
  }, [createOrderVisible]);

  useEffect(() => {
    if (selectedUser) {
      fetchUserAddresses(selectedUser.id);
    }
  }, [selectedUser]);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">代客下单管理</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateOrderVisible(true)}
        >
          新建代客下单
        </Button>
      </div>

        {/* 筛选条件 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col span={6}>
              <Input
                placeholder="订单号"
                value={filters.order_no}
                onChange={(e) => setFilters(prev => ({ ...prev, order_no: e.target.value }))}
                allowClear
              />
            </Col>
            <Col span={6}>
              <Select
                placeholder="订单状态"
                value={filters.status}
                onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                allowClear
                style={{ width: '100%' }}
              >
                <Select.Option value="pending">待付款</Select.Option>
                <Select.Option value="paid">已付款</Select.Option>
                <Select.Option value="shipped">已发货</Select.Option>
                <Select.Option value="completed">已完成</Select.Option>
                <Select.Option value="cancelled">已取消</Select.Option>
              </Select>
            </Col>
            <Col span={8}>
              <RangePicker
                value={filters.date_range}
                onChange={(dates) => setFilters(prev => ({ ...prev, date_range: dates as [Dayjs, Dayjs] | null }))}
                style={{ width: '100%' }}
              />
            </Col>
            <Col span={4}>
              <Space>
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={fetchProxyOrders}
                >
                  搜索
                </Button>
                <Button
                  onClick={() => {
                    setFilters({ order_no: '', status: '', date_range: null });
                    setSelectedRowKeys([]);
                    setTimeout(fetchProxyOrders, 100);
                  }}
                >
                  重置
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 订单列表 */}
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
            dataSource={orders}
            rowKey="id"
            loading={loading}
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys),
            }}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`,
              onChange: (page, size) => {
                setSelectedRowKeys([]);
                setPagination({ current: page, pageSize: size, total: pagination.total });
              }
            }}
          />
        </Card>

      {/* 创建代客下单模态框 */}
      <Modal
        title="创建代客下单"
        open={createOrderVisible}
        onCancel={() => {
          setCreateOrderVisible(false);
          resetOrderForm();
        }}
        width={1200}
        footer={null}
      >
        <Form form={form} onFinish={submitOrder} layout="vertical">
          <Row gutter={24}>
            {/* 左侧：用户选择和商品选择 */}
            <Col span={16}>
              {/* 选择用户 */}
              <Card size="small" title="选择用户" style={{ marginBottom: 16 }}>
                <AutoComplete
                  style={{ width: '100%' }}
                  options={userOptions}
                  onSearch={searchUsers}
                  onSelect={(value, option) => setSelectedUser(option.user)}
                  placeholder="输入用户名或手机号搜索用户"
                  allowClear
                />
                {selectedUser && (
                  <div style={{ marginTop: 8, padding: 8, background: '#f0f2f5', borderRadius: 4 }}>
                    <Text strong>已选择用户：</Text>
                    <Avatar size="small" icon={<UserOutlined />} src={selectedUser.avatar} style={{ marginLeft: 8 }} />
                    <span style={{ marginLeft: 8 }}>
                      {selectedUser.nickname || selectedUser.username} ({selectedUser.phone})
                    </span>
                  </div>
                )}
              </Card>

              {/* 商品选择 */}
              <Card size="small" title="商品选择" style={{ marginBottom: 16 }}>
                <Input
                  placeholder="搜索商品名称或SKU"
                  suffix={<SearchOutlined />}
                  onPressEnter={(e) => fetchProducts(e.currentTarget.value)}
                  style={{ marginBottom: 16 }}
                />
                
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {products.map(product => (
                    <Card key={product.id} size="small" style={{ marginBottom: 8 }}>
                      <Row align="middle">
                        <Col span={3}>
                          <Image
                            width={40}
                            height={40}
                            src={product.main_image}
                            placeholder
                            style={{ borderRadius: 4 }}
                          />
                        </Col>
                        <Col span={10}>
                          <div>
                            <Text strong>{product.name}</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              SKU: {product.sku} | 库存: {product.stock}
                            </Text>
                          </div>
                        </Col>
                        <Col span={6}>
                          <Text type="danger" strong style={{ fontSize: 16 }}>
                            ¥{product.price}
                          </Text>
                          {product.original_price > product.price && (
                            <div>
                              <Text delete type="secondary" style={{ fontSize: 12 }}>
                                ¥{product.original_price}
                              </Text>
                            </div>
                          )}
                        </Col>
                        <Col span={5}>
                          <Space>
                            <InputNumber
                              min={1}
                              max={product.stock}
                              defaultValue={1}
                              size="small"
                              style={{ width: 60 }}
                              onChange={(value) => {
                                const input = document.querySelector(`[data-product-id="${product.id}"]`) as HTMLInputElement;
                                if (input) input.setAttribute('data-quantity', value?.toString() || '1');
                              }}
                              data-product-id={product.id}
                              data-quantity="1"
                            />
                            <Button
                              type="primary"
                              size="small"
                              icon={<ShoppingCartOutlined />}
                              onClick={() => {
                                const input = document.querySelector(`[data-product-id="${product.id}"]`) as HTMLInputElement;
                                const quantity = parseInt(input?.getAttribute('data-quantity') || '1');
                                addToCart(product, quantity);
                              }}
                            >
                              加入
                            </Button>
                          </Space>
                        </Col>
                      </Row>
                    </Card>
                  ))}
                </div>
              </Card>
            </Col>

            {/* 右侧：购物车和地址选择 */}
            <Col span={8}>
              {/* 购物车 */}
              <Card size="small" title={`购物车 (${cart.length})`} style={{ marginBottom: 16 }}>
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {cart.map(item => (
                    <div key={item.product.id} style={{ marginBottom: 12, padding: 8, background: '#fafafa', borderRadius: 4 }}>
                      <Row align="middle">
                        <Col span={4}>
                          <Image
                            width={30}
                            height={30}
                            src={item.product.main_image}
                            placeholder
                            style={{ borderRadius: 4 }}
                          />
                        </Col>
                        <Col span={12}>
                          <Text style={{ fontSize: 12 }} ellipsis>{item.product.name}</Text>
                          <br />
                          <Text type="danger" style={{ fontSize: 12 }}>¥{item.product.price}</Text>
                        </Col>
                        <Col span={6}>
                          <InputNumber
                            size="small"
                            min={1}
                            max={item.product.stock}
                            value={item.quantity}
                            onChange={(value) => updateCartQuantity(item.product.id, value || 1)}
                            style={{ width: 50 }}
                          />
                        </Col>
                        <Col span={2}>
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => removeFromCart(item.product.id)}
                          />
                        </Col>
                      </Row>
                    </div>
                  ))}
                </div>
                
                <Divider />
                <div style={{ textAlign: 'right' }}>
                  <Text strong style={{ fontSize: 16 }}>
                    总计: ¥{getTotalAmount().toFixed(2)}
                  </Text>
                </div>
              </Card>

              {/* 收货地址选择 */}
              {selectedUser && (
                <Card size="small" title="选择收货地址" style={{ marginBottom: 16 }}>
                  {addresses.map(address => (
                    <div
                      key={address.id}
                      style={{
                        padding: 8,
                        marginBottom: 8,
                        border: selectedAddress === address.id ? '2px solid #1890ff' : '1px solid #d9d9d9',
                        borderRadius: 4,
                        cursor: 'pointer'
                      }}
                      onClick={() => setSelectedAddress(address.id)}
                    >
                      <Text strong>{address.name} {address.phone}</Text>
                      {address.is_default === 1 && <Tag color="blue" style={{ marginLeft: 8 }}>默认</Tag>}
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {address.province}{address.city}{address.district}{address.detail}
                      </Text>
                    </div>
                  ))}
                </Card>
              )}

              {/* 订单备注 */}
              <Form.Item label="订单备注" name="remark">
                <Input.TextArea rows={3} placeholder="可选填写订单备注信息" />
              </Form.Item>

              {/* 提交按钮 */}
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                style={{ width: '100%' }}
                disabled={!selectedUser || cart.length === 0 || !selectedAddress}
              >
                提交代客下单 (¥{getTotalAmount().toFixed(2)})
              </Button>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}