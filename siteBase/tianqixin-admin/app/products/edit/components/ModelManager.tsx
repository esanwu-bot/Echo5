"use client";

import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  InputNumber,
  message,
  Row,
  Col,
  Divider,
  Space,
  Table,
  Popconfirm,
  Tag
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { API_BASE_URL } from '../../../../lib/api/config';

const { Option } = Select;

interface ModelManagerProps {
  productId?: string;
  productCode?: string;
  modelId?: number;
  brandId?: number;
  categoryId?: number;
}

interface ProductModel {
  id?: number;
  model_code: string;
  model_name: string;
  pin_count?: number;
  stock?: number;
  packaging_spec?: string;
  operating_temperature?: string;
  material_type?: string;
  pin_plating?: string;
  moq?: number;
  lead_time?: number;
  package_type?: string;
  status?: string;
}

export default function ModelManager({ productId, productCode, modelId, brandId, categoryId }: ModelManagerProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [models, setModels] = useState<ProductModel[]>([]);
  const [editingModel, setEditingModel] = useState<ProductModel | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Load models when component mounts
  useEffect(() => {
    if (productId) {
      fetchProductModels();
    } else if (modelId) {
      // If product has a model_id, fetch that specific model
      fetchModelById(modelId);
    }
  }, [productId, modelId]);

  const fetchProductModels = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      // Fetch models by product or category/brand
      const response = await fetch(`${API_BASE_URL}/admin/models?category_id=${categoryId || ''}&brand_id=${brandId || ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.code === 200) {
        setModels(data.data.list || []);
      }
    } catch (error) {
      console.error('Fetch models failed', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchModelById = async (id: number) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/admin/models/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.code === 200) {
        setModels([data.data]);
      }
    } catch (error) {
      console.error('Fetch model failed', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddModel = () => {
    setEditingModel(null);
    setIsEditing(true);
    form.resetFields();
    // Set default values
    form.setFieldsValue({
      model_code: productCode ? `${productCode}-` : '',
      status: 'Active',
      stock: 0,
      pin_count: 0,
      moq: 1,
      lead_time: 0,
      material_type: '量产',
      operating_temperature: '-40 to 125',
      pin_plating: 'NIPDAU'
    });
  };

  const handleEditModel = (model: ProductModel) => {
    setEditingModel(model);
    setIsEditing(true);
    form.setFieldsValue(model);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingModel(null);
    form.resetFields();
  };

  const handleSaveModel = async (values: ProductModel) => {
    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      const url = editingModel?.id 
        ? `${API_BASE_URL}/admin/models/${editingModel.id}` 
        : `${API_BASE_URL}/admin/models`;
      const method = editingModel?.id ? 'PUT' : 'POST';

      const payload = {
        ...values,
        brand_id: brandId,
        category_id: categoryId
      };

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
        message.success(editingModel ? '更新成功' : '创建成功');
        setIsEditing(false);
        setEditingModel(null);
        fetchProductModels();
      } else {
        message.error(data.message || '保存失败');
      }
    } catch (error) {
      console.error('Save model failed', error);
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteModel = async (id: number) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/admin/models/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.code === 200) {
        message.success('删除成功');
        fetchProductModels();
      } else {
        message.error(data.message || '删除失败');
      }
    } catch (error) {
      console.error('Delete model failed', error);
      message.error('删除失败');
    }
  };

  const columns = [
    {
      title: '型号编码',
      dataIndex: 'model_code',
      key: 'model_code',
      render: (text: string) => <Tag color="blue">{text}</Tag>
    },
    {
      title: '型号名称',
      dataIndex: 'model_name',
      key: 'model_name'
    },
    {
      title: '封装',
      dataIndex: 'package_type',
      key: 'package_type'
    },
    {
      title: '引脚数',
      dataIndex: 'pin_count',
      key: 'pin_count',
      width: 80
    },
    {
      title: '库存',
      dataIndex: 'stock',
      key: 'stock',
      width: 80,
      render: (stock: number) => (
        <Tag color={stock > 0 ? 'success' : 'error'}>{stock || 0}</Tag>
      )
    },
    {
      title: '包装规格',
      dataIndex: 'packaging_spec',
      key: 'packaging_spec'
    },
    {
      title: '工作温度',
      dataIndex: 'operating_temperature',
      key: 'operating_temperature',
      width: 120
    },
    {
      title: '材料类型',
      dataIndex: 'material_type',
      key: 'material_type',
      width: 100
    },
    {
      title: 'MOQ',
      dataIndex: 'moq',
      key: 'moq',
      width: 80
    },
    {
      title: '交期(天)',
      dataIndex: 'lead_time',
      key: 'lead_time',
      width: 90
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: ProductModel) => (
        <Space size="small">
          <Button 
            type="text" 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => handleEditModel(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这个型号吗？"
            onConfirm={() => handleDeleteModel(record.id!)}
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
  ];

  return (
    <Card>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>产品型号管理</h3>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={handleAddModel}
        >
          添加型号
        </Button>
      </div>

      {isEditing ? (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveModel}
          style={{ marginTop: 20 }}
        >
          <Divider orientation="left">基本信息</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item 
                name="model_code" 
                label="型号编码" 
                rules={[{ required: true, message: '请输入型号编码' }]}
              >
                <Input placeholder="如: SC-PMU101-A" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item 
                name="model_name" 
                label="型号名称" 
                rules={[{ required: true, message: '请输入型号名称' }]}
              >
                <Input placeholder="如: PMU101 A版本" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label="状态">
                <Select>
                  <Option value="Active">启用</Option>
                  <Option value="Inactive">禁用</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">封装与物理特性</Divider>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="package_type" label="封装类型">
                <Input placeholder="如: VQFN (RHA)" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="pin_count" label="引脚数量">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="pin_plating" label="引脚镀层">
                <Input placeholder="如: NIPDAU" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="material_type" label="材料类型">
                <Select placeholder="选择材料类型" allowClear>
                  <Option value="量产">量产</Option>
                  <Option value="定制">定制</Option>
                  <Option value="样品">样品</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">库存与订购信息</Divider>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="stock" label="库存数量">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="moq" label="最小起订量(MOQ)">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="lead_time" label="交期(天)">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="packaging_spec" label="包装规格">
                <Input placeholder="如: Tube: 100pcs/tube" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">环境参数</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="operating_temperature" label="工作温度范围(°C)">
                <Input placeholder="如: -40 to 125" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="description" label="描述">
                <Input.TextArea rows={2} placeholder="型号描述..." />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button icon={<CloseOutlined />} onClick={handleCancelEdit}>
              取消
            </Button>
            <Button type="primary" icon={<SaveOutlined />} loading={saving} htmlType="submit">
              {editingModel ? '更新' : '创建'}
            </Button>
          </div>
        </Form>
      ) : (
        <Table
          dataSource={models}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1200 }}
        />
      )}
    </Card>
  );
}
