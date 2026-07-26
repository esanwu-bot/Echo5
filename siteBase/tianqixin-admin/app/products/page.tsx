"use client";

import { useState, useEffect, useRef } from 'react';
import { Table, Input, Button, Space, Tag, Select, message, Modal, Form, Upload, Card, Row, Col, Popconfirm, Progress, Descriptions, Alert } from 'antd';
import { SearchOutlined, PlusOutlined, UploadOutlined, ImportOutlined, ExportOutlined, DeleteOutlined, EditOutlined, FilterOutlined, DownloadOutlined } from '@ant-design/icons';
import { apiClient } from '../../lib/api/client';
import { API_BASE_URL } from '../../lib/api/config';
import { useRouter } from 'next/navigation';

const { Option } = Select;

export default function ProductList() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [attributes, setAttributes] = useState<any[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [filterForm] = Form.useForm();

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // 导入相关状态
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported_count: number;
    failed_count: number;
    failed_rows: string[];
  } | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    fetchInitialData();
    fetchProducts();
  }, [pagination.current, pagination.pageSize]);

  const fetchInitialData = async () => {
    try {
      const [catRes, brandRes, supplierRes, attrRes] = await Promise.all([
        apiClient.get('/admin/categories/tree'),
        apiClient.get('/admin/brands'),
        apiClient.get('/admin/suppliers'),
        apiClient.get('/admin/attributes')
      ]);

      if (catRes.data.code === 200) setCategories(catRes.data.data);
      if (brandRes.data.code === 200) setBrands(brandRes.data.data.list || brandRes.data.data);
      if (supplierRes.data.code === 200) setSuppliers(supplierRes.data.data.list || supplierRes.data.data);
      if (attrRes.data.code === 200) setAttributes(attrRes.data.data.list || attrRes.data.data);
    } catch (error) {
      console.error('Fetch initial data failed', error);
    }
  };

  // 下载导入模板
  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/admin/products/import/template`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('下载失败');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'product_import_template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error('模板下载失败');
    }
  };

  // 执行导入
  const handleImport = async (file: File) => {
    setImportLoading(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/admin/products/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json();
      if (json.code === 200) {
        setImportResult(json.data);
        fetchProducts();
      } else {
        message.error(json.msg || '导入失败');
      }
    } catch {
      message.error('导入请求失败，请检查网络');
    } finally {
      setImportLoading(false);
    }
    return false; // 阻止 Upload 自动上传
  };

  // 导出产品
  const handleExport = async () => {
    setExportLoading(true);
    try {
      const values = filterForm.getFieldsValue();
      const params = new URLSearchParams();
      Object.entries(values).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
      });
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/admin/products/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('导出失败');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch {
      message.error('导出失败');
    } finally {
      setExportLoading(false);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const values = filterForm.getFieldsValue();
      const filteredValues = Object.fromEntries(
        Object.entries(values).filter(([_, v]) => v !== undefined && v !== null && v !== '' && v !== 'undefined')
      );
      const params = {
        page: pagination.current,
        pageSize: pagination.pageSize,
        ...filteredValues
      };

      const response = await apiClient.get('/admin/products', { params });
      const data = response.data;
      if (data.code === 200) {
        setProducts(data.data.list || data.data);
        setPagination(prev => ({ ...prev, total: data.data.total }));
      }
    } catch (error) {
      message.error('加载商品失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchDelete = () => {
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个商品吗？`,
      onOk: async () => {
        try {
          const response = await apiClient.post('/admin/products/batch-delete', { ids: selectedRowKeys });
          if (response.data.code === 200) {
            message.success('批量删除成功');
            setSelectedRowKeys([]);
            fetchProducts();
          }
        } catch (error) {
          message.error('批量删除失败');
        }
      }
    });
  };

  const handleBatchStatus = (status: number) => {
    Modal.confirm({
      title: `确认批量${status === 1 ? '上架' : '下架'}`,
      content: `确定要${status === 1 ? '上架' : '下架'}选中的 ${selectedRowKeys.length} 个商品吗？`,
      onOk: async () => {
        try {
          const response = await apiClient.post('/admin/products/batch-status', { ids: selectedRowKeys, status });
          if (response.data.code === 200) {
            message.success('操作成功');
            setSelectedRowKeys([]);
            fetchProducts();
          }
        } catch (error) {
          message.error('操作失败');
        }
      }
    });
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    {
      title: '图片',
      dataIndex: 'images',
      key: 'images',
      width: 80,
      render: (images: any) => {
        let imgUrl = '';
        if (Array.isArray(images) && images.length > 0) {
          imgUrl = images[0];
        } else if (typeof images === 'string') {
          try {
            const parsed = JSON.parse(images);
            if (Array.isArray(parsed) && parsed.length > 0) imgUrl = parsed[0];
          } catch (e) { }
        }

        if (!imgUrl && typeof images === 'string' && images.startsWith('http')) {
          imgUrl = images;
        }

        if (!imgUrl) return <div style={{ width: 50, height: 50, background: '#f0f0f0', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>无</div>;

        return <img src={imgUrl} alt="product" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4, border: '1px solid #f0f0f0' }} />;
      }
    },
    { title: '商品名称', dataIndex: 'name', key: 'name', width: 180 },
    { title: '编码', dataIndex: 'product_code', key: 'product_code', width: 140 },
    { title: 'MPN前缀', dataIndex: 'mpn_prefix', key: 'mpn_prefix', width: 100, render: (v: string) => v || '-' },
    { title: '分类', dataIndex: ['category', 'name'], key: 'category', width: 120 },
    {
      title: '品牌',
      key: 'brand',
      width: 120,
      render: (_: any, record: any) => record.brand?.brand_name || record.brand?.name || '-'
    },
    {
      title: '型号数',
      dataIndex: 'seriesModels',
      key: 'model_count',
      width: 80,
      render: (models: any[]) => <Tag color={models?.length > 0 ? 'blue' : 'default'}>{models?.length || 0}</Tag>,
    },
    {
      title: '供应商',
      key: 'suppliers',
      width: 140,
      render: (_, record) => {
        if (!record.product_suppliers || !Array.isArray(record.product_suppliers)) {
          return '-';
        }
        return record.product_suppliers.map((ps: any) => ps.supplier?.name || ps.supplier_id).join(', ');
      }
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      width: 100,
      render: (v: number) => {
        const price = typeof v === 'number' ? v : Number(v)
        return `$${price.toFixed(2)} USD`
      }
    },
    {
      title: '库存',
      dataIndex: 'stock',
      key: 'stock',
      width: 100,
      render: (v: number) => {
        const stock = typeof v === 'number' ? v : Number(v)
        return (
          <span style={{ color: stock <= 0 ? 'red' : 'inherit' }}>
            {stock} {stock <= 0 && <Tag color="error">缺货</Tag>}
          </span>
        )
      }
    },
    {
      title: '状态',
      dataIndex: 'is_on_sale',
      key: 'is_on_sale',
      width: 80,
      render: (v: number) => <Tag color={v === 1 ? 'green' : 'red'}>{v === 1 ? '上架' : '下架'}</Tag>
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      fixed: 'right',
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => router.push(`/products/edit?id=${record.id}`)}>编辑</Button>
          <Popconfirm title="确定删除吗？" onConfirm={async () => {
            await apiClient.delete(`/admin/products/${record.id}`);
            message.success('删除成功');
            fetchProducts();
          }}>
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="p-4">
      {/* 标题区域 */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">商品列表</h1>
        <div className="flex gap-2">
          <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/products/edit')}>新增商品</Button>
          <Button icon={<ImportOutlined />} onClick={() => { setImportResult(null); setImportModalOpen(true); }}>导入</Button>
          <Button icon={<ExportOutlined />} loading={exportLoading} onClick={handleExport}>导出</Button>
        </div>
      </div>

      {/* 筛选区域 */}
      <Card className="mb-4">
        <Form form={filterForm} layout="inline" onFinish={() => { setPagination(p => ({ ...p, current: 1 })); fetchProducts(); }}>
          <Row gutter={[16, 16]} style={{ width: '100%' }}>
            <Col span={6}>
              <Form.Item name="keyword" style={{ width: '100%', marginRight: 0 }}>
                <Input placeholder="名称/编码" prefix={<SearchOutlined />} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="category_id" style={{ width: '100%', marginRight: 0 }}>
                <Select placeholder="分类" allowClear>
                  {(categories || []).map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="brand_id" style={{ width: '100%', marginRight: 0 }}>
                <Select placeholder="品牌" allowClear>
                  {(brands || []).map(b => <Option key={b.id} value={b.id}>{b.brand_name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="status" style={{ width: '100%', marginRight: 0 }}>
                <Select placeholder="状态" allowClear>
                  <Option value={1}>上架</Option>
                  <Option value={0}>下架</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="supplier_id" style={{ width: '100%', marginRight: 0 }}>
                <Select placeholder="供应商" allowClear>
                  {(suppliers || []).map(s => <Option key={s.id} value={s.id}>{s.supplier_name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="inventory_warning" style={{ width: '100%', marginRight: 0 }}>
                <Select placeholder="库存预警" allowClear>
                  <Option value={1}>是</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Space>
                <Button type="primary" htmlType="submit" icon={<FilterOutlined />}>筛选</Button>
                <Button onClick={() => { filterForm.resetFields(); fetchProducts(); }}>重置</Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* 批量操作 */}
      <div className="mb-4">
        {selectedRowKeys.length > 0 && (
          <Space>
            <Button onClick={() => handleBatchStatus(1)}>批量上架</Button>
            <Button onClick={() => handleBatchStatus(0)}>批量下架</Button>
            <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>批量删除</Button>
          </Space>
        )}
      </div>

      {/* 表格区域 */}
      <Card style={{ overflow: 'auto' }}>
        <Table
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
          columns={columns}
          dataSource={products}
          rowKey="id"
          loading={loading}
          tableLayout="fixed"
          style={{ minWidth: 1600 }}
          scroll={{ x: 1600 }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`
        }}
        onChange={(p) => setPagination(prev => ({ ...prev, current: p.current || 1, pageSize: p.pageSize || 10 }))}
      />
      </Card>

      {/* 导入 Modal */}
      <Modal
        title="导入商品数据"
        open={importModalOpen}
        onCancel={() => setImportModalOpen(false)}
        footer={null}
        width={560}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Alert
            type="info"
            showIcon
            message="请先下载模板，按格式填写后上传"
            description="支持 xlsx/xls 格式，单次最多导入 5000 行。商品编码重复的行将被跳过。"
          />
          <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>下载导入模板</Button>

          <Upload
            accept=".xlsx,.xls"
            showUploadList={false}
            beforeUpload={(file) => { handleImport(file); return false; }}
          >
            <Button icon={<ImportOutlined />} loading={importLoading} type="primary">
              {importLoading ? '正在导入...' : '选择文件并导入'}
            </Button>
          </Upload>

          {importResult && (
            <div>
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="导入成功">
                  <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{importResult.imported_count} 条</span>
                </Descriptions.Item>
                <Descriptions.Item label="失败/跳过">
                  <span style={{ color: importResult.failed_count > 0 ? '#ff4d4f' : '#52c41a', fontWeight: 'bold' }}>
                    {importResult.failed_count} 条
                  </span>
                </Descriptions.Item>
              </Descriptions>
              {importResult.failed_rows && importResult.failed_rows.length > 0 && (
                <div style={{ marginTop: 8, maxHeight: 160, overflowY: 'auto', background: '#fff2f0', padding: 8, borderRadius: 4, fontSize: 12 }}>
                  {importResult.failed_rows.map((row, i) => (
                    <div key={i} style={{ color: '#ff4d4f' }}>{row}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Space>
      </Modal>
    </div>
  );
}
