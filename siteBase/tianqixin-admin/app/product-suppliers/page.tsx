'use client';
import { useState, useEffect } from 'react';
import { Button, Card, Table, Input, Select, Popconfirm, message, Modal, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import ProductSupplierApi from '../../lib/api/productSupplier';
import SupplierApi from '../../lib/api/supplier';
import SeriesApi from '../../lib/api/series';
import { API_BASE_URL } from '../../lib/api/config';

const { Search } = Input;
const { Option } = Select;

// 产品供应商关联管理页面
export default function ProductSuppliersPage() {
  const router = useRouter();
  const [productSuppliers, setProductSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [productId, setProductId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  // 获取产品供应商关联列表
  const fetchProductSuppliers = async (page: number = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pagination.pageSize,
        keyword: searchKeyword,
        product_id: productId ? Number(productId) : undefined,
        supplier_id: supplierId ? Number(supplierId) : undefined,
      };
      
      const response = await ProductSupplierApi.getProductSuppliers(params);
      setProductSuppliers(response.list);
      setPagination({
        ...pagination,
        current: page,
        total: response.total,
      });
    } catch (error) {
      message.error('获取产品供应商关联列表失败');
      console.error('Failed to fetch product suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取产品列表（用于下拉选择）
  const fetchProducts = async () => {
    try {
      const response = await SeriesApi.getList({ pageSize: 100 });
      setProducts(response.list);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  // 获取供应商列表（用于下拉选择）
  const fetchSuppliers = async () => {
    try {
      const response = await SupplierApi.getSuppliers({ limit: 100 });
      setSuppliers(response.list);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  };

  // 删除产品供应商关联
  const handleDelete = async (id: number) => {
    try {
      await ProductSupplierApi.deleteProductSupplier(id);
      message.success('删除产品供应商关联成功');
      fetchProductSuppliers(pagination.current);
    } catch (error) {
      message.error('删除产品供应商关联失败');
      console.error('Failed to delete product supplier:', error);
    }
  };

  // 批量删除产品供应商关联
  const handleBatchDelete = () => {
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 条产品供应商关联吗？`,
      okText: '确定删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
          const res = await fetch(`${API_BASE_URL}/admin/product-suppliers/batch-delete`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ ids: selectedRowKeys }),
          });
          const data = await res.json();
          if (data.code === 200) {
            message.success('批量删除成功');
            setSelectedRowKeys([]);
            fetchProductSuppliers(pagination.current);
          } else {
            message.error(data.message || '批量删除失败');
          }
        } catch (error) {
          message.error('批量删除失败');
        }
      }
    });
  };

  // 编辑产品供应商关联
  const handleEdit = (id: number) => {
    router.push(`/product-suppliers/edit/${id}`);
  };

  // 新增产品供应商关联
  const handleAdd = () => {
    router.push('/product-suppliers/edit');
  };

  // 处理分页变化
  const handlePageChange = (page: number, pageSize?: number) => {
    setSelectedRowKeys([]);
    setPagination(prev => ({
      ...prev,
      current: page,
      pageSize: pageSize || prev.pageSize,
    }));
    fetchProductSuppliers(page);
  };

  // 处理搜索
  const handleSearch = () => {
    setSelectedRowKeys([]);
    fetchProductSuppliers(1);
  };

  // 格式化价格阶梯显示
  const formatPriceBreaks = (priceBreaks: any) => {
    if (!priceBreaks) return '';
    
    return Object.entries(priceBreaks)
      .map(([range, price]) => `${range}: $${Number(price).toFixed(2)} USD`)
      .join(', ');
  };

  // 表格列配置
  const columns = [
    {
      title: '产品名称',
      dataIndex: 'product',
      key: 'product',
      render: (product: any) => product?.name || '',
    },
    {
      title: '供应商名称',
      dataIndex: 'supplier',
      key: 'supplier',
      render: (supplier: any) => supplier?.name || '',
    },
    {
      title: '供应商编码',
      dataIndex: 'supplier',
      key: 'supplier_code',
      render: (supplier: any) => supplier?.supplier_code || '',
    },
    {
      title: '供应商产品编码',
      dataIndex: 'supplier_product_code',
      key: 'supplier_product_code',
    },
    {
      title: '最小订购量',
      dataIndex: 'min_order_quantity',
      key: 'min_order_quantity',
    },
    {
      title: '交货周期(天)',
      dataIndex: 'lead_time',
      key: 'lead_time',
    },
    {
      title: '价格阶梯',
      dataIndex: 'price_breaks',
      key: 'price_breaks',
      render: (priceBreaks: any) => formatPriceBreaks(priceBreaks),
    },
    {
      title: '是否主要供应商',
      dataIndex: 'is_primary',
      key: 'is_primary',
      render: (isPrimary: number) => {
        return isPrimary === 1 ? '是' : '否';
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: number) => {
        return status === 1 ? '启用' : '停用';
      },
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
            title="确定要删除这个产品供应商关联吗？"
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
    fetchProductSuppliers();
    fetchProducts();
    fetchSuppliers();
  }, []);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">产品供应商关联管理</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增关联
        </Button>
      </div>

      <Card className="mb-4">
        <div className="flex space-x-4">
          <Search
            placeholder="搜索产品或供应商名称"
            allowClear
            enterButton="搜索"
            size="middle"
            className="w-64"
            onSearch={handleSearch}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
          <Select
            placeholder="选择产品"
            allowClear
            className="w-48"
            onChange={setProductId}
            onSelect={handleSearch}
            onClear={handleSearch}
          >
            {products.map((product: any) => (
              <Option key={product.id} value={product.id}>
                {product.name}
                {product.product_code && ` (${product.product_code})`}
              </Option>
            ))}
          </Select>
          <Select
            placeholder="选择供应商"
            allowClear
            className="w-48"
            onChange={setSupplierId}
            onSelect={handleSearch}
            onClear={handleSearch}
          >
            {suppliers.map((supplier: any) => (
              <Option key={supplier.id} value={supplier.id}>
                {supplier.name}
                {supplier.supplier_code && ` (${supplier.supplier_code})`}
              </Option>
            ))}
          </Select>
        </div>
      </Card>

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
          dataSource={productSuppliers}
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
            onChange: handlePageChange,
            onShowSizeChange: (current, pageSize) => handlePageChange(current, pageSize),
          }}
        />
      </Card>
    </div>
  );
}
