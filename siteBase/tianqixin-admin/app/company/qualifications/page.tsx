'use client';

import React, { useState } from 'react';
import { Card, Table, Button, Space, message, Popconfirm, Upload, Modal, Form, Input } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { aboutService, Certificate } from '@/lib/api/about';
// import MultiLangInput from '@/components/MultiLangInput';
import { API_BASE_URL } from '@/lib/api/config';

export default function QualificationsPage() {
  const [qualifications, setQualifications] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Certificate | null>(null);
  const [form] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const res = await aboutService.listCertificates();
      if (res.code === 200) {
        setQualifications(res.data.list || res.data);
      }
    } catch (e) {
      console.error('Fetch certs failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchDelete = () => {
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 条资质吗？`,
      okText: '确定删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
          const res = await fetch(`${API_BASE_URL}/admin/certificates/batch-delete`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ ids: selectedRowKeys }),
          });
          const data = await res.json();
          if (data.code === 200) {
            message.success('批量删除成功');
            setSelectedRowKeys([]);
            fetchCertificates();
          } else {
            message.error(data.message || '批量删除失败');
          }
        } catch (error) {
          message.error('批量删除失败');
        }
      }
    });
  };

  React.useEffect(() => {
    fetchCertificates();
  }, []);

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: Certificate) => {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      cert_name: record.cert_name || '',
      description: record.description || ''
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await aboutService.deleteCertificate(id);
      if (res.code === 200) {
        message.success('删除成功');
        fetchCertificates();
      } else {
        message.error(res.message || '删除失败');
      }
    } catch (e) {
      message.error('删除失败');
    }
  };

  const handleModalOk = () => {
    form.validateFields().then(async values => {
      const payload: any = { ...values };

      try {
        if (editingRecord) {
          const res = await aboutService.updateCertificate(editingRecord.id!, payload);
          if (res.code === 200) {
            message.success('更新成功');
            setIsModalVisible(false);
            fetchCertificates();
          } else {
            message.error(res.message || '更新失败');
          }
        } else {
          const res = await aboutService.createCertificate(payload);
          if (res.code === 200) {
            message.success('添加成功');
            setIsModalVisible(false);
            fetchCertificates();
          } else {
            message.error(res.message || '添加失败');
          }
        }
      } catch (e) {
        message.error('操作失败');
      }
    });
  };

  const columns = [
    {
      title: '资质名称',
      dataIndex: 'cert_name',
      key: 'cert_name',
    },
    {
      title: '预览',
      dataIndex: 'cert_image',
      key: 'cert_image',
      render: (img: string) => img ? <img src={img} alt="cert" style={{ width: 50 }} /> : '-'
    },
    {
      title: '排序',
      dataIndex: 'sort',
      key: 'sort',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: number) => (
        <span style={{ color: status === 1 ? '#52c41a' : '#ff4d4f' }}>
          {status === 1 ? '有效' : '禁用'}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Certificate) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除这个资质吗？"
            onConfirm={() => handleDelete(record.id!)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />} size="small">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="资质管理"
        extra={
          <Space>
            <Button
              danger
              icon={<DeleteOutlined />}
              disabled={selectedRowKeys.length === 0}
              onClick={handleBatchDelete}
            >
              批量删除
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              添加资质
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={qualifications}
          rowKey="id"
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
        />
      </Card>

      <Modal
        title={editingRecord ? '编辑资质' : '添加资质'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="资质名称"
            name="cert_name"
            rules={[{ required: true, message: '请输入资质名称' }]}
          >
            <Input placeholder="请输入资质名称" />
          </Form.Item>

          <Form.Item
            label="描述"
            name="description"
          >
            <Input.TextArea rows={3} placeholder="请输入资质描述" />
          </Form.Item>

          <Form.Item
            label="证书图片"
            name="cert_image"
            rules={[{ required: true, message: '请上传证书图片' }]}
          >
            <Upload
              action={`${API_BASE_URL}/admin/upload/image`}
              name="image"
              listType="picture-card"
              maxCount={1}
              onPreview={(file) => {
                window.open(file.url || file.response?.url);
              }}
              onChange={({ file }) => {
                if (file.status === 'done') {
                  form.setFieldsValue({ cert_image: file.response.url });
                }
              }}
            >
              <Button icon={<PlusOutlined />}>上传</Button>
            </Upload>
          </Form.Item>

          <Form.Item
            label="排序"
            name="sort"
            initialValue={10}
          >
            <Input type="number" placeholder="请输入排序" />
          </Form.Item>

          <Form.Item
            label="状态"
            name="status"
            valuePropName="checked"
            initialValue={1}
            getValueProps={(val) => ({ checked: val === 1 })}
            getValueFromEvent={(val) => (val ? 1 : 0)}
          >
            <Input type="checkbox" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}