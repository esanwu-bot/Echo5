'use client';
import { useState, useEffect } from 'react';
import { Button, Card, Table, Input, Select, Popconfirm, message, Modal, Form, InputNumber, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import ProductAlternateApi from '../../lib/api/product-alternate';
import ModelApi from '../../lib/api/model';

const { Option } = Select;
const { Search } = Input;
const { TextArea } = Input;

export default function ProductAlternatesPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<any[]>([]);
  const [searchModelId, setSearchModelId] = useState<number | undefined>();
  const [searchMatchType, setSearchMatchType] = useState<string | undefined>();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchList = async (page: number = 1) => {
    setLoading(true);
    try {
      const params: any = { page, pageSize: pagination.pageSize };
      if (searchModelId) params.model_id = searchModelId;
      if (searchMatchType) params.match_type = searchMatchType;
      const res = await ProductAlternateApi.getList(params);
      setData(res.list);
      setPagination(prev => ({ ...prev, current: page, total: res.total }));
    } catch {
      message.error('获取列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchModels = async () => {
    try {
      const res = await ModelApi.getModels({ limit: 1000 });
      setModels(res.list || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchModels();
    fetchList();
  }, []);

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = async (id: number) => {
    try {
      const item = await ProductAlternateApi.getById(id);
      setEditingId(id);
      form.setFieldsValue(item);
      setModalOpen(true);
    } catch {
      message.error('获取详情失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await ProductAlternateApi.delete(id);
      message.success('删除成功');
      fetchList(pagination.current);
    } catch {
      message.error('删除失败');
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (editingId) {
        await ProductAlternateApi.update(editingId, values);
        message.success('更新成功');
      } else {
        await ProductAlternateApi.create(values);
        message.success('添加成功');
      }
      setModalOpen(false);
      fetchList(pagination.current);
    } catch (err: any) {
      if (err?.message) message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '原型号',
      key: 'model',
      width: 180,
      render: (_: any, record: any) => record.model?.model_code || `ID:${record.model_id}`,
    },
    {
      title: '替代型号',
      key: 'alternateModel',
      width: 180,
      render: (_: any, record: any) => record.alternate_model?.model_code || `ID:${record.alternate_model_id}`,
    },
    {
      title: '替代类型',
      dataIndex: 'match_type',
      key: 'match_type',
      width: 120,
      render: (type: string) => (
        <Tag color={type === 'DIRECT' ? 'green' : 'orange'}>
          {type === 'DIRECT' ? '直接替代' : '功能替代'}
        </Tag>
      ),
    },
    {
      title: '相似度',
      dataIndex: 'similarity_score',
      key: 'similarity_score',
      width: 100,
      render: (v: number) => (v != null ? `${v}%` : '-'),
    },
    {
      title: '说明',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (v: number) => (v === 1 ? '启用' : '禁用'),
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record.id)}>
            编辑
          </Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="替代型号管理"
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增替代关系</Button>}
      >
        <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Select
            showSearch
            placeholder="搜索原型号"
            style={{ width: 240 }}
            allowClear
            value={searchModelId}
            onChange={v => setSearchModelId(v)}
            filterOption={(input, option) =>
              (option?.label as string || '').toLowerCase().includes(input.toLowerCase())
            }
          >
            {models.map(m => (
              <Option key={m.id} value={m.id} label={`${m.model_code} (${m.model_name})`}>
                {m.model_code} - {m.model_name}
              </Option>
            ))}
          </Select>
          <Select
            placeholder="替代类型"
            style={{ width: 140 }}
            allowClear
            value={searchMatchType}
            onChange={v => setSearchMatchType(v)}
          >
            <Option value="DIRECT">直接替代</Option>
            <Option value="FUNCTIONAL">功能替代</Option>
          </Select>
          <Button type="primary" onClick={() => fetchList(1)}>查询</Button>
          <Button onClick={() => { setSearchModelId(undefined); setSearchMatchType(undefined); fetchList(1); }}>
            重置
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showTotal: t => `共 ${t} 条`,
            onChange: (page) => fetchList(page),
          }}
          scroll={{ x: 900 }}
        />
      </Card>

      <Modal
        title={editingId ? '编辑替代关系' : '新增替代关系'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="model_id" label="原型号" rules={[{ required: true, message: '请选择原型号' }]}>
            <Select showSearch placeholder="搜索并选择原型号" filterOption={(input, option) => (option?.label as string || '').toLowerCase().includes(input.toLowerCase())}>
              {models.map(m => (
                <Option key={m.id} value={m.id} label={`${m.model_code} (${m.model_name})`}>
                  {m.model_code} - {m.model_name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="alternate_model_id" label="替代型号" rules={[{ required: true, message: '请选择替代型号' }]}>
            <Select showSearch placeholder="搜索并选择替代型号" filterOption={(input, option) => (option?.label as string || '').toLowerCase().includes(input.toLowerCase())}>
              {models.map(m => (
                <Option key={m.id} value={m.id} label={`${m.model_code} (${m.model_name})`}>
                  {m.model_code} - {m.model_name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="match_type" label="替代类型" rules={[{ required: true, message: '请选择替代类型' }]}>
            <Select placeholder="选择替代类型">
              <Option value="DIRECT">直接替代 (Pin-to-Pin)</Option>
              <Option value="FUNCTIONAL">功能替代</Option>
            </Select>
          </Form.Item>
          <Form.Item name="similarity_score" label="相似度评分">
            <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="0-100" />
          </Form.Item>
          <Form.Item name="notes" label="替代说明">
            <TextArea rows={2} placeholder="可选说明" />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue={1}>
            <Select>
              <Option value={1}>启用</Option>
              <Option value={0}>禁用</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
