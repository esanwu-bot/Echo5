﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿'use client';

import React, { useState, useEffect } from 'react';
import { Table, Button, Space, message, Card, Tag, Popconfirm, Input, Modal, Form, Row, Col, Switch, InputNumber, Select } from 'antd';
const { Option } = Select;
import { PlusOutlined, EditOutlined, DeleteOutlined, UnorderedListOutlined, LinkOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import ProjectModal from './components/ProjectModal';
import DataListDrawer from './components/DataListDrawer';
import { getLocalStorage } from "../../lib/utils";

const { Search } = Input;

interface DictionaryProject {
  id: number;
  name: string;
  code: string;
  description: string;
  status: number;
  created_at: string;
  updated_at: string;
  fields?: any[];
}

interface Category {
  id: number;
  name: string;
  parent_id: number;
  parent_name?: string;
}

interface Attribute {
  id: number;
  name: string;
  code: string;
  type: string;
  data_type: string;
  is_required: boolean;
  is_filter: boolean;
  sort_order: number;
}

interface CategoryAttribute {
  id?: number;
  category_id: number;
  attribute_id: number;
  attribute?: Attribute;
  is_required: boolean;
  is_filter: boolean;
  sort_order: number;
}

const DictionaryPage: React.FC = () => {
  const [projects, setProjects] = useState<DictionaryProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState({ name: '', code: '' });
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [categoryAttributes, setCategoryAttributes] = useState<CategoryAttribute[]>([]);
  const [attributeModalVisible, setAttributeModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [attributeForm] = Form.useForm();
  const [attributeModal, setAttributeModal] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<CategoryAttribute | null>(null);
  const [availableAttributes, setAvailableAttributes] = useState<Attribute[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Modal states
  const [projectModalVisible, setProjectModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<DictionaryProject | null>(null);

  // Drawer states
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState<DictionaryProject | null>(null);

  // Get API base URL from environment or config
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  // Helper function to get authentication headers
  const getAuthHeaders = () => {
    const token = getLocalStorage()?.getItem('auth_token');
    return {
      'Authorization': `Bearer ${token}`,
    };
  };

  // Fetch category info from URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const categoryIdParam = urlParams.get('categoryId');
    if (categoryIdParam) {
      const id = parseInt(categoryIdParam, 10);
      setCategoryId(id);
      fetchCategoryInfo(id);
    }
  }, []);

  // Fetch category information
  const fetchCategoryInfo = async (id: number) => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/admin/categories/${id}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.code === 200) {
          setCategory(data.data);
          // 自动打开属性管理弹窗
          setAttributeModalVisible(true);
        }
      }
    } catch (error) {
      console.error('获取分类信息失败:', error);
      message.error('获取分类信息失败');
    }
  };

  // Fetch available attributes
  const fetchAvailableAttributes = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/admin/dictionary/fields`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.code === 200) {
          setAvailableAttributes(data.data || []);
        }
      }
    } catch (error) {
      console.error('获取可用属性失败:', error);
      message.error('获取可用属性失败');
    }
  };

  // Fetch attributes for a category
  const fetchCategoryAttributes = async (categoryId: number) => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/admin/category-attributes/category/${categoryId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.code === 200) {
          // Store the full category attributes data
          setCategoryAttributes(data.data || []);
        }
      }
    } catch (error) {
      console.error('获取分类属性失败:', error);
      message.error('获取分类属性失败');
    }
  };

  // When attribute modal opens, fetch available attributes and category attributes
  useEffect(() => {
    if (attributeModalVisible && categoryId) {
      fetchAvailableAttributes();
      fetchCategoryAttributes(categoryId);
    }
  }, [attributeModalVisible, categoryId]);
  
  // When attribute modal opens, fetch available attributes
  useEffect(() => {
    if (attributeModal && categoryId) {
      fetchAvailableAttributes();
    }
  }, [attributeModal, categoryId]);

  useEffect(() => {
    loadData();
  }, [searchParams]);

  const loadData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const query = new URLSearchParams(searchParams).toString();
      const res = await fetch(`${API_BASE_URL}/admin/dictionary/getProjects?${query}`, { headers }).then(r => r.json());

      if (res.code === 200) {
        setProjects(res.data.data || []);
      } else {
        message.error(res.msg);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 批量删除数据组
  const handleBatchDelete = () => {
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个数据组吗？删除后关联的数据也将被删除！`,
      okText: '确定删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const token = getLocalStorage()?.getItem('auth_token');
          const res = await fetch(`${API_BASE_URL}/admin/dictionary/batchDeleteProject`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ ids: selectedRowKeys }),
          }).then(r => r.json());

          if (res.code === 200) {
            message.success('批量删除成功');
            setSelectedRowKeys([]);
            loadData();
          } else {
            message.error(res.msg);
          }
        } catch (error) {
          message.error('批量删除失败');
        }
      }
    });
  };

  // Save category attributes
  const handleSaveCategoryAttributes = async () => {
    try {
      const headers = getAuthHeaders();
      
      // First, delete all existing attributes for this category
      await fetch(`${API_BASE_URL}/admin/category-attributes/delete-by-category/${categoryId}`, {
        method: 'DELETE',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ category_id: categoryId })
      });
      
      // Then, save each attribute one by one
      for (const attr of categoryAttributes) {
        await fetch(`${API_BASE_URL}/admin/category-attributes`, {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            category_id: categoryId?.toString() || '',
            attribute_id: attr.attribute_id.toString(),
            is_required: attr.is_required ? '1' : '0',
            is_filter: attr.is_filter ? '1' : '0',
            sort_order: attr.sort_order.toString()
          }).toString()
        });
      }
      
      message.success('属性保存成功');
      setAttributeModalVisible(false);
    } catch (error) {
      console.error('保存属性失败:', error);
      message.error('保存属性失败');
    }
  };

  // Open attribute management modal
  const openAttributeManagement = () => {
    setAttributeModalVisible(true);
  };

  // Open category management page
  const openCategoryManagement = () => {
    window.location.href = '/products/categories';
  };

  // Add a new attribute
  const handleAddAttribute = () => {
    setEditingAttribute(null);
    attributeForm.resetFields();
    setAttributeModal(true);
  };

  // Edit an existing attribute
  const handleEditAttribute = (attr: CategoryAttribute) => {
    setEditingAttribute(attr);
    attributeForm.setFieldsValue(attr);
    setAttributeModal(true);
  };

  // Delete an attribute
  const handleDeleteAttribute = (index: number) => {
    const newAttributes = [...categoryAttributes];
    newAttributes.splice(index, 1);
    setCategoryAttributes(newAttributes);
  };

  // Save attribute (add or edit)
  const handleSaveAttribute = (values: any) => {
    // Find the selected attribute from availableAttributes
    const selectedAttribute = availableAttributes.find(attr => attr.id === values.attribute_id);
    
    const newAttribute: CategoryAttribute = {
      ...values,
      category_id: categoryId || 0,
      // Add the complete attribute object
      attribute: selectedAttribute || {
        id: values.attribute_id,
        name: `属性${values.attribute_id}`,
        code: `attr_${values.attribute_id}`,
        type: '',
        data_type: '',
        is_required: false,
        is_filter: false,
        sort_order: 0
      }
    };
    
    if (editingAttribute) {
      // Edit existing attribute
      const newAttributes = [...categoryAttributes];
      const index = newAttributes.findIndex(attr => attr.id === editingAttribute.id);
      if (index !== -1) {
        newAttributes[index] = newAttribute;
      }
      setCategoryAttributes(newAttributes);
    } else {
      // Add new attribute
      setCategoryAttributes([...categoryAttributes, newAttribute]);
    }
    
    setAttributeModal(false);
  };

  const handleSearch = (value: string) => {
    // Simple search implementation, can be expanded
    setSelectedRowKeys([]);
    setSearchParams({ ...searchParams, name: value });
  };

  const handleReset = () => {
    setSelectedRowKeys([]);
    setSearchParams({ name: '', code: '' });
  };

  // Project operations
  const handleAddProject = () => {
    setEditingProject(null);
    setProjectModalVisible(true);
  };

  const handleEditProject = async (project: DictionaryProject) => {
    // Fetch full project details including fields
    try {
      const token = getLocalStorage()?.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/admin/dictionary/read?id=${project.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json());

      if (res.code === 200) {
        setEditingProject(res.data);
        setProjectModalVisible(true);
      } else {
        message.error(res.msg);
      }
    } catch (error) {
      message.error('获取详情失败');
    }
  };

  const handleDeleteProject = async (id: number) => {
    try {
      const token = getLocalStorage()?.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/admin/dictionary/deleteProject?id=${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json());

      if (res.code === 200) {
        message.success('删除成功');
        loadData();
      } else {
        message.error(res.msg);
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleProjectSubmit = async (values: any) => {
    try {
      const token = getLocalStorage()?.getItem('auth_token');
      const submitData = {
        ...values,
        id: editingProject?.id
      };

      const res = await fetch(`${API_BASE_URL}/admin/dictionary/saveProject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submitData)
      }).then(r => r.json());

      if (res.code === 200) {
        message.success('保存成功');
        setProjectModalVisible(false);
        loadData();
      } else {
        message.error(res.msg);
      }
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleOpenDataList = async (project: DictionaryProject) => {
    // Need to fetch fields first if not available in list
    try {
      const token = getLocalStorage()?.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/admin/dictionary/read?id=${project.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json());

      if (res.code === 200) {
        setSelectedProject(res.data);
        setDrawerVisible(true);
      }
    } catch (error) {
      message.error('加载配置失败');
    }
  };

  const columns: ColumnsType<DictionaryProject> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: 'KEY',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '数据组名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '简介',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<UnorderedListOutlined />}
            size="small"
            onClick={() => handleOpenDataList(record)}
          >
            数据列表
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEditProject(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除这个项目吗？"
            description="删除后关联的数据也将被删除！"
            onConfirm={() => handleDeleteProject(record.id)}
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
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">数据字典</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddProject}>
          添加数据组
        </Button>
      </div>

      <Card className="mb-4">
        <Space>
          <Search
            placeholder="请输入ID,KEY,数据组名称"
            onSearch={handleSearch}
            style={{ width: 300 }}
            allowClear
          />
          <Button onClick={handleReset}>重置</Button>
        </Space>
      </Card>

      <Card>

        <div className="mb-4">
          <Space>
            <span>已选择 {selectedRowKeys.length} 项</span>
            <Button
              danger
              icon={<DeleteOutlined />}
              disabled={selectedRowKeys.length === 0}
              onClick={handleBatchDelete}
            >
              批量删除
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={projects}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
        />
      </Card>

      <ProjectModal
        visible={projectModalVisible}
        project={editingProject}
        onCancel={() => setProjectModalVisible(false)}
        onSubmit={handleProjectSubmit}
      />

      <DataListDrawer
        visible={drawerVisible}
        project={selectedProject}
        onClose={() => setDrawerVisible(false)}
      />

      {/* Attribute Management Modal */}
      <Modal
        title={`属性管理 - ${category?.name || '未选择分类'}`}
        open={attributeModalVisible}
        onCancel={() => setAttributeModalVisible(false)}
        footer={null}
        width={800}
      >
        {category && (
          <div style={{ marginBottom: 20 }}>
            <Card size="small">
              <p><strong>分类ID:</strong> {category.id}</p>
              <p><strong>分类名称:</strong> {category.name}</p>
              <p><strong>父分类:</strong> {category.parent_name || '顶级分类'}</p>
            </Card>
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddAttribute}>
            新增属性
          </Button>
        </div>

        <Table
          dataSource={categoryAttributes}
          rowKey="id"
          pagination={false}
          style={{ marginBottom: 20 }}
          columns={[
            {
              title: '属性名称',
              dataIndex: ['attribute', 'name'],
              key: 'attribute_name',
              render: (text: any) => text || '-',
            },
            {
              title: '属性编码',
              dataIndex: ['attribute', 'code'],
              key: 'attribute_code',
              render: (text: any) => text || '-',
            },
            {
              title: '是否必填',
              dataIndex: 'is_required',
              key: 'is_required',
              render: (text: boolean) => text ? '是' : '否',
            },
            {
              title: '是否筛选',
              dataIndex: 'is_filter',
              key: 'is_filter',
              render: (text: boolean) => text ? '是' : '否',
            },
            {
              title: '排序',
              dataIndex: 'sort_order',
              key: 'sort_order',
            },
            {
              title: '操作',
              key: 'action',
              render: (_: any, __: any, index: number) => (
                <Space size="middle">
                  <Button type="link" icon={<EditOutlined />} onClick={() => handleEditAttribute(categoryAttributes[index])}>
                    编辑
                  </Button>
                  <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDeleteAttribute(index)}>
                    删除
                  </Button>
                </Space>
              ),
            },
          ]}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <Space size="middle">
            <Button onClick={() => setAttributeModalVisible(false)}>取消</Button>
            <Button type="primary" onClick={handleSaveCategoryAttributes}>
              保存属性
            </Button>
            <Button 
              type="default" 
              icon={<LinkOutlined />}
              onClick={openCategoryManagement}
            >
              返回分类管理
            </Button>
          </Space>
        </div>
      </Modal>

      {/* Add/Edit Attribute Modal */}
      <Modal
        title={editingAttribute ? '编辑属性' : '新增属性'}
        open={attributeModal}
        onCancel={() => setAttributeModal(false)}
        footer={null}
        width={600}
      >
        <Form form={attributeForm} layout="vertical" onFinish={handleSaveAttribute}>
          <Form.Item name="attribute_id" label="属性名称" rules={[{ required: true, message: '请选择属性' }]}>
            <Select
              placeholder="请选择属性"
              allowClear
              style={{ width: '100%' }}
              showSearch
              optionFilterProp="children"
            >
              {availableAttributes.map((attribute) => (
                <Select.Option key={attribute.id} value={attribute.id}>
                  {attribute.name} ({attribute.code})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item name="is_required" label="是否必填">
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
          
          <Form.Item name="is_filter" label="是否作为筛选条件">
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
          
          <Form.Item name="sort_order" label="排序" rules={[{ required: true, message: '请输入排序值' }]}>
            <InputNumber min={0} placeholder="请输入排序值" style={{ width: '100%' }} />
          </Form.Item>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <Space size="middle">
              <Button onClick={() => setAttributeModal(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                {editingAttribute ? '更新' : '保存'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default DictionaryPage;