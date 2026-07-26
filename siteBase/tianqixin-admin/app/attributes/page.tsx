﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿"use client";

import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, Switch, InputNumber, message, Popconfirm, Card, Tag, Tabs } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useFormSubmit } from '../../hooks/useFormSubmit';
import { getLocalStorage } from "../../lib/utils";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

const { Option } = Select;

interface Attribute {
    id: number;
    name: string;
    name_en?: string;
    name_zh_hant?: string;
    name_ja?: string;
    name_ko?: string;
    code: string;
    type: string;
    data_type: string;
    unit?: string;
    options?: string;
    is_system: boolean;
    status: number;
    sort_order: number;
}

export default function AttributeManagementPage() {
    const [attributes, setAttributes] = useState<Attribute[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingAttribute, setEditingAttribute] = useState<Attribute | null>(null);
    const [form] = Form.useForm();
    const [searchText, setSearchText] = useState('');
    const { submit } = useFormSubmit(form);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

    useEffect(() => {
        fetchAttributes();
    }, []);

    const getAuthHeaders = () => {
        const token = getLocalStorage()?.getItem('auth_token');
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    };

    const fetchAttributes = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/attributes`, {
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.code === 200 || data.success) {
                const list = data.data?.list || data.data || [];
                setAttributes(list);
            } else {
                message.error(data.message || '获取属性列表失败');
            }
        } catch (error) {
            console.error('Failed to fetch attributes:', error);
            message.error('获取属性列表失败');
        } finally {
            setLoading(false);
        }
    };

    const showModal = (attribute: Attribute | null = null) => {
        setEditingAttribute(attribute);
        if (attribute) {
            form.setFieldsValue({
                ...attribute,
                name: attribute.name || ''
            });
        } else {
            form.resetFields();
            form.setFieldsValue({
                type: 'text',
                data_type: 'string',
                is_system: false,
                status: 1,
                sort_order: 0,
                name: ''
            });
        }
        setModalVisible(true);
    };

    const handleSubmit = async (values: any) => {
        const payload = { ...values };

        const url = editingAttribute
            ? `${API_BASE_URL}/admin/attributes/${editingAttribute.id}`
            : `${API_BASE_URL}/admin/attributes`;

        const method = editingAttribute ? 'PUT' : 'POST';

        await submit(
            async () => {
                const res = await fetch(url, {
                    method,
                    headers: getAuthHeaders(),
                    body: JSON.stringify(payload)
                });
                return res.json();
            },
            {
                successMessage: editingAttribute ? '更新成功' : '创建成功',
                errorMessage: '操作失败',
                onSuccess: () => {
                    setModalVisible(false);
                    fetchAttributes();
                },
            }
        );
    };

    const handleBatchDelete = () => {
        Modal.confirm({
            title: '确认批量删除',
            content: `确定要删除选中的 ${selectedRowKeys.length} 个属性吗？`,
            okText: '确定删除',
            cancelText: '取消',
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    const res = await fetch(`${API_BASE_URL}/admin/attributes/batch-delete`, {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify({ ids: selectedRowKeys }),
                    });
                    const data = await res.json();
                    if (data.code === 200) {
                        message.success(data.msg || '批量删除成功');
                        setSelectedRowKeys([]);
                        fetchAttributes();
                    } else {
                        message.error(data.msg || '批量删除失败');
                    }
                } catch {
                    message.error('批量删除失败');
                }
            }
        });
    };

    const handleDelete = async (id: number) => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/attributes/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            const data = await res.json();
            if (data.code === 200 || data.success) {
                message.success('删除成功');
                fetchAttributes();
            } else {
                message.error(data.message || '删除失败');
            }
        } catch (error) {
            console.error('Failed to delete attribute:', error);
            message.error('删除失败');
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
            title: '属性名称',
            dataIndex: 'name',
            key: 'name',
            width: 150,
        },
        {
            title: '属性编码',
            dataIndex: 'code',
            key: 'code',
            width: 150,
        },
        {
            title: '类型',
            dataIndex: 'type',
            key: 'type',
            width: 100,
            render: (type: string) => {
                const typeMap: Record<string, string> = {
                    text: '文本',
                    number: '数字',
                    select: '下拉选择',
                    checkbox: '多选',
                    range: '范围'
                };
                return typeMap[type] || type;
            }
        },
        {
            title: '数据类型',
            dataIndex: 'data_type',
            key: 'data_type',
            width: 100,
            render: (dataType: string) => {
                const typeMap: Record<string, string> = {
                    string: '字符串',
                    number: '数值',
                    boolean: '布尔值'
                };
                return typeMap[dataType] || dataType;
            }
        },
        {
            title: '单位',
            dataIndex: 'unit',
            key: 'unit',
            width: 80,
        },
        {
            title: '系统属性',
            dataIndex: 'is_system',
            key: 'is_system',
            width: 100,
            render: (isSystem: boolean) => (
                <Tag color={isSystem ? 'blue' : 'default'}>
                    {isSystem ? '是' : '否'}
                </Tag>
            )
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 80,
            render: (status: number) => (
                <Tag color={status === 1 ? 'green' : 'red'}>
                    {status === 1 ? '启用' : '禁用'}
                </Tag>
            )
        },
        {
            title: '排序',
            dataIndex: 'sort_order',
            key: 'sort_order',
            width: 80,
        },
        {
            title: '操作',
            key: 'action',
            width: 150,
            render: (_: any, record: Attribute) => (
                <Space>
                    <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => showModal(record)}
                    >
                        编辑
                    </Button>
                    {!record.is_system && (
                        <Popconfirm
                            title="确定删除此属性吗?"
                            onConfirm={() => handleDelete(record.id)}
                            okText="确定"
                            cancelText="取消"
                        >
                            <Button
                                type="link"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                            >
                                删除
                            </Button>
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    const filteredAttributes = searchText
        ? attributes.filter(attr => 
            attr.name.toLowerCase().includes(searchText.toLowerCase()) ||
            attr.code.toLowerCase().includes(searchText.toLowerCase())
          )
        : attributes;

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">属性管理</h1>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => showModal()}
                >
                    新建属性
                </Button>
            </div>

            {/* 搜索区域 */}
            <Card className="mb-4">
              <Space>
                <Input.Search
                  placeholder="搜索属性名称或编码"
                  allowClear
                  enterButton="搜索"
                  style={{ width: 300 }}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onSearch={() => {}}
                />
                <Button onClick={() => { setSearchText(''); setSelectedRowKeys([]); }}>重置</Button>
              </Space>
            </Card>

            <div className="mb-4">
              {selectedRowKeys.length > 0 && (
                <Space>
                  <span>已选择 {selectedRowKeys.length} 项</span>
                  <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>批量删除</Button>
                </Space>
              )}
            </div>

            {/* 表格区域 */}
            <div className="mb-4">
                {selectedRowKeys.length > 0 && (
                    <Space>
                        <span>已选择 {selectedRowKeys.length} 项</span>
                        <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>批量删除</Button>
                    </Space>
                )}
            </div>
            <Card>
                <Table
                    rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
                    rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
                    dataSource={filteredAttributes}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total) => `共 ${total} 条记录`,
                    }}
                />
            </Card>

            <Modal
                title={editingAttribute ? '编辑属性' : '新建属性'}
                open={modalVisible}
                onCancel={() => {
                    setModalVisible(false);
                    // 取消时不重置表单，保持已填数据
                    // 下次打开时 showModal 会重新设置 fields
                }}
                onOk={() => form.submit()}
                width={600}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Form.Item
                        name="name"
                        label="属性名称"
                        rules={[{ required: true, message: '请输入属性名称' }]}
                    >
                        <Input placeholder="例如: 工作电压" />
                    </Form.Item>

                    <Form.Item
                        name="code"
                        label="属性编码"
                        rules={[
                            { required: true, message: '请输入属性编码' },
                            { pattern: /^[a-z_]+$/, message: '只能包含小写字母和下划线' }
                        ]}
                    >
                        <Input placeholder="例如: operating_voltage" />
                    </Form.Item>

                    <Form.Item
                        name="type"
                        label="类型"
                        rules={[{ required: true, message: '请选择类型' }]}
                    >
                        <Select>
                            <Option value="text">文本</Option>
                            <Option value="number">数字</Option>
                            <Option value="select">下拉选择</Option>
                            <Option value="checkbox">多选</Option>
                            <Option value="range">范围</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="data_type"
                        label="数据类型"
                        rules={[{ required: true, message: '请选择数据类型' }]}
                    >
                        <Select>
                            <Option value="string">字符串</Option>
                            <Option value="number">数值</Option>
                            <Option value="boolean">布尔值</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="unit"
                        label="单位"
                    >
                        <Input placeholder="例如: V, A, Ω" />
                    </Form.Item>

                    <Form.Item
                        name="options"
                        label="选项值"
                        help="用于下拉选择/多选类型,多个选项用逗号分隔"
                    >
                        <Input.TextArea rows={3} placeholder="例如: 0402,0603,0805,1206" />
                    </Form.Item>

                    <Form.Item
                        name="is_system"
                        label="系统属性"
                        valuePropName="checked"
                    >
                        <Switch checkedChildren="是" unCheckedChildren="否" />
                    </Form.Item>

                    <Form.Item
                        name="status"
                        label="状态"
                        rules={[{ required: true }]}
                    >
                        <Select>
                            <Option value={1}>启用</Option>
                            <Option value={0}>禁用</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="sort_order"
                        label="排序"
                    >
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
