'use client';

import { useState, useEffect } from 'react';
import { Table, Input, Button, Space, Tag, Modal, message, Select, Card, Tabs, Statistic, Descriptions } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, CheckOutlined, CloseOutlined, ShoppingOutlined, ExperimentOutlined } from '@ant-design/icons';
import { API_BASE_URL } from '../../lib/api/config';

const { Option } = Select;
const { TabPane } = Tabs;

interface QuoteRequest {
  id: number;
  company: string;
  contact_name: string;
  email: string;
  phone: string;
  product_info: any[];
  quantity: number;
  message: string;
  status: string;
  reply_content: string;
  reply_time: string;
  created_at: string;
}

interface SampleApply {
  id: number;
  company: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  product_name: string;
  quantity: number;
  purpose: string;
  status: string;
  tracking_number: string;
  reply_content: string;
  created_at: string;
}

// Mock data for quote requests
const mockQuoteRequests = [
  {
    id: 1,
    company: '深圳科技有限公司',
    contact_name: '张经理',
    email: 'zhang@sz-tech.com',
    phone: '138****1234',
    product_info: [
      { name: 'TLV1872', quantity: 1000 },
      { name: 'TLV70033', quantity: 2000 }
    ],
    quantity: 3000,
    message: '需要样品进行测试验证，测试通过后会有大量采购需求',
    status: 'pending',
    reply_content: '',
    reply_time: '',
    created_at: '2024-01-15 10:00:00'
  },
  {
    id: 2,
    company: '北京自动化设备有限公司',
    contact_name: '李工',
    email: 'li@auto-equipment.com',
    phone: '139****5678',
    product_info: [
      { name: 'TMS320F28335', quantity: 500 }
    ],
    quantity: 500,
    message: '用于工业控制器的开发，需确认价格和供货周期',
    status: 'replied',
    reply_content: '您好，样本费用为$100.00 USD/个，预计2周后可以发货。',
    reply_time: '2024-01-16 14:30:00',
    created_at: '2024-01-14 09:15:00'
  }
];

// Mock data for sample applications
const mockSampleApplications = [
  {
    id: 1,
    company: '上海电子科技有限公司',
    contact_name: '王总',
    email: 'wang@sh-electronics.com',
    phone: '137****9012',
    address: '上海市浦东新区陆家嘴金融贸易区世纪大道1号',
    product_name: 'TLV1872评估板',
    quantity: 5,
    purpose: '进行电机控制算法的测试和验证',
    status: 'shipping',
    tracking_number: 'SF1234567890',
    reply_content: '已安排发货，预计明日送达',
    created_at: '2024-01-13 16:20:00'
  },
  {
    id: 2,
    company: '广州智能家居有限公司',
    contact_name: '陈工',
    email: 'chen@gz-iot.com',
    phone: '136****3456',
    address: '广州市天河区天府路123号',
    product_name: 'TLV70033电源管理模块',
    quantity: 10,
    purpose: '智能家居控制系统的电源方案验证',
    status: 'approved',
    tracking_number: '',
    reply_content: '您的样品申请已批准，正在备货中',
    created_at: '2024-01-12 11:45:00'
  }
];

