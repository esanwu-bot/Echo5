// 多语言管理 - 语言类型管理页面
// 对标 CRMEB pages/setting/multiLanguage/list.vue
import { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, message, Card, Switch, Tag, Select } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import {
  getLangTypes, createLangType, updateLangType, deleteLangType,
  toggleLangTypeStatus, setDefaultLangType
} from '../../lib/api/lang-type';

export default function LangTypesPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 15, total: 0 });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();

  const fetchList = async (page = 1) => {
    setLoading(true);
    try {
      const res = await getLangTypes({ page, limit: pagination.pageSize });
      if (res.code === 200) {
        setList(res.data.list);
        setPagination(prev => ({ ...prev, current: page, total: res.data.count }));
      } else {
        message.error(res.message || '获取列表失败');
      }
    } catch (err) {
      message.error('获取列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, []);

  const showModal = (item = null) => {
    setEditingItem(item);
    if (item) {
      form.setFieldsValue(item);
    } else {
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      if (editingItem) {
        const res = await updateLangType(editingItem.id, values);
        if (res.code === 200) {
          message.success('更新成功');
          setIsModalVisible(false);
          form.resetFields();
          fetchList(pagination.current);
        } else {
          message.error(res.message || '更新失败');
        }
      } else {
        const res = await createLangType(values);
        if (res.code === 200) {
          message.success('创建成功');
          setIsModalVisible(false);
          form.resetFields();
          fetchList(1);
        } else {
          message.error(res.message || '创建失败');
        }
      }
    } catch (err) {
      message.error(editingItem ? '更新失败' : '创建失败');
    }
  };

  const handleDelete = async (id, isDefault) => {
    if (isDefault) {
      message.warning('不能删除默认语言');
      return;
    }
    try {
      const res = await deleteLangType(id);
      if (res.code === 200) {
        message.success('删除成功');
        fetchList(list.length === 1 && pagination.current > 1 ? pagination.current - 1 : pagination.current);
      } else {
        message.error(res.message || '删除失败');
      }
    } catch (err) {
      message.error('删除失败');
    }
  };

  const handleStatusChange = async (id, checked) => {
    try {
      const res = await toggleLangTypeStatus(id);
      if (res.code === 200) {
        message.success('状态更新成功');
        fetchList(pagination.current);
      } else {
        message.error(res.message || '状态更新失败');
      }
    } catch (err) {
      message.error('状态更新失败');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      const res = await setDefaultLangType(id);
      if (res.code === 200) {
        message.success('设置默认语言成功');
        fetchList(pagination.current);
      } else {
        message.error(res.message || '设置失败');
      }
    } catch (err) {
      message.error('设置失败');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    {
      title: '语言名称', dataIndex: 'language_name', key: 'language_name', width: 150,
      render: (text, record) => (
        <Space>{text}{record.is_default === 1 && <Tag color="blue">默认</Tag>}</Space>
      )
    },
    {
      title: '语言标识', dataIndex: 'file_name', key: 'file_name', width: 120,
      render: (text) => <code>{text}</code>
    },
    {
      title: '启用', dataIndex: 'status', key: 'status', width: 80,
      render: (status, record) => (
        <Switch
          checked={status === 1}
          disabled={record.is_default === 1}
          onChange={(checked) => {
            record.status = checked ? 1 : 0;
            handleStatusChange(record.id, checked);
          }}
        />
      )
    },
    {
      title: '创建时间', dataIndex: 'create_time', key: 'create_time', width: 160,
      render: (text) => text ? text.substring(0, 19) : '-'
    },
    {
      title: '操作', key: 'action', width: 230, fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => showModal(record)}>编辑</Button>
          {record.is_default !== 1 && (
            <Button type="link" size="small" onClick={() => handleSetDefault(record.id)}>设为默认</Button>
          )}
        </Space>
      )
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="语言类型管理"
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>新增语言</Button>}
      >
        <Table
          columns={columns}
          dataSource={list}
          loading={loading}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page) => fetchList(page),
            onShowSizeChange: (current, size) => {
              setPagination(prev => ({ ...prev, pageSize: size }));
              fetchList(current);
            }
          }}
        />
      </Card>

      <Modal
        title={editingItem ? '编辑语言类型' : '新增语言类型'}
        visible={isModalVisible}
        onCancel={() => { setIsModalVisible(false); form.resetFields(); }}
        onOk={() => form.submit()}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="language_name" label="语言名称" rules={[{ required: true, message: '请输入语言名称' }]}>
            <Input placeholder="例如：中文、English、日本語" />
          </Form.Item>
          <Form.Item name="file_name" label="语言标识(file_name)" rules={[{ required: true, message: '请输入语言标识' }]}
            extra="格式如 zh-CN、en-US、ja-JP、ko-KR，用于匹配浏览器 Accept-Language"
          >
            <Input placeholder="例如：zh-CN" />
          </Form.Item>
          <Form.Item name="is_default" label="是否默认语言" initialValue={0}>
            <Select options={[
              { label: '否', value: 0 },
              { label: '是', value: 1 },
            ]} />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue={1}>
            <Select options={[
              { label: '启用', value: 1 },
              { label: '禁用', value: 0 },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
