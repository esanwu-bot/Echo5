﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿'use client';

import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, message, Card, Tag, Popconfirm, Input, Upload, Image } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import type { ColumnsType } from 'antd/es/table';
import { API_BASE_URL } from "../../lib/api/config";
import { getLocalStorage } from "../../lib/utils";

interface DictionaryProject {
  id: number;
  name: string;
  code: string;
}

interface DictionaryField {
  id: number;
  project_id: number;
  name: string;
  code: string;
  field_type: string;
  required?: boolean;
  status: number;
}

interface DictionaryData {
  id: number;
  project_id: number;
  field_values: Record<string, any>;
  status: number;
}

const DictionaryDataPage: React.FC = () => {
  const [projects, setProjects] = useState<DictionaryProject[]>([]);
  const [fields, setFields] = useState<DictionaryField[]>([]);
  const [data, setData] = useState<DictionaryData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<DictionaryProject | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingData, setEditingData] = useState<DictionaryData | null>(null);
  const [form] = Form.useForm();
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadFields();
      loadData();
    }
  }, [selectedProject]);

  const loadProjects = async () => {
    try {
      const token = getLocalStorage()?.getItem("auth_token");
      const response = await fetch(`${API_BASE_URL}/admin/dictionary/getProjects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.code === 200) {
        setProjects(result.data?.data || result.data || []);
      }
    } catch (error) {
      message.error('加载项目失败');
    }
  };

  const loadFields = async () => {
    try {
      const token = getLocalStorage()?.getItem("auth_token");
      const response = await fetch(`${API_BASE_URL}/admin/dictionary/read?id=${selectedProject?.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.code === 200) {
        setFields(result.data?.fields || []);
      }
    } catch (error) {
      message.error('加载字段失败');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const token = getLocalStorage()?.getItem("auth_token");
      const response = await fetch(`${API_BASE_URL}/admin/dictionary/getDataList?project_id=${selectedProject?.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.code === 200) {
        setData(result.data?.data || result.data || []);
      }
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingData(null);
    form.resetFields();
    setImageUrls({});
    setModalVisible(true);
  };

  const handleEdit = (record: DictionaryData) => {
    setEditingData(record);
    const formValues: Record<string, any> = {};
    const urls: Record<string, string> = {};
    Object.entries(record.field_values).forEach(([key, value]) => {
      const field = fields.find(f => f.code === key);
      if (field?.field_type === 'image' && typeof value === 'string') {
        urls[key] = value;
        formValues[key] = value;
      } else if (typeof value === 'object' && value !== null) {
        formValues[key] = JSON.stringify(value, null, 2);
      } else {
        formValues[key] = value;
      }
    });
    setImageUrls(urls);
    form.setFieldsValue(formValues);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const token = getLocalStorage()?.getItem("auth_token");
      const response = await fetch(`${API_BASE_URL}/admin/dictionary/deleteData`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id })
      });
      const result = await response.json();
      if (result.code === 200) {
        message.success('删除成功');
        loadData();
      } else {
        message.error(result.msg || '删除失败');
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const token = getLocalStorage()?.getItem("auth_token");
      const payload = {
        id: editingData?.id,
        project_id: selectedProject?.id,
        field_values: values,
        status: 1
      };
      
      const response = await fetch(`${API_BASE_URL}/admin/dictionary/saveData`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      if (result.code === 200) {
        message.success(editingData ? '更新成功' : '添加成功');
        setModalVisible(false);
        loadData();
      } else {
        message.error(result.msg || '操作失败');
      }
    } catch (error) {
      message.error('操作失败');
    }
  };

  const columns: ColumnsType<DictionaryData> = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
      render: (id: number) => String(id),
    },
    {
      title: '字段值',
      key: 'field_values',
      render: (_, record) => {
        try {
          if (!record.field_values || typeof record.field_values !== 'object') {
            return <span>无数据</span>;
          }
          const entries = Object.entries(record.field_values);
          if (entries.length === 0) {
            return <span>无数据</span>;
          }
          return (
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {entries.map(([key, value]) => {
                let displayValue = '';
                try {
                  if (value === null || value === undefined) {
                    displayValue = '空';
                  } else if (typeof value === 'object') {
                    displayValue = JSON.stringify(value);
                  } else {
                    displayValue = String(value);
                  }
                } catch (e) {
                  displayValue = '[Error]';
                }
                const truncated = displayValue.length > 50 ? displayValue.substring(0, 50) + '...' : displayValue;
                return (
                  <div key={key} style={{ marginBottom: 4 }}>
                    <Tag>{String(key)}</Tag>
                    <span style={{ color: '#666' }}>{truncated}</span>
                  </div>
                );
              })}
            </div>
          );
        } catch (e) {
          return <span>渲染错误</span>;
        }
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (status: number) => (
        <Tag color={status == 1 ? 'green' : 'red'}>
          {status == 1 ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除这条数据吗？"
            onConfirm={() => handleDelete(record.id)}
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
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">字典数据管理</h1>

      <Card className="mb-4">
        <Space>
          <span>选择项目：</span>
          {projects.map(project => (
            <Button
              key={project.id}
              type={selectedProject?.id === project.id ? 'primary' : 'default'}
              onClick={() => setSelectedProject(project)}
            >
              {project.name}
            </Button>
          ))}
        </Space>
      </Card>

      {selectedProject && (
        <Card
          title={`${selectedProject.name} - 数据管理`}
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增数据
            </Button>
          }
        >
          <Table
            columns={columns}
            dataSource={data}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </Card>
      )}

      <Modal
        title={editingData ? '编辑数据' : '新增数据'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {fields.filter(f => f.status === 1).map(field => (
            <Form.Item
              key={field.code}
              name={field.code}
              label={field.name}
              rules={field.required ? [{ required: true, message: `请上传${field.name}` }] : []}
            >
              {field.field_type === 'image' ? (
                <Upload
                  listType="picture-card"
                  showUploadList={false}
                  action="/api/upload"
                  accept="image/*"
                  onChange={({ file }) => {
                    if (file.status === 'done') {
                      const url = (file.response as any)?.url;
                      if (url) {
                        setImageUrls(prev => ({ ...prev, [field.code]: url }));
                        form.setFieldsValue({ [field.code]: url });
                        message.success('上传成功');
                      }
                    } else if (file.status === 'error') {
                      message.error('上传失败');
                    }
                  }}
                >
                  {imageUrls[field.code] ? (
                    <Image
                      src={imageUrls[field.code]}
                      alt={field.name}
                      width={100}
                      height={100}
                      style={{ objectFit: 'cover' }}
                      preview={false}
                    />
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <UploadOutlined style={{ fontSize: '24px' }} />
                      <div style={{ marginTop: 8 }}>上传图片</div>
                    </div>
                  )}
                </Upload>
              ) : (
                <Input.TextArea rows={4} placeholder={`请输入${field.name}`} />
              )}
            </Form.Item>
          ))}
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                {editingData ? '更新' : '添加'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DictionaryDataPage;