export default function BusinessApplicationsManagement() {
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [sampleApplications, setSampleApplications] = useState<SampleApply[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<QuoteRequest | SampleApply | null>(null);
  const [activeTab, setActiveTab] = useState('quotes');
  const [selectedQuoteKeys, setSelectedQuoteKeys] = useState<React.Key[]>([]);
  const [selectedSampleKeys, setSelectedSampleKeys] = useState<React.Key[]>([]);

  const fetchQuoteRequests = async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      
      const params = new URLSearchParams();
      if (searchText) params.append('keyword', searchText);
      if (selectedStatus) params.append('status', selectedStatus);
      params.append('page', String(pagination.current));
      params.append('limit', String(pagination.pageSize));
      
      const response = await fetch(`${API_BASE_URL}/admin/business-applications/quotes?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.code === 200 && data.data) {
          const quoteList = data.data.list || data.data.items || data.data || [];
          setQuoteRequests(quoteList);
        } else {
          message.error(data.message || '获取报价申请列表失败');
        }
      } else {
        throw new Error('API request failed');
      }
    } catch (error) {
      console.error('Failed to fetch quote requests:', error);
      message.error('获取报价申请列表失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  const fetchSampleApplications = async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      
      const params = new URLSearchParams();
      if (searchText) params.append('keyword', searchText);
      if (selectedStatus) params.append('status', selectedStatus);
      params.append('page', String(pagination.current));
      params.append('limit', String(pagination.pageSize));
      
      const response = await fetch(`${API_BASE_URL}/admin/business-applications/samples?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.code === 200 && data.data) {
          const sampleList = data.data.list || data.data.items || data.data || [];
          setSampleApplications(sampleList);
        } else {
          message.error(data.message || '获取样品申请列表失败');
        }
      } else {
        throw new Error('API request failed');
      }
    } catch (error) {
      console.error('Failed to fetch sample applications:', error);
      message.error('获取样品申请列表失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuoteRequests();
    fetchSampleApplications();
  }, []);

  const handleSearch = () => {
    if (activeTab === 'quotes') {
      fetchQuoteRequests();
    } else {
      fetchSampleApplications();
    }
  };

  const handleReset = () => {
    setSearchText('');
    setSelectedStatus('');
    setSelectedQuoteKeys([]);
    setSelectedSampleKeys([]);
    if (activeTab === 'quotes') {
      fetchQuoteRequests();
    } else {
      fetchSampleApplications();
    }
  };

  const handleBatchDeleteQuotes = () => {
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedQuoteKeys.length} 条报价申请吗？`,
      okText: '确定删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
          const res = await fetch(`${API_BASE_URL}/admin/business-applications/batch-delete-quotes`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ ids: selectedQuoteKeys }),
          });
          const data = await res.json();
          if (data.code === 200) {
            message.success('批量删除成功');
            setSelectedQuoteKeys([]);
            fetchQuoteRequests();
          } else {
            message.error(data.message || '批量删除失败');
          }
        } catch (error) {
          message.error('批量删除失败');
        }
      }
    });
  };

  const handleBatchDeleteSamples = () => {
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedSampleKeys.length} 条样品申请吗？`,
      okText: '确定删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
          const res = await fetch(`${API_BASE_URL}/admin/business-applications/batch-delete-samples`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ ids: selectedSampleKeys }),
          });
          const data = await res.json();
          if (data.code === 200) {
            message.success('批量删除成功');
            setSelectedSampleKeys([]);
            fetchSampleApplications();
          } else {
            message.error(data.message || '批量删除失败');
          }
        } catch (error) {
          message.error('批量删除失败');
        }
      }
    });
  };

  const handleViewDetail = (record: QuoteRequest | SampleApply) => {
    setSelectedRequest(record);
    setIsDetailModalVisible(true);
  };

  const handleStatusUpdate = (record: QuoteRequest | SampleApply, newStatus: string, replyContent?: string) => {
    message.success(`${newStatus === 'approved' ? '批准' : newStatus === 'rejected' ? '拒绝' : '回复'}成功`);
    if (activeTab === 'quotes') {
      fetchQuoteRequests();
    } else {
      fetchSampleApplications();
    }
  };

  const getQuoteStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { text: '待处理', color: 'orange' };
      case 'replied':
        return { text: '已回复', color: 'blue' };
      case 'approved':
        return { text: '已批准', color: 'green' };
      case 'rejected':
        return { text: '已拒绝', color: 'red' };
      default:
        return { text: status, color: 'default' };
    }
  };

  const getSampleStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { text: '待审核', color: 'orange' };
      case 'approved':
        return { text: '已批准', color: 'blue' };
      case 'shipping':
        return { text: '配送中', color: 'cyan' };
      case 'completed':
        return { text: '已完成', color: 'green' };
      case 'rejected':
        return { text: '已拒绝', color: 'red' };
      default:
        return { text: status, color: 'default' };
    }
  };

  const quoteColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '公司信息',
      dataIndex: 'company',
      key: 'company',
      render: (_: any, record: QuoteRequest) => (
        <div>
          <div className="font-medium">{record.company}</div>
          <div className="text-gray-600 text-sm">{record.contact_name} ({record.phone})</div>
          <div className="text-gray-600 text-sm">{record.email}</div>
        </div>
      )
    },
    {
      title: '询价产品',
      dataIndex: 'product_info',
      key: 'products',
      width: 200,
      render: (products: any[]) => (
        <div>
          {products.slice(0, 2).map((product, index) => (
            <Tag key={index} style={{ marginBottom: '2px' }}>
              {product.name} x{product.quantity}
            </Tag>
          ))}
          {products.length > 2 && (
            <Tag>+{products.length - 2}个产品</Tag>
          )}
        </div>
      )
    },
    {
      title: '申请状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const info = getQuoteStatusInfo(status);
        return <Tag color={info.color}>{info.text}</Tag>;
      }
    },
    {
      title: '申请时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (time: string) => (
        <span className="text-sm">
          {new Date(time).toLocaleDateString()}
        </span>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: QuoteRequest) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            查看详情
          </Button>
          {record.status === 'pending' && (
            <>
              <Button
                type="link"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => handleStatusUpdate(record, 'replied')}
              >
                回复
              </Button>
              <Button
                type="link"
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={() => handleStatusUpdate(record, 'rejected')}
              >
                拒绝
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const sampleColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '公司信息',
      dataIndex: 'company',
      key: 'company',
      render: (_: any, record: SampleApply) => (
        <div>
          <div className="font-medium">{record.company}</div>
          <div className="text-gray-600 text-sm">{record.contact_name} ({record.phone})</div>
          <div className="text-gray-600 text-sm">{record.email}</div>
        </div>
      )
    },
    {
      title: '样品信息',
      dataIndex: 'product_name',
      key: 'product',
      width: 200,
      render: (_: any, record: SampleApply) => (
        <div>
          <div className="font-medium">{record.product_name}</div>
          <div className="text-gray-600 text-sm">数量: {record.quantity}</div>
        </div>
      )
    },
    {
      title: '物流信息',
      dataIndex: 'tracking_number',
      key: 'tracking',
      width: 150,
      render: (tracking: string) => tracking ? (
        <span className="font-mono text-sm">{tracking}</span>
      ) : (
        <span className="text-gray-400 text-sm">-</span>
      )
    },
    {
      title: '申请状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const info = getSampleStatusInfo(status);
        return <Tag color={info.color}>{info.text}</Tag>;
      }
    },
    {
      title: '申请时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (time: string) => (
        <span className="text-sm">
          {new Date(time).toLocaleDateString()}
        </span>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: SampleApply) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            查看详情
          </Button>
          {record.status === 'approved' && (
            <Button
              type="link"
              size="small"
              onClick={() => handleStatusUpdate(record, 'shipping')}
            >
              发货
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const statistics = {
    quotes: {
      total: quoteRequests.length,
      pending: quoteRequests.filter(r => r.status === 'pending').length,
      replied: quoteRequests.filter(r => r.status === 'replied').length,
    },
    samples: {
      total: sampleApplications.length,
      pending: sampleApplications.filter(a => a.status === 'pending').length,
      shipping: sampleApplications.filter(a => a.status === 'shipping').length,
      completed: sampleApplications.filter(a => a.status === 'completed').length,
    }
  };

  return (
    <div style={{ padding: '0 24px' }}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">业务申请管理</h1>
        <p className="text-gray-600 mt-2">
          管理客户报价申请和样品申请
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <Card>
          <div className="grid grid-cols-3 gap-4">
            <Statistic title="报价申请总数" value={statistics.quotes.total} />
            <Statistic title="待处理" value={statistics.quotes.pending} valueStyle={{ color: '#fa8c16' }} />
            <Statistic title="已回复" value={statistics.quotes.replied} valueStyle={{ color: '#1890ff' }} />
          </div>
        </Card>
        <Card>
          <div className="grid grid-cols-4 gap-4">
            <Statistic title="样品申请总数" value={statistics.samples.total} />
            <Statistic title="待审核" value={statistics.samples.pending} valueStyle={{ color: '#fa8c16' }} />
            <Statistic title="配送中" value={statistics.samples.shipping} valueStyle={{ color: '#13c2c2' }} />
            <Statistic title="已完成" value={statistics.samples.completed} valueStyle={{ color: '#52c41a' }} />
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <Space wrap>
          <Input
            placeholder={
              activeTab === 'quotes'
                ? "搜索公司、联系人或邮箱..."
                : "搜索公司、联系人或产品..."
            }
            prefix={<SearchOutlined />}
            style={{ width: 350 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={handleSearch}
          />
          <Select
            placeholder="选择状态"
            style={{ width: 120 }}
            value={selectedStatus}
            onChange={(value) => setSelectedStatus(value)}
            allowClear
          >
            {activeTab === 'quotes' ? (
              <>
                <Option value="pending">待处理</Option>
                <Option value="replied">已回复</Option>
                <Option value="approved">已批准</Option>
                <Option value="rejected">已拒绝</Option>
              </>
            ) : (
              <>
                <Option value="pending">待审核</Option>
                <Option value="approved">已批准</Option>
                <Option value="shipping">配送中</Option>
                <Option value="completed">已完成</Option>
                <Option value="rejected">已拒绝</Option>
              </>
            )}
          </Select>
          <Button type="primary" onClick={handleSearch}>搜索</Button>
          <Button onClick={handleReset}>重置</Button>
        </Space>
      </Card>

      {/* Content */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane key="quotes" tab={<span><ShoppingOutlined />报价申请</span>}>
            <div className="mb-4">
              <Space>
                <span>已选择 {selectedQuoteKeys.length} 项</span>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  disabled={selectedQuoteKeys.length === 0}
                  onClick={handleBatchDeleteQuotes}
                >
                  批量删除
                </Button>
              </Space>
            </div>
            <Table
              columns={quoteColumns}
              dataSource={quoteRequests}
              rowKey="id"
              loading={loading}
              scroll={{ x: 1200 }}
              rowSelection={{
                selectedRowKeys: selectedQuoteKeys,
                onChange: (keys) => setSelectedQuoteKeys(keys),
              }}
            />
          </TabPane>
          <TabPane key="samples" tab={<span><ExperimentOutlined />样品申请</span>}>
            <div className="mb-4">
              <Space>
                <span>已选择 {selectedSampleKeys.length} 项</span>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  disabled={selectedSampleKeys.length === 0}
                  onClick={handleBatchDeleteSamples}
                >
                  批量删除
                </Button>
              </Space>
            </div>
            <Table
              columns={sampleColumns}
              dataSource={sampleApplications}
              rowKey="id"
              loading={loading}
              scroll={{ x: 1200 }}
              rowSelection={{
                selectedRowKeys: selectedSampleKeys,
                onChange: (keys) => setSelectedSampleKeys(keys),
              }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* Detail Modal */}
      <Modal
        title={
          activeTab === 'quotes' ? '报价申请详情' : '样品申请详情'
        }
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        footer={null}
        width={700}
      >
        {selectedRequest && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="公司名称">
              {(selectedRequest as any).company}
            </Descriptions.Item>
            <Descriptions.Item label="联系人">
              {(selectedRequest as any).contact_name}
            </Descriptions.Item>
            <Descriptions.Item label="联系电话">
              {(selectedRequest as any).phone}
            </Descriptions.Item>
            <Descriptions.Item label="邮箱">
              {(selectedRequest as any).email}
            </Descriptions.Item>

            {activeTab === 'quotes' ? (
              <>
                <Descriptions.Item label="询价产品">
                  {(selectedRequest as QuoteRequest).product_info.map((product, index) => (
                    <Tag key={index} style={{ marginBottom: '4px' }}>
                      {product.name} x{product.quantity}
                    </Tag>
                  ))}
                </Descriptions.Item>
                <Descriptions.Item label="总数量">
                  {(selectedRequest as QuoteRequest).quantity}
                </Descriptions.Item>
                <Descriptions.Item label="备注信息">
                  {(selectedRequest as QuoteRequest).message}
                </Descriptions.Item>
              </>
            ) : (
              <>
                <Descriptions.Item label="样品产品">
                  {(selectedRequest as SampleApply).product_name}
                </Descriptions.Item>
                <Descriptions.Item label="申请数量">
                  {(selectedRequest as SampleApply).quantity}
                </Descriptions.Item>
                <Descriptions.Item label="申请用途">
                  {(selectedRequest as SampleApply).purpose}
                </Descriptions.Item>
                <Descriptions.Item label="收货地址">
                  {(selectedRequest as SampleApply).address}
                </Descriptions.Item>
                {(selectedRequest as SampleApply).tracking_number && (
                  <Descriptions.Item label="物流单号">
                    {(selectedRequest as SampleApply).tracking_number}
                  </Descriptions.Item>
                )}
              </>
            )}

            <Descriptions.Item label="申请时间">
              {new Date((selectedRequest as any).created_at).toLocaleString()}
            </Descriptions.Item>

            {((selectedRequest as any).reply_content) && (
              <Descriptions.Item label="回复内容">
                {(selectedRequest as any).reply_content}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
