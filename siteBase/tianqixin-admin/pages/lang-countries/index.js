// 多语言管理 - 浏览器语言映射管理页面
// 对标 CRMEB pages/setting/multiLanguage/country.vue
import { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, InputNumber, message, Popconfirm, Card, Switch } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getLangCountries, createLangCountry, updateLangCountry, deleteLangCountry, updateLangCountryStatus } from '../../lib/api/lang-country';

export default function LangCountriesPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [form] = Form.useForm();

  const fetchList = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: pagination.pageSize };
      if (searchKeyword) params.keyword = searchKeyword;
      const res = await getLangCountries(params);
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
        const res = await updateLangCountry(editingItem.id, values);
        if (res.code === 200) {
          message.success('更新成功');
          setIsModalVisible(false);
          form.resetFields();
          fetchList(pagination.current);
        } else {
          message.error(res.message || '更新失败');
        }
      } else {
        const res = await createLangCountry({ ...values, status: 1 });
        if (res.code === 200) {
          message.success('添加成功');
          setIsModalVisible(false);
          form.resetFields();
          fetchList(1);
        } else {
          message.error(res.message || '添加失败');
        }
      }
    } catch (err) {
      message.error(editingItem ? '更新失败' : '添加失败');
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await deleteLangCountry(id);
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
      const newStatus = checked ? 1 : 0;
      const res = await updateLangCountryStatus(id, newStatus);
      if (res.code === 200) {
        message.success('状态更新成功');
        setList(prev => prev.map(item =>
          item.id === id ? { ...item, status: newStatus } : item
        ));
      } else {
        message.error(res.message || '状态更新失败');
      }
    } catch (err) {
      message.error('状态更新失败');
    }
  };

  const columns = [
    { title: '编号', dataIndex: 'id', key: 'id', width: 70 },
    {
      title: '浏览器语言识别码', dataIndex: 'code', key: 'code', width: 160,
      render: (text) => <code style={{ fontSize: 13 }}>{text}</code>
    },
    {
      title: '语言说明', dataIndex: 'name', key: 'name', width: 200
    },
    {
      title: '关联语言', dataIndex: 'link_lang', key: 'link_lang', width: 150,
      render: (text) => text || <span style={{ color: '#999' }}>未关联</span>
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (status, record) => (
        <Switch
          checked={status === 1}
          checkedChildren="启用"
          unCheckedChildren="禁用"
          onChange={(checked) => handleStatusChange(record.id, checked)}
        />
      )
    },
    {
      title: '操作', key: 'action', width: 150, fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => showModal(record)}>编辑</Button>
          <Popconfirm title="删除映射" description="确定删除该浏览器语言映射吗？"
            onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
            <Button type="link" danger size="small">删除</Button>
          </Popconfirm>
        </Space>
      )
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="浏览器语言映射管理"
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>添加映射</Button>}
      >
        {/* 搜索栏 */}
        <Space style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="搜索语言Code或名称"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onSearch={() => { setPagination(prev => ({ ...prev, current: 1 })); fetchList(1); }}
            style={{ width: 300 }}
          />
        </Space>

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
        title={editingItem ? '编辑浏览器映射' : '添加浏览器映射'}
        visible={isModalVisible}
        onCancel={() => { setIsModalVisible(false); form.resetFields(); }}
        onOk={() => form.submit()}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="所属地区" rules={[{ required: true, message: '请输入地区名称' }]}>
            <Input placeholder="例如：中文(简体，中国大陆)、English(United States)" />
          </Form.Item>
          <Form.Item name="code" label="浏览器语言识别码" rules={[{ required: true, message: '请输入浏览器语言识别码' }]}
            extra="例如：zh-CN、en-US、ja-JP。用于匹配浏览器 Accept-Language 请求头">
            <Input placeholder="例如：zh-CN" />
          </Form.Item>
          <Form.Item name="type_id" label="关联语言类型ID">
            <Input placeholder="语言类型ID（0=未关联）" />
          </Form.Item>
          <Form.Item name="status" label="状态" valuePropName="checked" getValueFromEvent={(checked) => checked ? 1 : 0}>
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
