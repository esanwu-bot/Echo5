﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import React, { useEffect, useState } from 'react';
import { Drawer, Table, Button, Space, Popconfirm, message, Tag, Image } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import DataModal from './DataModal';
import { API_BASE_URL } from "../../../lib/api/config";
import { getLocalStorage } from "../../../lib/utils";

interface DataListDrawerProps {
    visible: boolean;
    project: any;
    onClose: () => void;
}

const DataListDrawer: React.FC<DataListDrawerProps> = ({ visible, project, onClose }) => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingData, setEditingData] = useState<any>(null);

    useEffect(() => {
        if (visible && project) {
            loadData();
        }
    }, [visible, project]);

    const loadData = async () => {
        setLoading(true);
        try {
            const token = getLocalStorage()?.getItem('auth_token');
            const res = await fetch(`${API_BASE_URL}/admin/dictionary/getDataList?project_id=${project.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(r => r.json());

            if (res.code === 200) {
                setData(res.data.data);
            } else {
                message.error(res.msg);
            }
        } catch (error) {
            message.error('加载数据失败');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            const token = getLocalStorage()?.getItem('auth_token');
            const res = await fetch(`${API_BASE_URL}/admin/dictionary/deleteData?id=${id}`, {
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

    const handleEdit = (record: any) => {
        setEditingData(record);
        setModalVisible(true);
    };

    const handleAdd = () => {
        setEditingData(null);
        setModalVisible(true);
    };

    const handleModalSubmit = async (values: any) => {
        try {
            const token = getLocalStorage()?.getItem('auth_token');
            const submitData = {
                id: editingData?.id,
                project_id: project.id,
                field_values: values,
                status: values.status || 1,
                sort_order: values.sort_order || 0
            };

            const res = await fetch(`${API_BASE_URL}/admin/dictionary/saveData`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(submitData)
            }).then(r => r.json());

            if (res.code === 200) {
                message.success('保存成功');
                setModalVisible(false);
                loadData();
            } else {
                message.error(res.msg);
            }
        } catch (error) {
            message.error('保存失败');
        }
    };

    // Generate columns dynamically based on project fields
    const columns = [
        { title: 'ID', dataIndex: 'id', width: 60 },
        ...(project?.fields || []).map((field: any) => ({
            title: field.name,
            dataIndex: ['field_values', field.code],
            key: field.code,
            render: (text: any) => {
                if (field.type === 'image' && text) {
                    return <Image src={text} width={40} height={40} style={{ objectFit: 'cover' }} />;
                }
                if (field.type === 'switch') {
                    return text ? <Tag color="green">是</Tag> : <Tag color="red">否</Tag>;
                }
                if (typeof text === 'object' && text !== null) {
                    return JSON.stringify(text);
                }
                return text;
            }
        })),
        {
            title: '排序',
            dataIndex: 'sort_order',
            width: 80,
        },
        {
            title: '状态',
            dataIndex: 'status',
            width: 80,
            render: (status: number) => (
                <Tag color={status === 1 ? 'green' : 'red'}>
                    {status === 1 ? '启用' : '禁用'}
                </Tag>
            )
        },
        {
            title: '操作',
            key: 'action',
            width: 150,
            fixed: 'right' as const,
            render: (_: any, record: any) => (
                <Space>
                    <Button type="link" size="small" onClick={() => handleEdit(record)}>编辑</Button>
                    <Popconfirm title="确定删除吗？" onConfirm={() => handleDelete(record.id)}>
                        <Button type="link" danger size="small">删除</Button>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <Drawer
            title={`数据列表 - ${project?.name || ''}`}
            width={1000}
            open={visible}
            onClose={onClose}
            extra={
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    添加数据
                </Button>
            }
        >
            <Table
                columns={columns}
                dataSource={data}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 20 }}
                scroll={{ x: 'max-content' }}
            />

            <DataModal
                visible={modalVisible}
                project={project}
                data={editingData}
                onCancel={() => setModalVisible(false)}
                onSubmit={handleModalSubmit}
            />
        </Drawer>
    );
};

export default DataListDrawer;
