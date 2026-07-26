'use client';

import { useState, useEffect } from 'react';
import {
  Button,
  Card,
  Table,
  Input,
  Select,
  Popconfirm,
  message,
  Modal,
  Form,
  Switch,
  Space,
  Upload,
  Tag,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import SeriesApi, { Series } from '../../lib/api/series';
import ModelApi from '../../lib/api/model';
import { apiClient } from '../../lib/api/client';

const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;

// 产品系列管理页面（实际操作 sk_product 表作为 SPU/系列）
export default function SeriesPage() {
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);
  const [form] = Form.useForm();
  const [imageUrl, setImageUrl] = useState('');

  // 获取系列列表
  const fetchSeries = async (page = 1) => {
    setLoading(true);
    try {
      const params: any = {
        page,
        pageSize: pagination.pageSize,
        keyword: searchKeyword,
      };
      if (categoryId) params.category_id = Number(categoryId);
      if (brandId) params.brand_id = Number(brandId);

      const response = await SeriesApi.getList(params);
      setSeriesList(response.list);
      setPagination({ ...pagination, current: page, total: response.total });
    } catch (error) {
      message.error('获取系列列表失败');
      console.error('Failed to fetch series:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取分类和品牌
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
    }
  };

  useEffect(() => {
    fetchSeries();
    fetchBasicData();
  }, []);

  const handleSearch = () => {
    fetchSeries(1);
  };

  const handlePageChange = (page: number, pageSize?: number) => {
    setPagination(prev => ({ ...prev, current: page, pageSize: pageSize || prev.pageSize }));
    fetchSeries(page);
  };

  // 打开编辑/新增弹窗
  const openModal = (record?: Series) => {
    if (record) {
      setEditingSeries(record);
      form.setFieldsValue({
        ...record,
        category_id: record.category_fk_id || record.category_id,
        status: record.status === 1 || record.status === '1',
        is_on_sale: record.is_on_sale === 1,
      });
      setImageUrl(record.image || '');
    } else {
      setEditingSeries(null);
      form.resetFields();
      form.setFieldsValue({ status: true, is_on_sale: true, sort: 0 });
      setImageUrl('');
    }
    setModalVisible(true);
  };

  // 保存系列
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        image: imageUrl,
        status: values.status ? 1 : 0,
        is_on_sale: values.is_on_sale ? 1 : 0,
      };

      if (editingSeries) {
        await SeriesApi.update(editingSeries.id, payload);
        message.success('更新成功');
      } else {
        await SeriesApi.create(payload);
        message.success('创建成功');
      }
      setModalVisible(false);
      fetchSeries(pagination.current);
    } catch (error: any) {
      message.error(error?.message || '保存失败');
    }
  };

  // 删除系列
  const handleDelete = async (id: number) => {
    try {
      await SeriesApi.delete(id);
      message.success('删除成功');
      fetchSeries(pagination.current);
    } catch (error: any) {
      message.error(error?.response?.data?.message || '删除失败');
    }
  };

  // 上传图片
  const uploadImage = async (options: any) => {
    const { file, onSuccess, onError } = options;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/admin/upload/image', formData);
      const data = response.data;
      if (data.code === 200) {
        setImageUrl(data.data.url || data.data);
        onSuccess?.(data.data);
      } else {
        onError?.(new Error(data.message));
      }
    } catch (error) {
      onError?.(error);
    }
  };

  // 表格列定义
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '系列名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Series) => (
        <div>
          <div className="font-medium">{name}</div>
          {record.product_code && (
            <div className="text-xs text-gray-400">{record.product_code}</div>
          )}
        </div>
      ),
    },
    {
      title: 'MPN前缀',
      dataIndex: 'mpn_prefix',
      key: 'mpn_prefix',
      width: 120,
      render: (v: string) => v || '-',
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: any) => category?.name || '-',
    },
    {
      title: '品牌',
      dataIndex: 'brand',
      key: 'brand',
      width: 120,
      render: (brand: any) => brand?.brand_name || '-',
    },
    {
      title: '型号数',
      dataIndex: 'model_count',
      key: 'model_count',
      width: 80,
      render: (count: number) => (
        <Tag color={count > 0 ? 'blue' : 'default'}>{count || 0}</Tag>
      ),
    },
    {
      title: '上架',
      dataIndex: 'is_on_sale',
      key: 'is_on_sale',
      width: 70,
      render: (v: number) => v === 1 ? <Tag color="green">上架</Tag> : <Tag>下架</Tag>,
    },
    {
      title: '排序',
      dataIndex: 'sort',
      key: 'sort',
      width: 60,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: Series) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => openModal(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除该系列吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">产品系列管理</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
          新增系列
        </Button>
      </div>

      <Card className="mb-4">
        <Space>
          <Search
            placeholder="搜索系列名称/型号前缀"
            allowClear
            enterButton="搜索"
            onSearch={handleSearch}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
          <Select
            placeholder="选择分类"
            allowClear
            style={{ width: 160 }}
            onChange={(val) => { setCategoryId(val); handleSearch(); }}
          >
            {categories.map((c: any) => (
              <Option key={c.id} value={c.id}>{c.name || c.category_name}</Option>
            ))}
          </Select>
          <Select
            placeholder="选择品牌"
            allowClear
            style={{ width: 160 }}
            onChange={(val) => { setBrandId(val); handleSearch(); }}
          >
            {brands.map((b: any) => (
              <Option key={b.id} value={b.id}>{b.brand_name || b.name}</Option>
            ))}
          </Select>
          <Button onClick={() => {
            setSearchKeyword('');
            setCategoryId('');
            setBrandId('');
            fetchSeries(1);
          }}>重置</Button>
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={seriesList}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: handlePageChange,
          }}
        />
      </Card>

      <Modal
        title={editingSeries ? '编辑系列' : '新增系列'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        width={700}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="name" label="系列名称" rules={[{ required: true, message: '请输入系列名称' }]}>
            <Input placeholder="如：厚膜贴片电阻系列" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="product_code" label="系列代码">
              <Input placeholder="如：RC0603" />
            </Form.Item>

            <Form.Item name="mpn_prefix" label="MPN前缀">
              <Input placeholder="如：RC0603" />
            </Form.Item>

            <Form.Item name="category_id" label="分类">
              <Select placeholder="请选择分类" allowClear>
                {categories.map((c: any) => (
                  <Option key={c.id} value={c.id}>{c.name || c.category_name}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="brand_id" label="品牌">
              <Select placeholder="请选择品牌" allowClear>
                {brands.map((b: any) => (
                  <Option key={b.id} value={b.id}>{b.brand_name || b.name}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="sort" label="排序">
              <Input type="number" placeholder="数字越小越靠前" />
            </Form.Item>
          </div>

          <Form.Item name="description" label="系列描述">
            <TextArea rows={3} placeholder="请输入系列描述" />
          </Form.Item>

          <Form.Item name="features" label="产品特性">
            <TextArea rows={2} placeholder="请输入产品特性" />
          </Form.Item>

          <Form.Item label="系列图片">
            <Upload
              listType="picture-card"
              showUploadList={false}
              customRequest={uploadImage}
            >
              {imageUrl ? (
                <img src={imageUrl} alt="series" style={{ width: '100%' }} />
              ) : (
                <div>
                  <UploadOutlined />
                  <div style={{ marginTop: 8 }}>上传图片</div>
                </div>
              )}
            </Upload>
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="status" label="状态" valuePropName="checked" initialValue={true}>
              <Switch checkedChildren="启用" unCheckedChildren="停用" />
            </Form.Item>

            <Form.Item name="is_on_sale" label="上架" valuePropName="checked" initialValue={true}>
              <Switch checkedChildren="上架" unCheckedChildren="下架" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
