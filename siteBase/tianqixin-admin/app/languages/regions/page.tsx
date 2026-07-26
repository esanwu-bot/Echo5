'use client'

import { useEffect, useState } from 'react'
import { Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Switch, Table, message } from 'antd'
import { PlusOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import {
  batchDeleteLangCountries,
  createLangCountry,
  deleteLangCountry,
  getLangCountries,
  updateLangCountry,
  updateLangCountryStatus,
  type LangCountry,
} from '@/lib/api/lang-country'
import { getLangTypes, type LangType } from '@/lib/api/lang-type'
import { API_BASE_URL } from '@/lib/api/config'

export default function RegionsPage() {
  const [form] = Form.useForm()
  const [list, setList] = useState<LangCountry[]>([])
  const [langTypes, setLangTypes] = useState<LangType[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<LangCountry | null>(null)
  const [keyword, setKeyword] = useState('')
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  const fetchTypes = async () => {
    const res = await getLangTypes({ page: 1, limit: 200 })
    if (res.code === 200) {
      setLangTypes(res.data.list)
    }
  }

  const fetchList = async (page = pagination.current, pageSize = pagination.pageSize, nextKeyword = keyword) => {
    setLoading(true)
    try {
      const res = await getLangCountries({ page, limit: pageSize, keyword: nextKeyword || undefined })
      if (res.code === 200) {
        setList(res.data.list)
        setPagination({ current: page, pageSize, total: res.data.count })
      } else {
        message.error(res.message || '获取地区映射失败')
      }
    } catch (error) {
      console.error(error)
      message.error('获取地区映射失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTypes()
    fetchList(1, pagination.pageSize, '')
  }, [])

  const openCreateModal = () => {
    setEditingItem(null)
    form.resetFields()
    form.setFieldsValue({ status: 1 })
    setOpen(true)
  }

  const openEditModal = (item: LangCountry) => {
    setEditingItem(item)
    form.setFieldsValue({
      code: item.code,
      name: item.name,
      type_id: item.type_id || undefined,
      status: item.status,
    })
    setOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const payload = {
        ...values,
        type_id: values.type_id || 0,
        status: values.status ? 1 : 0,
      }

      const res = editingItem
        ? await updateLangCountry(editingItem.id, payload)
        : await createLangCountry(payload)

      if (res.code === 200) {
        message.success(editingItem ? '地区映射已更新' : '地区映射已创建')
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

  const handleDelete = async (item: LangCountry) => {
    const res = await deleteLangCountry(item.id)
    if (res.code === 200) {
      message.success('地区映射已删除')
      fetchList(list.length === 1 && pagination.current > 1 ? pagination.current - 1 : pagination.current)
    } else {
      message.error(res.message || '删除失败')
    }
  }

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) return
    Modal.confirm({
      title: '确认批量删除',
      icon: <ExclamationCircleOutlined />,
      content: `确认删除选中的 ${selectedRowKeys.length} 条地区映射吗？`,
      okText: '删除',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/admin/lang_countries/batch-delete`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
            },
            body: JSON.stringify({ ids: selectedRowKeys }),
          })
          const data = await response.json()
          if (data.code === 200 || data.code === 0) {
            message.success('批量删除成功')
            setSelectedRowKeys([])
            fetchList()
          } else {
            message.error(data.message || data.msg || '批量删除失败')
          }
        } catch (error) {
          message.error('批量删除失败')
        }
      },
    })
  }

  const handleStatusChange = async (item: LangCountry, checked: boolean) => {
    const res = await updateLangCountryStatus(item.id, checked ? 1 : 0)
    if (res.code === 200) {
      message.success('状态已更新')
      setList((prev) => prev.map((row) => (row.id === item.id ? { ...row, status: checked ? 1 : 0 } : row)))
    } else {
      message.error(res.message || '状态更新失败')
    }
  }

  return (
    <Card
      title="浏览器语言映射"
      extra={
        <Space>
          <Input.Search
            placeholder="搜索 code 或地区名"
            allowClear
            onSearch={(value) => {
              setKeyword(value)
              fetchList(1, pagination.pageSize, value)
            }}
            style={{ width: 240 }}
          />
          <Button onClick={() => { setKeyword(''); setSelectedRowKeys([]); fetchList(1, pagination.pageSize, ''); }}>重置</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            新增映射
          </Button>
          {selectedRowKeys.length > 0 && (
            <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>
              批量删除 ({selectedRowKeys.length})
            </Button>
          )}
        </Space>
      }
    >
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
          { title: '浏览器语言', dataIndex: 'code', render: (value) => <code>{value}</code> },
          { title: '地区名称', dataIndex: 'name' },
          { title: '关联语言', dataIndex: 'link_lang', render: (value) => value || '-' },
          {
            title: '状态',
            width: 110,
            render: (_, item) => (
              <Switch
                checked={item.status === 1}
                checkedChildren="启用"
                unCheckedChildren="禁用"
                onChange={(checked) => handleStatusChange(item, checked)}
              />
            ),
          },
          {
            title: '操作',
            width: 160,
            render: (_, item) => (
              <Space size="small">
                <Button type="link" onClick={() => openEditModal(item)}>
                  编辑
                </Button>
                <Popconfirm
                  title="删除地区映射"
                  description="确认删除这条浏览器语言映射吗？"
                  onConfirm={() => handleDelete(item)}
                  okText="确认"
                  cancelText="取消"
                >
                  <Button type="link" danger>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editingItem ? '编辑地区映射' : '新增地区映射'}
        open={open}
        onOk={handleSave}
        onCancel={() => setOpen(false)}
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="地区名称" rules={[{ required: true, message: '请输入地区名称' }]}>
            <Input placeholder="如：中文（中国大陆）、English (United States)" />
          </Form.Item>
          <Form.Item name="code" label="浏览器语言标识" rules={[{ required: true, message: '请输入浏览器语言标识' }]}>
            <Input placeholder="如：zh-CN、en-US、ja-JP" />
          </Form.Item>
          <Form.Item name="type_id" label="关联语言类型">
            <Select
              allowClear
              placeholder="请选择关联语言"
              options={langTypes.map((item) => ({
                label: `${item.language_name} (${item.file_name})`,
                value: item.id,
              }))}
            />
          </Form.Item>
          <Form.Item name="status" label="启用状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
