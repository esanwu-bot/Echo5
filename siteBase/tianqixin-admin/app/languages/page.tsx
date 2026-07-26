'use client'

import { useEffect, useState } from 'react'
import { Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Switch, Table, Tag, message } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import {
  createLangType,
  deleteLangType,
  getLangTypes,
  setDefaultLangType,
  toggleLangTypeStatus,
  updateLangType,
  type LangType,
} from '@/lib/api/lang-type'

export default function LanguagesPage() {
  const [form] = Form.useForm()
  const [list, setList] = useState<LangType[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<LangType | null>(null)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 15, total: 0 })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  const fetchList = async (page = pagination.current, pageSize = pagination.pageSize) => {
    setLoading(true)
    try {
      const res = await getLangTypes({ page, limit: pageSize })
      if (res.code === 200) {
        setList(res.data.list)
        setPagination({ current: page, pageSize, total: res.data.count })
      } else {
        message.error(res.message || '获取语言类型列表失败')
      }
    } catch (error) {
      console.error(error)
      message.error('获取语言类型列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList(1, pagination.pageSize)
  }, [])

  const openCreateModal = () => {
    setEditingItem(null)
    form.resetFields()
    form.setFieldsValue({ status: 1, is_default: 0 })
    setOpen(true)
  }

  const openEditModal = (item: LangType) => {
    setEditingItem(item)
    form.setFieldsValue({
      language_name: item.language_name,
      file_name: item.file_name,
      status: item.status,
      is_default: item.is_default,
    })
    setOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const payload = {
        ...values,
        status: values.status ? 1 : 0,
        is_default: values.is_default ? 1 : 0,
      }

      const res = editingItem
        ? await updateLangType(editingItem.id, payload)
        : await createLangType(payload)

      if (res.code === 200) {
        message.success(editingItem ? '语言类型已更新' : '语言类型已创建')
        setOpen(false)
        form.resetFields()
        fetchList()
      } else {
        message.error(res.message || '保存失败')
      }
    } catch (error: any) {
      if (error?.errorFields) return
      console.error(error)
      message.error(error?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item: LangType) => {
    const res = await deleteLangType(item.id)
    if (res.code === 200) {
      message.success('语言类型已删除')
      fetchList(list.length === 1 && pagination.current > 1 ? pagination.current - 1 : pagination.current)
    } else {
      message.error(res.message || '删除失败')
    }
  }

  const handleToggleStatus = async (item: LangType) => {
    const res = await toggleLangTypeStatus(item.id)
    if (res.code === 200) {
      message.success('状态已更新')
      fetchList()
    } else {
      message.error(res.message || '状态更新失败')
    }
  }

  const handleSetDefault = async (item: LangType) => {
    const res = await setDefaultLangType(item.id)
    if (res.code === 200) {
      message.success('默认语言已更新')
      fetchList()
    } else {
      message.error(res.message || '默认语言设置失败')
    }
  }

  const handleBatchDelete = () => {
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个语言类型吗？`,
      okText: '确定删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/admin/languages/batch-delete`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ ids: selectedRowKeys }),
          });
          const data = await response.json();
          if (data.code === 200) {
            message.success('批量删除成功');
            setSelectedRowKeys([]);
            fetchList();
          } else {
            message.error(data.message || '批量删除失败');
          }
        } catch (error) {
          message.error('批量删除失败');
        }
      }
    });
  }

  return (
    <Card
      title="语言类型管理"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          新增语言
        </Button>
      }
    >
      {selectedRowKeys.length > 0 && (
        <div className="mb-4">
          <Space>
            <span className="text-gray-500">已选择 {selectedRowKeys.length} 项</span>
            <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>批量删除</Button>
          </Space>
        </div>
      )}

      <Table
        rowKey="id"
        rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
        loading={loading}
        dataSource={list}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          onChange: (page, pageSize) => fetchList(page, pageSize),
        }}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 80 },
          {
            title: '语言名称',
            dataIndex: 'language_name',
            render: (_, item) => (
              <Space>
                <span>{item.language_name}</span>
                {item.is_default === 1 ? <Tag color="blue">默认</Tag> : null}
              </Space>
            ),
          },
          { title: '语言标识', dataIndex: 'file_name', render: (value) => <code>{value}</code> },
          {
            title: '状态',
            dataIndex: 'status',
            width: 110,
            render: (_, item) => (
              <Switch
                checked={item.status === 1}
                disabled={item.is_default === 1}
                checkedChildren="启用"
                unCheckedChildren="禁用"
                onChange={() => handleToggleStatus(item)}
              />
            ),
          },
          {
            title: '操作',
            width: 220,
            render: (_, item) => (
              <Space size="small">
                <Button type="link" onClick={() => openEditModal(item)}>
                  编辑
                </Button>
                {item.is_default !== 1 ? (
                  <Button type="link" onClick={() => handleSetDefault(item)}>
                    设为默认
                  </Button>
                ) : null}
                <Popconfirm
                  title="删除语言类型"
                  description="删除后会同时清理关联词条和地区映射，确认继续吗？"
                  onConfirm={() => handleDelete(item)}
                  okText="确认"
                  cancelText="取消"
                  disabled={item.is_default === 1}
                >
                  <Button type="link" danger disabled={item.is_default === 1}>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editingItem ? '编辑语言类型' : '新增语言类型'}
        open={open}
        onOk={handleSave}
        onCancel={() => setOpen(false)}
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="language_name"
            label="语言名称"
            rules={[{ required: true, message: '请输入语言名称' }]}
          >
            <Input placeholder="如：中文、English、日本語" />
          </Form.Item>
          <Form.Item
            name="file_name"
            label="语言标识"
            rules={[{ required: true, message: '请输入语言标识' }]}
          >
            <Input placeholder="如：zh-CN、en-US、ja-JP" />
          </Form.Item>
          <Form.Item name="is_default" label="默认语言" valuePropName="checked">
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
          <Form.Item name="status" label="启用状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
