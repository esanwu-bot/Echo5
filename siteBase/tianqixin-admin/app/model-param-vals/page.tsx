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
  Space,
  InputNumber,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import ModelParamValApi, { ModelParamVal } from '../../lib/api/modelParamVal';
import ModelApi from '../../lib/api/model';
import { apiClient } from '../../lib/api/client';

const { Search } = Input;
const { Option } = Select;

export default function ModelParamValsPage() {
  const [paramVals, setParamVals] = useState<ModelParamVal[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [modelId, setModelId] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [models, setModels] = useState<any[]>([]);
  const [params, setParams] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingParamVal, setEditingParamVal] = useState<ModelParamVal | null>(null);
  const [form] = Form.useForm();

  const fetchParamVals = async (page = 1) => {
    setLoading(true);
    try {
      const requestParams: any = {
        page,
        pageSize: pagination.pageSize,
      };
      if (modelId) requestParams.model_id = Number(modelId);

      const response = await ModelParamValApi.getList(requestParams);
      setParamVals(response.list);
      setPagination({ ...pagination, current: page, total: response.total });
    } catch (error) {
      message.error('获取参数值列表失败');
      console.error('Failed to fetch param vals:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBasicData = async () => {
    try {
      const [modelsData, attrResponse] = await Promise.all([
        ModelApi.getModels({ limit: 1000 }),
        apiClient.get('/admin/attributes'),
      ]);
      setModels(modelsData.list || []);

      const attrData = attrResponse.data?.data;
      const allParams = Array.isArray(attrData)
        ? attrData
        : attrData?.list || attrData?.items || [];
      setParams(allParams);
    } catch (error) {
      console.error('Failed to fetch basic data:', error);
    }
  };

  useEffect(() => {
    fetchParamVals();
    fetchBasicData();
  }, []);

  const handleSearch = () => {
    fetchParamVals(1);
  };

  const handlePageChange = (page: number, pageSize?: number) => {
    setPagination(prev => ({ ...prev, current: page, pageSize: pageSize || prev.pageSize }));
    fetchParamVals(page);
  };

  const openModal = (record?: ModelParamVal) => {
    if (record) {
      setEditingParamVal(record);
      form.setFieldsValue({
        model_id: record.model_id,
        param_id: record.param_id,
        value: record.value,
        value_numeric: record.value_numeric,
      });
    } else {
      setEditingParamVal(null);
      form.resetFields();
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingParamVal) {
        await ModelParamValApi.update(editingParamVal.id, values);
        message.success('更新成功');
      } else {
        await ModelParamValApi.create(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      fetchParamVals(pagination.current);
    } catch (error: any) {
      message.error(error?.message || '保存失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await ModelParamValApi.delete(id);
      message.success('删除成功');
      fetchParamVals(pagination.current);
    } catch (error) {
      message.error('删除失败');
    }
  };

  const columns = [
    {
      title: '型号',
      dataIndex: 'model',
      key: 'model',
      render: (model: any) => model ? `${model.model_code} (${model.model_name})` : '-',
    },
    {
      title: '参数',
      dataIndex: 'param',
      key: 'param',
      render: (param: any) => param ? `${param.name}${param.unit ? ` (${param.unit})` : ''}` : '-',
    },
    {
      title: '参数值',
      dataIndex: 'value',
      key: 'value',
    },
    {
      title: '数值化',
      dataIndex: 'value_numeric',
      key: 'value_numeric',
      render: (val?: number) => val !== undefined && val !== null ? val : '-',
    },
    {
      title: '创建时间',
      dataIndex: 'create_time',
      key: 'create_time',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: ModelParamVal) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => openModal(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除该参数值吗？"
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
        <h1 className="text-2xl font-bold">型号参数值管理</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
          新增参数值
        </Button>
      </div>

      <Card className="mb-4">
        <Space>
          <Select
            placeholder="选择型号筛选"
            allowClear
            showSearch
            style={{ width: 280 }}
            optionFilterProp="children"
            onChange={(val) => { setModelId(val); fetchParamVals(1); }}
          >
            {models.map((m: any) => (
              <Option key={m.id} value={m.id}>{m.model_code} - {m.model_name}</Option>
            ))}
          </Select>
          <Button onClick={() => {
            setModelId('');
            setSearchKeyword('');
            fetchParamVals(1);
          }}>重置</Button>
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={paramVals}
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
        title={editingParamVal ? '编辑参数值' : '新增参数值'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="model_id"
            label="型号"
            rules={[{ required: true, message: '请选择型号' }]}
          >
            <Select placeholder="请选择型号" showSearch optionFilterProp="children">
              {models.map((m: any) => (
                <Option key={m.id} value={m.id}>{m.model_code} - {m.model_name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="param_id"
            label="参数"
            rules={[{ required: true, message: '请选择参数' }]}
          >
            <Select placeholder="请选择参数" showSearch optionFilterProp="children">
              {params.map((p: any) => (
                <Option key={p.id} value={p.id}>{p.name}{p.unit ? ` (${p.unit})` : ''}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="value"
            label="参数值"
            rules={[{ required: true, message: '请输入参数值' }]}
          >
            <Input placeholder="如：10kΩ ±1%" />
          </Form.Item>

          <Form.Item name="value_numeric" label="数值化参数值">
            <InputNumber style={{ width: '100%' }} placeholder="用于范围筛选，如：10000" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
