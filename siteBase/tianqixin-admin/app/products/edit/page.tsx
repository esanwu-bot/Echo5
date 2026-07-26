"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  Upload,
  message,
  Row,
  Col,
  Divider,
  Space,
  Breadcrumb,
  Spin,
  Table,
  Modal,
  Popconfirm,
  Switch,
  Tabs,
  InputNumber,
  Tag,
  DatePicker
} from 'antd';
import {
  ArrowLeftOutlined,
  UploadOutlined,
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileOutlined,
  EyeOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { API_BASE_URL } from '../../../lib/api/config';
import ProductDocumentApi, { DOC_TYPE_OPTIONS, DocType } from '../../../lib/api/productDocument';
import SeriesApi from '../../../lib/api/series';
import RichTextEditor from '../../../components/RichTextEditor';
// import MultiLangInput from '../../../components/MultiLangInput';
import ModelManager from './components/ModelManager';

const { Option } = Select;
const { TextArea } = Input;

export default function ProductEditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams?.get('id');
  const isEdit = !!productId;

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [imageList, setImageList] = useState<any[]>([]);
  const [categoryAttributes, setCategoryAttributes] = useState<any[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('basic');

  // 技术文档相关状态
  const [documents, setDocuments] = useState<any[]>([]);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [documentModalVisible, setDocumentModalVisible] = useState(false);
  const [editingDocument, setEditingDocument] = useState<any>(null);
  const [documentForm] = Form.useForm();
  const [documentFileList, setDocumentFileList] = useState<any[]>([]);

  // Load initial data
  useEffect(() => {
    fetchCategories();
    fetchBrands();
    fetchModels();
    fetchSeriesList();
    fetchActiveSuppliers();
    if (isEdit) {
      fetchProduct();
    }
  }, [productId]);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/admin/categories/tree`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.code === 200) {
        const flatten = (items: any[]): any[] => {
          let res: any[] = [];
          items.forEach(item => {
            res.push(item);
            if (item.children) res = res.concat(flatten(item.children));
          });
          return res;
        };
        setCategories(flatten(data.data));
      }
    } catch (error) {
      console.error('Fetch categories failed', error);
    }
  };

  const fetchBrands = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/admin/brands`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.code === 200) setBrands(data.data.list || data.data);
    } catch (error) {
      console.error('Fetch brands failed', error);
    }
  };

  const fetchModels = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/admin/models`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.code === 200) setModels(data.data.list || data.data);
    } catch (error) {
      console.error('Fetch models failed', error);
    }
  };

  // 获取产品系列列表
  const fetchSeriesList = async () => {
    try {
      const res = await SeriesApi.getList({ pageSize: 1000 });
      setSeriesList(res.list || []);
    } catch (error) {
      console.error('Fetch series failed', error);
    }
  };

  const fetchActiveSuppliers = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/admin/suppliers/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.code === 200) setAllSuppliers(data.data);
    } catch (error) {
      console.error('Fetch suppliers failed', error);
    }
  };

  const fetchCategoryAttributes = async (categoryId: number) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/admin/category-attributes/category/${categoryId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.code === 200) setCategoryAttributes(data.data);
    } catch (error) {
      console.error('Fetch attributes failed', error);
    }
  };

  const onCategoryChange = (val: number) => {
    // Clear old attribute fields from form
    const currentValues = form.getFieldsValue();
    const fieldsToReset = Object.keys(currentValues).filter(key => key.startsWith('attr_'));
    const resetValues: any = {};
    fieldsToReset.forEach(key => {
      resetValues[key] = undefined;
    });
    form.setFieldsValue(resetValues);

    fetchCategoryAttributes(val);
  };

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/admin/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.code === 200) {
        const p = data.data;
        form.setFieldsValue({
          ...p,
          status: p.status === 1 ? 'on_sale' : 'off_sale',
          is_new: p.is_new === 1,
          is_on_sale: p.is_on_sale === 1,
          name: p.name || '',
          description: p.description || ''
        });

        if (p.category_id) fetchCategoryAttributes(p.category_id);

        // 系列ID加载完成后重新获取文档列表
        if (p.series_id) {
          fetchProductDocuments();
        }

        // Handle images - ensure it's an array
        let images = p.images;
        if (typeof images === 'string') {
          try {
            images = JSON.parse(images);
          } catch (e) {
            images = [];
          }
        }
        if (Array.isArray(images) && images.length > 0) {
          setImageList(images.map((url: string, i: number) => ({
            uid: `-${i}`,
            name: `image-${i}`,
            status: 'done',
            url
          })));
        }

        // Set attribute values
        if (p.attributes) {
          const attrValues: any = {};
          p.attributes.forEach((attr: any) => {
            attrValues[`attr_${attr.attribute_id}`] = attr.attribute_value;
          });
          form.setFieldsValue(attrValues);
        }

        // Set suppliers
        if (p.product_suppliers) {
          form.setFieldsValue({
            product_suppliers: p.product_suppliers.map((ps: any) => ({
              supplier_id: ps.supplier_id,
              min_order_quantity: ps.min_order_quantity,
              lead_time: ps.lead_time,
              is_primary: ps.is_primary === 1
            }))
          });
        }

        // Set price breaks
        if (p.product_price_breaks) {
          form.setFieldsValue({
            product_price_breaks: p.product_price_breaks.map((pb: any) => ({
              quantity: pb.quantity,
              price: pb.price
            }))
          });
        }

        // Set features (single Chinese only)
        form.setFieldsValue({
          features: p.features || ''
        });
      } else {
        message.error(data.message || data.msg || '加载商品失败');
        console.error('API Error:', data);
      }
    } catch (error) {
      message.error('加载商品失败: ' + (error instanceof Error ? error.message : '网络错误'));
      console.error('Fetch Product Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取产品技术文档（使用 sk_product_document 表, 以产品所属 series_id 关联）
  const fetchProductDocuments = async () => {
    if (!productId) return;
    const currentSeriesId = form.getFieldValue('series_id');
    if (!currentSeriesId) {
      setDocuments([]);
      return;
    }
    setDocumentLoading(true);
    try {
      const response = await ProductDocumentApi.getList({
        series_id: Number(currentSeriesId),
        pageSize: 100,
      });
      setDocuments(response.list || []);
    } catch (error) {
      console.error('Fetch documents failed', error);
    } finally {
      setDocumentLoading(false);
    }
  };

  // 打开文档编辑弹窗
  const openDocumentModal = (doc?: any) => {
    if (doc) {
      setEditingDocument(doc);
      documentForm.setFieldsValue({
        ...doc,
        status: doc.status === 1,
        doc_type: doc.doc_type || 'datasheet',
        language: doc.language || 'zh-CN',
        version: doc.version || '',
      });
      // 设置文件列表
      if (doc.file_url) {
        setDocumentFileList([{
          uid: '-1',
          name: doc.file_url.split('/').pop() || 'document',
          status: 'done',
          url: doc.file_url,
          response: { url: doc.file_url }
        }]);
      } else {
        setDocumentFileList([]);
      }
    } else {
      setEditingDocument(null);
      documentForm.resetFields();
      documentForm.setFieldsValue({
        status: true,
        language: 'zh-CN',
        doc_type: 'datasheet',
        series_id: Number(form.getFieldValue('series_id')),
      });
      setDocumentFileList([]);
    }
    setDocumentModalVisible(true);
  };

  // 保存文档（使用 sk_product_document 表）
  const handleSaveDocument = async (values: any) => {
    try {
      const fileUrl = documentFileList.length > 0 && documentFileList[0].status === 'done'
        ? (documentFileList[0].response?.url || documentFileList[0].url)
        : undefined;

      if (!fileUrl) {
        message.error('请上传文件');
        return;
      }

      const payload = {
        ...values,
        file_url: fileUrl,
        status: values.status ? 1 : 0,
        series_id: Number(form.getFieldValue('series_id')),
      };

      if (editingDocument) {
        await ProductDocumentApi.update(editingDocument.id, payload);
      } else {
        await ProductDocumentApi.create(payload);
      }

      message.success(editingDocument ? '更新成功' : '创建成功');
      setDocumentModalVisible(false);
      fetchProductDocuments();
    } catch (error: any) {
      console.error('Save document failed', error);
      message.error(error?.message || '保存失败');
    }
  };

  // 删除文档
  const handleDeleteDocument = async (id: number) => {
    try {
      await ProductDocumentApi.delete(id);
      message.success('删除成功');
      fetchProductDocuments();
    } catch (error: any) {
      console.error('Delete document failed', error);
      message.error(error?.message || '删除失败');
    }
  };

  // 获取文件图标
  const getFileIcon = (fileUrl?: string) => {
    if (!fileUrl) return <FileOutlined />;
    const ext = fileUrl.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
    if (['doc', 'docx'].includes(ext || '')) return <FileWordOutlined style={{ color: '#1890ff' }} />;
    if (['xls', 'xlsx'].includes(ext || '')) return <FileExcelOutlined style={{ color: '#52c41a' }} />;
    return <FileOutlined />;
  };

  const handleSave = async (values: any) => {
    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');

      // Extract attributes - correctly map form values starting with attr_ to the attributes array
      const attributes: any[] = [];
      Object.keys(values).forEach(key => {
        if (key.startsWith('attr_') && values[key] !== undefined && values[key] !== null) {
          attributes.push({
            attribute_id: parseInt(key.replace('attr_', '')),
            attribute_value: String(values[key])
          });
        }
      });

      const payload = {
        ...values,
        name: values.name || '',
        description: values.description || '',
        features: values.features || '',
        status: values.status === 'on_sale' ? 1 : 0,
        is_new: values.is_new ? 1 : 0,
        is_on_sale: values.is_on_sale ? 1 : 0,
        images: imageList.map(img => img.url || img.response?.url).filter(url => url != null && url !== ''),
        attributes,
        product_suppliers: (values.product_suppliers || []).map((ps: any) => ({
          ...ps,
          is_primary: ps.is_primary ? 1 : 0
        })),
        product_price_breaks: values.product_price_breaks || []
      };

      const url = isEdit ? `${API_BASE_URL}/admin/products/${productId}` : `${API_BASE_URL}/admin/products`;
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (data.code === 200) {
        message.success('保存成功');
        router.push('/products');
      } else {
        message.error(data.message || '保存失败');
      }
    } catch (error) {
      console.error('Save failed:', error);
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const renderAttributes = () => {
    // console.log('Current category attributes:', categoryAttributes); // Debug log
    return (categoryAttributes || []).map(ca => {
      const attr = ca.attribute;
      if (!attr) return null;

      let input = <Input placeholder={`请输入${attr.name}`} />;

      if (attr.type === 'select') {
        let options = [];
        if (Array.isArray(attr.options)) {
          options = attr.options.map((opt: any) => typeof opt === 'string' ? { label: opt, value: opt } : opt);
        } else if (typeof attr.options === 'string' && attr.options.trim() !== '') {
          // Fallback for comma-separated options
          options = attr.options.split(',').map((opt: string) => ({ label: opt.trim(), value: opt.trim() }));
        }

        input = (
          <Select placeholder={`请选择${attr.name}`} allowClear style={{ width: '100%' }}>
            {options.map((opt: any) => (
              <Option key={opt.value} value={opt.value}>{opt.label}</Option>
            ))}
          </Select>
        );
      } else if (attr.type === 'number' || attr.type === 'range' || attr.data_type === 'number') {
        input = (
          <InputNumber
            style={{ width: '100%' }}
            placeholder={`请输入${attr.name}`}
            addonAfter={attr.unit}
          />
        );
      } else if (attr.unit) {
        input = <Input placeholder={`请输入${attr.name}`} addonAfter={attr.unit} />;
      }

      return (
        <Col xs={24} md={12} key={attr.id}>
          <Form.Item
            name={`attr_${attr.id}`}
            label={attr.name}
            rules={[{ required: ca.is_required === 1, message: `请输入${attr.name}` }]}
          >
            {input}
          </Form.Item>
        </Col>
      );
    });
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;

  const items = [
    {
      key: 'basic',
      label: '基本信息',
      children: (
        <Card>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="name" label="商品名称" rules={[{ required: true }]}>
                <Input placeholder="输入商品名称..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="product_code" label="商品编码" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="mpn_prefix" label="MPN前缀">
                <Input placeholder="如：RC0603" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="category_id" label="分类" rules={[{ required: true }]}>
                <Select onChange={onCategoryChange}>
                  {(categories || []).map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="brand_id" label="品牌">
                <Select>
                  {(brands || []).map(b => <Option key={b.id} value={b.id}>{b.brand_name || b.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="price" label="单价" rules={[{ required: true }]}>
                <InputNumber min={0} precision={4} style={{ width: '100%' }} addonAfter="USD" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="stock" label="库存" rules={[{ required: true }]}>
                <InputNumber min={0} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="is_new" label="是否新品" valuePropName="checked">
                <Switch checkedChildren="是" unCheckedChildren="否" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="is_on_sale" label="状态(上架/下架)" valuePropName="checked" initialValue={true}>
                <Switch checkedChildren="上架" unCheckedChildren="下架" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="description" label="详细描述">
                <RichTextEditor height={400} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="features" label="产品特性">
                <TextArea 
                  rows={6}
                  placeholder="请输入产品特性，每行一个特性，例如：&#10;- 宽电源电压范围：8V 至 85V&#10;- 高输出电流：350mA"
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="商品图片">
                <Upload
                  listType="picture-card"
                  fileList={imageList}
                  onChange={({ fileList }) => setImageList(fileList)}
                  beforeUpload={(file) => {
                    const isImage = file.type.startsWith('image/');
                    if (!isImage) {
                      message.error('只能上传图片文件！');
                    }
                    const isLt5M = file.size / 1024 / 1024 < 5;
                    if (!isLt5M) {
                      message.error('图片大小不能超过 5MB！');
                    }
                    return isImage && isLt5M;
                  }}
                  customRequest={async ({ file, onSuccess, onError }) => {
                    try {
                      const formData = new FormData();
                      formData.append('file', file);
                      const token = localStorage.getItem('auth_token');
                      const response = await fetch(`${API_BASE_URL}/admin/upload/image`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` },
                        body: formData
                      });
                      const data = await response.json();
                      if (data.code === 200) {
                        onSuccess?.(data.data);
                      } else {
                        onError?.(new Error(data.message || '上传失败'));
                      }
                    } catch (error) {
                      onError?.(error as Error);
                    }
                  }}
                >
                  {imageList.length >= 8 ? null : (
                    <div>
                      <PlusOutlined />
                      <div style={{ marginTop: 8 }}>上传图片</div>
                    </div>
                  )}
                </Upload>
              </Form.Item>
            </Col>
          </Row>
        </Card>
      )
    },
    {
      key: 'technical',
      label: '技术参数',
      children: (
        <Card>
          <Row gutter={16}>
            {categoryAttributes.length > 0 ? renderAttributes() : <div style={{ padding: '20px', color: '#999' }}>请先选择分类</div>}
          </Row>
        </Card>
      )
    },
    {
      key: 'ordering',
      label: '订购与价格',
      children: (
        <Card>
          <Divider orientation="left">供应商管理</Divider>
          <Form.List name="product_suppliers">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Row gutter={16} key={key} align="middle" style={{ marginBottom: 8 }}>
                    <Col span={6}>
                      <Form.Item
                        {...restField}
                        name={[name, 'supplier_id']}
                        rules={[{ required: true, message: '请选择供应商' }]}
                      >
                        <Select placeholder="选择供应商">
                          {allSuppliers.map(s => <Option key={s.id} value={s.id}>{s.supplier_name}</Option>)}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={5}>
                      <Form.Item
                        {...restField}
                        name={[name, 'min_order_quantity']}
                        label="最小起订量"
                      >
                        <InputNumber min={1} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={5}>
                      <Form.Item
                        {...restField}
                        name={[name, 'lead_time']}
                        label="交期(天)"
                      >
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item
                        {...restField}
                        name={[name, 'is_primary']}
                        valuePropName="checked"
                        label="首选"
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
                    </Col>
                  </Row>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    添加供应商
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Divider orientation="left">价格阶梯 (Price Ladder)</Divider>
          <Form.List name="product_price_breaks">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Row gutter={16} key={key} align="middle" style={{ marginBottom: 8 }}>
                    <Col span={10}>
                      <Form.Item
                        {...restField}
                        name={[name, 'quantity']}
                        label="起订数量"
                        rules={[{ required: true, message: '请输入数量' }]}
                      >
                        <InputNumber min={1} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={10}>
                      <Form.Item
                        {...restField}
                        name={[name, 'price']}
                        label="单价"
                        rules={[{ required: true, message: '请输入价格' }]}
                      >
                        <InputNumber min={0} precision={4} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
                    </Col>
                  </Row>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    添加价格阶梯
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Card>
      )
    },
    {
      key: 'inventory',
      label: '库存管理',
      children: (
        <Card>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="stock" label="当前库存">
                <InputNumber disabled style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="safety_stock" label="安全库存">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="in_transit_stock" label="在途库存">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      )
    },
    {
      key: 'seo',
      label: 'SEO设置',
      children: (
        <Card>
          <Form.Item name="seo_title" label="SEO标题">
            <Input />
          </Form.Item>
          <Form.Item name="seo_keywords" label="SEO关键词">
            <Input />
          </Form.Item>
          <Form.Item name="seo_description" label="SEO描述">
            <TextArea rows={4} />
          </Form.Item>
        </Card>
      )
    },
    {
      key: 'documents',
      label: '技术文档',
      children: (
        <Card>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>产品技术文档</h3>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => openDocumentModal()}
              disabled={!isEdit}
            >
              添加文档
            </Button>
          </div>
          {!isEdit ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              请先保存商品后再添加技术文档
            </div>
          ) : (
            <Table 
              dataSource={documents}
              loading={documentLoading}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              columns={[
                {
                  title: '文档标题',
                  dataIndex: 'title',
                  key: 'title',
                  render: (text: string, record: any) => (
                    <Space>
                      {getFileIcon(record.file_url)}
                      <span>{text}</span>
                    </Space>
                  )
                },
                {
                  title: '文档类型',
                  dataIndex: 'doc_type',
                  key: 'doc_type',
                  render: (type: string) => type ? <Tag color="blue">{type}</Tag> : '-'
                },
                {
                  title: '语言',
                  dataIndex: 'language',
                  key: 'language',
                  width: 100,
                  render: (lang: string) => lang || '-'
                },
                {
                  title: '版本',
                  dataIndex: 'version',
                  key: 'version',
                  width: 80,
                  render: (ver: string) => ver || '-'
                },
                {
                  title: '状态',
                  dataIndex: 'status',
                  key: 'status',
                  width: 100,
                  render: (status: number) => (
                    <Tag color={status === 1 ? 'success' : 'default'}>
                      {status === 1 ? '启用' : '禁用'}
                    </Tag>
                  )
                },
                {
                  title: '创建时间',
                  dataIndex: 'created_at',
                  key: 'created_at',
                  width: 180,
                  render: (text: string) => text ? text.substring(0, 16).replace('T', ' ') : '-'
                },
                {
                  title: '操作',
                  key: 'action',
                  width: 180,
                  render: (_: any, record: any) => (
                    <Space size="small">
                      {record.file_url && (
                        <Button 
                          type="text" 
                          size="small" 
                          icon={<EyeOutlined />}
                          onClick={() => window.open(record.file_url, '_blank')}
                        >
                          查看
                        </Button>
                      )}
                      <Button 
                        type="text" 
                        size="small" 
                        icon={<EditOutlined />}
                        onClick={() => openDocumentModal(record)}
                      >
                        编辑
                      </Button>
                      <Popconfirm
                        title="确认删除"
                        description="确定要删除这个文档吗？"
                        onConfirm={() => handleDeleteDocument(record.id)}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button 
                          type="text" 
                          danger 
                          size="small" 
                          icon={<DeleteOutlined />}
                        >
                          删除
                        </Button>
                      </Popconfirm>
                    </Space>
                  )
                }
              ]}
            />
          )}
        </Card>
      )
    },
    {
      key: 'model',
      label: '型号管理',
      children: (
        <ModelManager
          productId={productId || undefined}
          productCode={form.getFieldValue('product_code')}
          brandId={form.getFieldValue('brand_id')}
          categoryId={form.getFieldValue('category_id')}
        />
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Breadcrumb items={[{ title: '商品管理' }, { title: isEdit ? '编辑' : '新增' }]} style={{ marginBottom: '16px' }} />
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>返回</Button>
          <h2 style={{ margin: 0 }}>{isEdit ? '编辑商品' : '新增商品'}</h2>
        </Space>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={() => form.submit()}>保存</Button>
      </div>
      <Form form={form} layout="vertical" onFinish={handleSave}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={items} />
      </Form>

      {/* 技术文档编辑弹窗 */}
      <Modal
        title={editingDocument ? '编辑文档' : '添加文档'}
        open={documentModalVisible}
        onOk={() => documentForm.submit()}
        onCancel={() => setDocumentModalVisible(false)}
        width={700}
        destroyOnClose
      >
        <Form
          form={documentForm}
          layout="vertical"
          onFinish={handleSaveDocument}
          style={{ marginTop: 20 }}
        >
          <Form.Item
            name="title"
            label="文档标题"
            rules={[{ required: true, message: '请输入文档标题' }]}
          >
            <Input placeholder="请输入文档标题" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="doc_type"
                label="文档类型"
                rules={[{ required: true, message: '请选择文档类型' }]}
              >
                <Select placeholder="请选择文档类型">
                  <Option value="datasheet">Datasheet</Option>
                  <Option value="application">应用指南</Option>
                  <Option value="manual">用户手册</Option>
                  <Option value="reference">参考设计</Option>
                  <Option value="whitepaper">白皮书</Option>
                  <Option value="technical">技术文档</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="language"
                label="语言"
                rules={[{ required: true, message: '请选择语言' }]}
              >
                <Select placeholder="请选择语言">
                  <Option value="zh-CN">简体中文</Option>
                  <Option value="en-US">English</Option>
                  <Option value="ja-JP">日本語</Option>
                  <Option value="ko-KR">한국어</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="version"
                label="版本号"
              >
                <Input placeholder="如：V1.2" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="sort"
                label="排序"
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="数字越小越靠前" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="file_url"
            label="上传文件"
            extra="支持PDF、Word、Excel、PPT、TXT、ZIP等格式，最大20MB"
            rules={[{ required: true, message: '请上传文件或输入文件URL' }]}
          >
            <Upload
              fileList={documentFileList}
              onChange={({ fileList }) => {
                setDocumentFileList(fileList);
                // 更新表单值
                if (fileList.length > 0 && fileList[0].status === 'done' && fileList[0].response?.url) {
                  documentForm.setFieldsValue({ file_url: fileList[0].response.url });
                } else if (fileList.length === 0) {
                  documentForm.setFieldsValue({ file_url: undefined });
                }
              }}
              beforeUpload={(file) => {
                const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain', 'application/zip', 'application/x-rar-compressed', 'application/x-zip-compressed'];
                const allowedExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'rar'];
                const ext = file.name.split('.').pop()?.toLowerCase() || '';
                
                const isAllowedType = allowedTypes.includes(file.type) || allowedExts.includes(ext);
                if (!isAllowedType) {
                  message.error('不支持的文件格式，请上传PDF、Word、Excel、PPT、TXT或ZIP文件');
                  return false;
                }
                
                const isLt20M = file.size / 1024 / 1024 < 20;
                if (!isLt20M) {
                  message.error('文件大小不能超过20MB');
                  return false;
                }
                return true;
              }}
              customRequest={async ({ file, onSuccess, onError }) => {
                try {
                  const formData = new FormData();
                  formData.append('file', file);
                  const token = localStorage.getItem('auth_token');
                  const response = await fetch(`${API_BASE_URL}/admin/upload/file`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData
                  });
                  const data = await response.json();
                  if (data.code === 200) {
                    onSuccess?.(data.data);
                    // 立即更新表单值
                    documentForm.setFieldsValue({ file_url: data.data.url });
                  } else {
                    onError?.(new Error(data.message || '上传失败'));
                  }
                } catch (error) {
                  onError?.(error as Error);
                }
              }}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>点击上传</Button>
            </Upload>
          </Form.Item>

          <Form.Item
            name="content"
            label="文档描述"
          >
            <TextArea rows={4} placeholder="请输入文档描述内容" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="status"
                label="状态"
                initialValue={1}
              >
                <Select>
                  <Option value={1}>启用</Option>
                  <Option value={0}>禁用</Option>
                </Select>
              </Form.Item>
            </Col>

          </Row>
        </Form>
      </Modal>
    </div>
  );
}