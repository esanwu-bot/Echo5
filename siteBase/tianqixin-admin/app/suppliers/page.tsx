'use client';
import { useState, useEffect } from 'react';
import { Button, Card, Table, Input, Select, Popconfirm, message, Modal } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import SupplierApi from '../../lib/api/supplier';

const { Search } = Input;
const { Option } = Select;

// 供应商管理页面
export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // 获取供应商列表
  const fetchSuppliers = async (page: number = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pagination.pageSize,
        keyword: searchKeyword,
        status: status ? Number(status) : undefined,
      };
      
      const response = await SupplierApi.getSuppliers(params);
      setSuppliers(response.list);
      setPagination({
        ...pagination,
        current: page,
        total: response.total,
      });
      message.success('获取供应商列表成功');
    } catch (error) {
      message.error('获取供应商列表失败');
      console.error('Failed to fetch suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  // 删除供应商
  const handleDelete = async (id: number) => {
    try {
      await SupplierApi.deleteSupplier(id);
      message.success('删除供应商成功');
      fetchSuppliers(pagination.current);
    } catch (error) {
      message.error('删除供应商失败');
      console.error('Failed to delete supplier:', error);
    }
  };

  // 编辑供应商
  const handleEdit = (id: number) => {
    router.push(`/suppliers/edit/${id}`);
  };

  // 新增供应商
  const handleAdd = () => {
    router.push('/suppliers/edit');
  };

  // 处理分页变化
  const handlePageChange = (page: number, pageSize?: number) => {
    setSelectedRowKeys([]);
    setPagination(prev => ({
      ...prev,
      current: page,
      pageSize: pageSize || prev.pageSize,
    }));
    fetchSuppliers(page);
  };

  // 处理搜索
  const handleSearch = () => {
    setSelectedRowKeys([]);
    fetchSuppliers(1);
  };

  const handleReset = () => {
    setSearchKeyword('');
    setStatus('');
    setSelectedRowKeys([]);
    fetchSuppliers(1);
  };

  const handleBatchDelete = () => {
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个供应商吗？`,
      okText: '确定删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/admin/suppliers/batch-delete`, {
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
            fetchSuppliers(pagination.current);
          } else {
            message.error(data.message || '批量删除失败');
          }
        } catch (error) {
          message.error('批量删除失败');
        }
      }
    });
  };

  // 表格列配置
  const columns = [
    {
      title: '供应商编码',
      dataIndex: 'supplier_code',
      key: 'supplier_code',
    },
    {
      title: '供应商名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '联系人',
      dataIndex: 'contact_person',
      key: 'contact_person',
    },
    {
      title: '联系电话',
      dataIndex: 'contact_phone',
      key: 'contact_phone',
    },
    {
      title: '联系邮箱',
      dataIndex: 'contact_email',
      key: 'contact_email',
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: number) => {
        return status === 1 ? '启用' : '停用';
      },
      filterMultiple: false,
      filters: [
        { text: '启用', value: 1 },
        { text: '停用', value: 0 },
      ],
      onFilter: (value: any, record: any) => record.status === value,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: any) => (
        <div className="flex space-x-2">
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record.id)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个供应商吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  useEffect(() => {
    fetchSuppliers();
  }, []);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">供应商管理</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增供应商
        </Button>
      </div>

      <Card className="mb-4">
        <div className="flex space-x-4">
          <Search
            placeholder="搜索供应商编码或名称"
            allowClear
            enterButton="搜索"
            size="middle"
            className="w-64"
            onSearch={handleSearch}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
          <Select
            placeholder="选择状态"
            allowClear
            className="w-32"
            onChange={setStatus}
            onSelect={handleSearch}
            onClear={handleSearch}
          >
            <Option value="1">启用</Option>
            <Option value="0">停用</Option>
          </Select>
          <Button onClick={handleReset}>重置</Button>
        </div>
      </Card>

      {/* 批量操作 */}
      <div className="mb-4">
        {selectedRowKeys.length > 0 && (
          <div className="flex space-x-2 items-center">
            <span className="text-gray-500">已选择 {selectedRowKeys.length} 项</span>
            <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>批量删除</Button>
          </div>
        )}
      </div>

      <Card>
        <Table
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
          columns={columns}
          dataSource={suppliers}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: handlePageChange,
            onShowSizeChange: (current, pageSize) => handlePageChange(current, pageSize),
          }}
        />
      </Card>
    </div>
  );
}
