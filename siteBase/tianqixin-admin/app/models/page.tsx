'use client';
import { useState, useEffect } from 'react';
import { Button, Card, Table, Input, Select, Popconfirm, message, Modal } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import ModelApi from '../../lib/api/model';

const { Search } = Input;
const { Option } = Select;

// 型号管理页面
export default function ModelsPage() {
  const router = useRouter();
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // 获取分类和品牌下拉数据
  const fetchBasicData = async () => {
    try {
      const [categoriesData, brandsData] = await Promise.all([
        ModelApi.getCategories(),
        ModelApi.getBrands(),
      ]);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setBrands(Array.isArray(brandsData) ? brandsData : []);
    } catch (error) {
      console.error('Failed to fetch basic data:', error);
      message.error('获取分类或品牌数据失败');
    }
  };

  // 获取型号列表
  const fetchModels = async (page: number = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pagination.pageSize,
        keyword: searchKeyword,
        category_id: categoryId ? Number(categoryId) : undefined,
        brand_id: brandId ? Number(brandId) : undefined,
      };
      
      const response = await ModelApi.getModels(params);
      setModels(response.list);
      setPagination({
        ...pagination,
        current: page,
        total: response.total,
      });
      message.success('获取型号列表成功');
    } catch (error) {
      message.error('获取型号列表失败');
      console.error('Failed to fetch models:', error);
    } finally {
      setLoading(false);
    }
  };

  // 删除型号
  const handleDelete = async (id: number) => {
    try {
      await ModelApi.deleteModel(id);
      message.success('删除型号成功');
      fetchModels(pagination.current);
    } catch (error) {
      message.error('删除型号失败');
      console.error('Failed to delete model:', error);
    }
  };

  // 编辑型号
  const handleEdit = (id: number) => {
    router.push(`/models/edit/${id}`);
  };

  // 新增型号
  const handleAdd = () => {
    router.push('/models/edit');
  };

  // 处理分页变化
  const handlePageChange = (page: number, pageSize?: number) => {
    setSelectedRowKeys([]);
    setPagination(prev => ({
      ...prev,
      current: page,
      pageSize: pageSize || prev.pageSize,
    }));
    fetchModels(page);
  };

  // 处理搜索
  const handleSearch = () => {
    setSelectedRowKeys([]);
    fetchModels(1);
  };

  const handleBatchDelete = () => {
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个型号吗？`,
      okText: '确定删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await ModelApi.batchDeleteModel(selectedRowKeys as (string | number)[]);
          message.success('批量删除成功');
          setSelectedRowKeys([]);
          fetchModels(pagination.current);
        } catch (error) {
          message.error('批量删除失败');
          console.error('Failed to batch delete models:', error);
        }
      }
    });
  };

  // 表格列配置
  const columns = [
    {
      title: '型号编码',
      dataIndex: 'model_code',
      key: 'model_code',
    },
    {
      title: '型号名称',
      dataIndex: 'model_name',
      key: 'model_name',
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (category: any) => category?.category_name || category?.name || '',
    },
    {
      title: '品牌',
      dataIndex: 'brand',
      key: 'brand',
      render: (brand: any) => brand?.brand_name || '',
    },
    {
      title: '系列',
      dataIndex: 'series',
      key: 'series',
      render: (series: any) => series?.series_name || '-',
    },
    {
      title: '封装类型',
      dataIndex: 'package_type',
      key: 'package_type',
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
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <div className="flex space-x-2">
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record.id)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个型号吗？"
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
    fetchModels();
    fetchBasicData();
  }, []);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">型号管理</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增型号
        </Button>
      </div>

      <Card className="mb-4">
        <div className="flex space-x-4">
          <Search
            placeholder="搜索型号编码或名称"
            allowClear
            enterButton="搜索"
            size="middle"
            className="w-64"
            onSearch={handleSearch}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
          <Select
            placeholder="选择分类"
            allowClear
            className="w-48"
            onChange={setCategoryId}
            onSelect={handleSearch}
            onClear={handleSearch}
          >
            {categories.map((category: any) => (
              <Option key={category.id} value={category.id}>
                {category.category_name || category.name}
              </Option>
            ))}
          </Select>
          <Select
            placeholder="选择品牌"
            allowClear
            className="w-48"
            onChange={setBrandId}
            onSelect={handleSearch}
            onClear={handleSearch}
          >
            {brands.map((brand: any) => (
              <Option key={brand.id} value={brand.id}>
                {brand.brand_name || brand.name}
              </Option>
            ))}
          </Select>
          <Button onClick={() => {
            setSearchKeyword('');
            setCategoryId('');
            setBrandId('');
            setSelectedRowKeys([]);
            fetchModels(1);
          }}>重置</Button>
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
          dataSource={models}
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
