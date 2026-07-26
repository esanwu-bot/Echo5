'use client';

import { useState, useEffect } from 'react';
import { Table, Input, Button, Space, Tag, Card, Avatar, Modal, message, Row, Col } from 'antd';
import { SearchOutlined, UserOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import { API_BASE_URL } from '../../lib/api/config';

type MemberStatus = 'active' | 'disabled';

interface Member {
  id: number;
  username: string;
  email: string;
  phone?: string;
  company?: string;
  country?: string;
  status: MemberStatus;
  total_orders: number;
  total_amount?: number;
  created_at?: string;
}

export default function MemberList() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      
      const params = new URLSearchParams();
      if (searchText) params.append('keyword', searchText);
      params.append('page', String(pagination.current));
      params.append('limit', String(pagination.pageSize));
      
      const response = await fetch(`${API_BASE_URL}/admin/members?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.code === 200 && data.data) {
          const memberList = data.data.list || data.data.items || data.data || [];
          setMembers(memberList);
          
          if (data.data.total) {
            setPagination(prev => ({ ...prev, total: data.data.total }));
          }
        } else {
          message.error(data.message || '获取会员列表失败');
        }
      } else {
        throw new Error('API request failed');
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
      message.error('获取会员列表失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [pagination.current, pagination.pageSize]);

  const handleSearch = () => {
    setSelectedRowKeys([]);
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchMembers();
  };

  const handleReset = () => {
    setSearchText('');
    setSelectedRowKeys([]);
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchMembers();
  };

  const handleBatchDelete = () => {
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个会员吗？`,
      okText: '确定删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
          const response = await fetch(`${API_BASE_URL}/admin/members/batch-delete`, {
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
            fetchMembers();
          } else {
            message.error(data.message || '批量删除失败');
          }
        } catch (error) {
          message.error('批量删除失败');
        }
      }
    });
  };

  const getStatusInfo = (status: MemberStatus) => {
    const statuses: Record<MemberStatus, { label: string; color: string }> = {
      active: { label: '正常', color: 'green' },
      disabled: { label: '禁用', color: 'red' }
    };
    return statuses[status] || { label: '未知状态', color: 'default' };
  };

  const showMemberDetail = (member: Member) => {
    Modal.info({
      title: '会员详情',
      width: 600,
      content: (
        <div style={{ padding: '20px 0' }}>
          <Row gutter={16}>
            <Col span={8} style={{ textAlign: 'center' }}>
              <Avatar size={80} icon={<UserOutlined />} />
              <div style={{ marginTop: 10, fontWeight: 'bold' }}>
                {member.username}
              </div>
            </Col>
            <Col span={16}>
              <div style={{ marginBottom: 12 }}>
                <strong>手机号：</strong>{member.phone}
              </div>
              <div style={{ marginBottom: 12 }}>
                <strong>状态：</strong>
                <Tag color={getStatusInfo(member.status).color}>
                  {getStatusInfo(member.status).label}
                </Tag>
              </div>
              <div style={{ marginBottom: 12 }}>
                <strong>总订单数：</strong>{member.total_orders} 单
              </div>
              <div style={{ marginBottom: 12 }}>
                <strong>总消费金额：</strong>$${member.total_amount?.toFixed(2) || '0.00'} USD
              </div>
              <div>
                <strong>注册时间：</strong>{member.created_at}
              </div>
            </Col>
          </Row>
        </div>
      ),
    });
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '会员信息',
      key: 'member_info',
      width: 200,
      render: (_: any, record: Member) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar 
            size={40} 
            icon={<UserOutlined />}
            style={{ marginRight: 12 }}
          />
          <div>
            <div style={{ fontWeight: 'bold' }}>{record.username}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {record.phone}
            </div>
          </div>
        </div>
      )
    },
    {
      title: '公司',
      dataIndex: 'company',
      key: 'company',
      width: 150,
      render: (company?: string) => company || '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: MemberStatus) => {
        const statusInfo = getStatusInfo(status);
        return <Tag color={statusInfo.color}>{statusInfo.label}</Tag>;
      }
    },
    {
      title: '订单数',
      dataIndex: 'total_orders',
      key: 'total_orders',
      width: 100,
      render: (count: number) => <span style={{ fontWeight: 'bold' }}>{count}</span>
    },
    {
      title: '消费金额',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 120,
      render: (amount?: number) => (
        <span style={{ fontWeight: 'bold', color: '#f50' }}>
          $${amount?.toFixed(2) || '0.00'} USD
        </span>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: Member) => (
        <Space size="small">
          <Button 
            type="link" 
            size="small"
            icon={<EyeOutlined />}
            onClick={() => showMemberDetail(record)}
          >
            详情
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-4">
      {/* 标题区域 */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">会员管理</h1>
      </div>

      {/* 搜索和筛选 */}
      <Card style={{ marginBottom: 24 }}>
        <Space>
          <Input 
            placeholder="搜索会员昵称或手机号..." 
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={handleSearch}
          />
          <Button type="primary" onClick={handleSearch}>搜索</Button>
          <Button onClick={handleReset}>重置</Button>
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

      {/* 会员列表 */}
      <Card>
        <Table
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
          columns={columns}
          dataSource={members}
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
        />
      </Card>
    </div>
  );
}