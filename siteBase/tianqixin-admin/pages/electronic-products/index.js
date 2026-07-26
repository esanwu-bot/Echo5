// 电子元器件产品管理主页
import { useState, useEffect } from 'react';
import { Table, Button, Space, Input, Modal, Form, Select, InputNumber, message, Switch, Popconfirm, Upload, Image, Card } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { API_BASE_URL } from '../../lib/api/config';

const { Option } = Select;

export default function ElectronicProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [form] = Form.useForm();

  // 获取认证头
  const getAuthHeaders = (includeContentType = true) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';
    const headers = {
      Authorization: `Bearer ${token}`,
    };
    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  };

  // 获取产品列表
  const fetchProducts = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('pageSize', pagination.pageSize);
      if (searchText && searchText.trim() !== '') params.append('keyword', searchText.trim());
      if (selectedCategory) params.append('category_id', selectedCategory);
      if (selectedSubcategory) params.append('subcategory_id', selectedSubcategory);
      if (statusFilter === 'Active') params.append('status', '1');
      if (statusFilter === 'Inactive') params.append('status', '0');

      const res = await fetch(`${API_BASE_URL}/admin/products?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (data.code === 200 || data.success) {
        let list = [];
        if (data.data && Array.isArray(data.data.list)) {
          list = data.data.list;
        } else if (Array.isArray(data.data)) {
          list = data.data;
        } else if (data.data && Array.isArray(data.data.data)) {
          list = data.data.data;
        }

        const mappedList = list.map(item => {
          let imageUrl = '';
          if (item.images) {
            let imagesData = item.images;
            if (typeof imagesData === 'string') {
              try {
                imagesData = JSON.parse(imagesData);
              } catch (e) {
                console.error('Failed to parse images', e);
                imagesData = [];
              }
            }
            if (Array.isArray(imagesData) && imagesData.length > 0) {
              imageUrl = imagesData[0];
            }
          }

          return {
            productId: item.id,
            modelNumber: item.model_code || item.product_code,
            brand: item.brand?.name || item.brand_name || '',
            brand_id: item.brand_id,
            category: item.category?.name || '',
            category_id: item.category_id,
            subCategory: item.subcategory?.name || '',
            subcategory_id: item.subcategory_id,
            name: item.name,
            status: item.status === 1 ? 'Active' : 'Inactive',
            is_new: item.is_new,
            inventory: {
              stock: item.stock || 0,
              minOrderQuantity: item.min_order_quantity || 1,
              leadTime: item.lead_time || 'In Stock'
            },
            pricing: {
              unitPrice: item.price || 0,
              currency: 'USD'
            },
            specs: item.specs || [],
            description: item.description,
            imageUrl: imageUrl,
            package: {
              type: item.package_type,
              packaging: item.packaging_method,
            },
            ...item
          };
        });

        setProducts(mappedList);
        setPagination({
          ...pagination,
          current: page,
          total: data.data?.total || data.total || 0
        });
      } else {
        message.error(data.message || '获取产品列表失败');
      }
    } catch (error) {
      console.error(error);
      message.error('获取产品列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(1);
    fetchBrands();
    fetchCategories();
  }, []);

  const fetchBrands = async () => {
    try {
      const res = await fetch('/api/v1/products/brands');
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.data || []);
      setBrands(list || []);
    } catch (err) {
      // ignore
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/categories`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return;
      const data = await res.json();
      let list = [];
      if (data.data && Array.isArray(data.data.list)) {
        list = data.data.list;
      } else if (data.data && Array.isArray(data.data.data)) {
        list = data.data.data;
      } else if (Array.isArray(data.data)) {
        list = data.data;
      } else if (Array.isArray(data)) {
        list = data;
      }
      setCategories(list);
    } catch (err) {
      console.error('Failed to fetch categories', err);
      setCategories([]);
    }
  };

  const fetchSubcategories = async (parentId) => {
    try {
      if (!parentId) {
        setSubcategories([]);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/admin/categories?parent_id=${parentId}`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return;
      const data = await res.json();

      let list = [];
      if (data.data && Array.isArray(data.data.list)) {
        list = data.data.list;
      } else if (data.data && Array.isArray(data.data.data)) {
        list = data.data.data;
      } else if (Array.isArray(data.data)) {
        list = data.data;
      } else if (Array.isArray(data)) {
        list = data;
      }
      setSubcategories(list);
    } catch (err) {
      console.error('Failed to fetch subcategories', err);
      setSubcategories([]);
    }
  };

  const handleSearch = () => {
    fetchProducts(1);
  };

  const handleResetFilters = () => {
    setSearchText('');
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setStatusFilter('All');
    setSubcategories([]);
    fetchProducts(1);
  };

  const handleDelete = async (productId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/products/${productId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.code === 200 || data.success) {
        message.success('删除成功');
        fetchProducts(pagination.current);
      } else {
        message.error(data.message || '删除失败');
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const showModal = (product = null) => {
    setEditingProduct(product);
    if (product) {
      const formValues = {
        ...product,
        brand_id: product.brand_id,
        category: product.category_id,
        subCategory: product.subcategory_id,
        status: product.status === 'Active' ? 'Active' : (product.status === 1 ? 'Active' : 'Inactive'),
        is_new: !!product.is_new,
        'inventory.stock': product.inventory?.stock,
        'inventory.minOrderQuantity': product.inventory?.minOrderQuantity,
        'inventory.leadTime': product.inventory?.leadTime,
        'pricing.unitPrice': product.pricing?.unitPrice,
        'pricing.currency': product.pricing?.currency,
        'package.type': product.package?.type,
        'package.packaging': product.package?.packaging,
        imageUrl: product.images && product.images.length > 0 ? [{
          uid: '-1',
          name: 'image.png',
          status: 'done',
          url: product.images[0],
        }] : [],
        // 特性字段 - 多语言
        features: product.features || '',
        features: product.features || '',
      };

      let specsData = product.specs;
      if (typeof specsData === 'string' && specsData.trim() !== '') {
        try {
          specsData = JSON.parse(specsData);
        } catch (e) {
          console.error('Failed to parse specs', e);
          specsData = [];
        }
      }

      if (specsData) {
        if (Array.isArray(specsData)) {
          formValues.specs = specsData.map(s => ({
            spec_name: s.spec_name || s.name || '',
            spec_value: s.spec_value || s.value || '',
            unit: s.unit || '',
            sort: s.sort || 0
          }));
        } else if (typeof specsData === 'object') {
          formValues.specs = Object.entries(specsData).map(([k, v]) => ({
            spec_name: k,
            spec_value: typeof v === 'object' ? v.value : v,
            unit: '',
            sort: 0
          }));
        } else {
          formValues.specs = [
            { spec_name: '', spec_value: '', unit: '', sort: 0 },
            { spec_name: '', spec_value: '', unit: '', sort: 0 },
            { spec_name: '', spec_value: '', unit: '', sort: 0 }
          ];
        }
      } else {
        formValues.specs = [
          { spec_name: '', spec_value: '', unit: '', sort: 0 },
          { spec_name: '', spec_value: '', unit: '', sort: 0 },
          { spec_name: '', spec_value: '', unit: '', sort: 0 }
        ];
      }

      form.setFieldsValue(formValues);
      if (product.category_id) {
        fetchSubcategories(product.category_id);
      }
    } else {
      form.resetFields();
      form.setFieldsValue({
        status: 'Active',
        'pricing.currency': 'USD',
        is_new: false,
        specs: [
          { spec_name: '', spec_value: '' },
          { spec_name: '', spec_value: '' },
          { spec_name: '', spec_value: '' }
        ],
        // 特性字段 - 多语言
        features: '',
        features: '',
      });
      setSubcategories([]);
    }
    setIsModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      const url = editingProduct
        ? `${API_BASE_URL}/admin/products/${editingProduct.productId}`
        : `${API_BASE_URL}/admin/products`;

      const method = editingProduct ? 'PUT' : 'POST';

      const payload = {
        name: values.name,
        product_code: values.modelNumber,
        category_id: values.category,
        subcategory_id: values.subCategory,
        brand_id: values.brand_id,
        status: values.status === 'Active' ? 1 : 0,
        is_new: values.is_new ? 1 : 0,
        stock: values['inventory.stock'],
        price: values['pricing.unitPrice'],
        min_order_quantity: values['inventory.minOrderQuantity'],
        lead_time: values['inventory.leadTime'],
        specs: values.specs,
        description: values.description,
        images: values.imageUrl && values.imageUrl.length > 0
          ? [values.imageUrl[0].response ? values.imageUrl[0].response.data.url : values.imageUrl[0].url]
          : [],
        package_type: values.package?.type,
        packaging_method: values.package?.packaging,
        // 特性字段 - 多语言
        features: values.features,
        features: values.features,
      };

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.code === 200 || data.success) {
        message.success(editingProduct ? '更新成功' : '添加成功');
        setIsModalVisible(false);
        form.resetFields();
        fetchProducts(pagination.current);
      } else {
        message.error(data.message || (editingProduct ? '更新失败' : '添加失败'));
      }
    } catch (error) {
      console.error(error);
      message.error(editingProduct ? '更新失败' : '添加失败');
    }
  };

  const columns = [
    {
      title: '产品ID',
      dataIndex: 'productId',
      key: 'productId',
      width: 80,
    },
    {
      title: '图片',
      dataIndex: 'imageUrl',
      key: 'imageUrl',
      width: 100,
      render: (url) => {
        if (!url) return <div style={{ width: 60, height: 60, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>无图片</div>;
        return <Image src={url} width={60} height={60} style={{ objectFit: 'cover' }} />;
      }
    },
    {
      title: '型号',
      dataIndex: 'modelNumber',
      key: 'modelNumber',
      width: 150,
    },
    {
      title: '品牌',
      dataIndex: 'brand',
      key: 'brand',
      width: 120,
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      width: 120,
    },
    {
      title: '子类别',
      dataIndex: 'subCategory',
      key: 'subCategory',
      width: 120,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const statusMap = {
          'Active': '在售',
          'NRND': '逐步淘汰',
          'Obsolete': '已停产',
          'Preview': '预览',
          'Inactive': '下架'
        };
        return statusMap[status] || status;
      }
    },
    {
      title: '新品',
      dataIndex: 'is_new',
      key: 'is_new',
      width: 80,
      render: (isNew) => (isNew ? <span style={{ color: 'green' }}>是</span> : '否')
    },
    {
      title: '库存',
      dataIndex: ['inventory', 'stock'],
      key: 'stock',
      width: 100,
    },
    {
      title: '单价',
      dataIndex: ['pricing', 'unitPrice'],
      key: 'unitPrice',
      width: 120,
      render: (price, record) => `${price} ${record.pricing.currency}`
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="middle">
          <a onClick={() => showModal(record)}>编辑</a>
          <Popconfirm title="确定删除?" onConfirm={() => handleDelete(record.productId)}>
            <a style={{ color: 'red' }}>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '0 24px' }}>
      {/* 搜索和筛选 */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            <Input
              placeholder="搜索产品/型号/关键字"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              suffix={<SearchOutlined />}
              style={{ width: 300 }}
            />
            <Select
              placeholder="主分类"
              allowClear
              style={{ width: 180 }}
              value={selectedCategory}
              onChange={(val) => { setSelectedCategory(val); setSelectedSubcategory(null); fetchSubcategories(val); }}
            >
              {categories.map((c) => (
                <Select.Option key={c.id} value={c.id}>{c.category_name}</Select.Option>
              ))}
            </Select>
            <Select
              placeholder="子分类"
              allowClear
              style={{ width: 180 }}
              value={selectedSubcategory}
              onChange={(val) => setSelectedSubcategory(val)}
            >
              {subcategories.map((s) => (
                <Select.Option key={s.id} value={s.id}>{s.category_name}</Select.Option>
              ))}
            </Select>
            <Select
              placeholder="状态"
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              style={{ width: 140 }}
            >
              <Select.Option value="All">全部</Select.Option>
              <Select.Option value="Active">在售</Select.Option>
              <Select.Option value="Inactive">下架</Select.Option>
            </Select>
            <Button onClick={handleSearch}>搜索</Button>
            <Button onClick={handleResetFilters}>重置</Button>
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
            添加产品
          </Button>
        </div>
      </Card>

      {/* 产品列表 */}
      <Card>
        <Table
          dataSource={products}
          columns={columns}
          loading={loading}
          rowKey="productId"
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
            onChange: (page) => fetchProducts(page)
          }}
        />
      </Card>

      <Modal
        title={editingProduct ? "编辑产品" : "添加产品"}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
          setSubcategories([]);
        }}
        onOk={() => form.submit()}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="modelNumber"
            label="型号"
            rules={[{ required: true, message: '请输入型号' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="brand_id"
            label="品牌"
            rules={[{ required: true, message: '请选择品牌' }]}
          >
            <Select placeholder="请选择品牌" allowClear showSearch optionFilterProp="children">
              {brands.map((b) => (
                <Select.Option key={b.id} value={b.id}>{b.brand_name || b.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="name"
            label="产品名称"
            rules={[{ required: true, message: '请输入产品名称' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="category"
            label="类别"
            rules={[{ required: true, message: '请选择类别' }]}
          >
            <Select onChange={(val) => {
              form.setFieldsValue({ subCategory: undefined });
              fetchSubcategories(val);
            }}>
              {categories.map((c) => (
                <Select.Option key={c.id} value={c.id}>{c.category_name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="subCategory"
            label="子类别"
          >
            <Select allowClear>
              {subcategories.map((s) => (
                <Select.Option key={s.id} value={s.id}>{s.category_name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item
            name="features"
            label="产品特性"
          >
            <Input.TextArea 
              rows={6} 
              placeholder="请输入产品特性，每行一个特性，例如：&#10;- 宽电源电压范围：8V 至 85V&#10;- 高输出电流：350mA"
            />
          </Form.Item>

          <h3>规格 (Specs)</h3>
          <Form.List
            name="specs"
            initialValue={[
              { spec_name: '', spec_value: '', unit: '', sort: 0 },
              { spec_name: '', spec_value: '', unit: '', sort: 0 },
              { spec_name: '', spec_value: '', unit: '', sort: 0 }
            ]}
          >
            {(fields, { add, remove }) => (
              <div>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="start">
                    <Form.Item
                      {...restField}
                      name={[name, 'spec_name']}
                      rules={[{ required: true, message: '请输入规格名称' }]}
                    >
                      <Input placeholder="规格名称" />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'spec_value']}
                    >
                      <Input placeholder="规格值" />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'unit']}
                    >
                      <Input placeholder="单位 (可选)" style={{ width: 100 }} />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'sort']}
                    >
                      <InputNumber min={0} style={{ width: 80 }} />
                    </Form.Item>
                    <Button type="link" danger onClick={() => remove(name)}>删除</Button>
                    {name === fields.length - 1 && (
                      <Button type="link" icon={<PlusOutlined />} onClick={() => {
                        for (let i = 0; i < 3; i++) {
                          add();
                        }
                      }} />
                    )}
                  </Space>
                ))}
              </div>
            )}
          </Form.List>

          <Space size="large">
            <Form.Item
              name="status"
              label="状态"
              rules={[{ required: true, message: '请选择状态' }]}
              style={{ width: 200 }}
            >
              <Select>
                <Option value="Active">在售</Option>
                <Option value="NRND">逐步淘汰</Option>
                <Option value="Obsolete">已停产</Option>
                <Option value="Preview">预览</Option>
                <Option value="Inactive">下架</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="is_new"
              label="是否新品"
              valuePropName="checked"
            >
              <Switch checkedChildren="是" unCheckedChildren="否" />
            </Form.Item>
          </Space>

          <Form.Item
            name="imageUrl"
            label="图片"
            valuePropName="fileList"
            getValueFromEvent={(e) => {
              if (Array.isArray(e)) {
                return e;
              }
              return e && e.fileList;
            }}
          >
            <Upload
              name="file"
              listType="picture-card"
              className="avatar-uploader"
              showUploadList={true}
              action="/admin/upload/image"
              headers={getAuthHeaders(false)}
              maxCount={1}
              onChange={({ file, fileList }) => {
                if (file.status === 'done') {
                  if (file.response && (file.response.code === 200 || file.response.success)) {
                    message.success(`${file.name} 上传成功`);
                  } else {
                    message.error(`${file.name} 上传失败: ${file.response?.message || '未知错误'}`);
                  }
                } else if (file.status === 'error') {
                  message.error(`${file.name} 上传失败`);
                }
              }}
            >
              <div>
                <PlusOutlined />
                <div style={{ marginTop: 8 }}>上传</div>
              </div>
            </Upload>
          </Form.Item>

          <h3>封装信息</h3>
          <Form.Item
            name={['package', 'type']}
            label="封装类型"
          >
            <Input />
          </Form.Item>

          <Form.Item
            name={['package', 'packaging']}
            label="包装方式"
          >
            <Select>
              <Option value="Tape & Reel">卷带</Option>
              <Option value="Tray">托盘</Option>
              <Option value="Bulk">散装</Option>
              <Option value="Tube">管装</Option>
            </Select>
          </Form.Item>

          <h3>库存信息</h3>
          <Form.Item
            name="inventory.stock"
            label="库存数量"
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="inventory.minOrderQuantity"
            label="最小起订量"
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="inventory.leadTime"
            label="供货周期"
          >
            <Input />
          </Form.Item>

          <h3>价格信息</h3>
          <Form.Item
            name="pricing.unitPrice"
            label="单价"
          >
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="pricing.currency"
            label="货币"
          >
            <Select>
              <Option value="USD">美元 (USD)</Option>
              <Option value="CNY">人民币 (CNY)</Option>
              <Option value="EUR">欧元 (EUR)</Option>
              <Option value="JPY">日元 (JPY)</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
