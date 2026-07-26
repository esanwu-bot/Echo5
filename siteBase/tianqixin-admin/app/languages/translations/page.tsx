'use client'

import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Spin, Table, Tag, message } from 'antd'
import { PlusOutlined, TranslationOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import {
  batchTranslate,
  deleteLangCode,
  getLangCodeInfo,
  getLangCodes,
  saveLangCode,
  translateText,
} from '@/lib/api/lang-code'
import { getLangTypes, type LangType } from '@/lib/api/lang-type'
import { API_BASE_URL } from '@/lib/api/config'

type LangCodeRow = {
  id?: number
  type_id: number
  language_name?: string
  lang_explain: string
}

// file_name -> 中文显示名映射
const LANG_LABEL_MAP: Record<string, string> = {
  'zh-CN': '中文',
  'en-US': '英语',
  'ja-JP': '日语',
  'ko-KR': '韩语',
}

const getLangLabel = (fileName: string): string =>
  LANG_LABEL_MAP[fileName] || fileName

export default function TranslationsPage() {
  const [list, setList] = useState<any[]>([])
  const [langTypes, setLangTypes] = useState<LangType[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [batchLoading, setBatchLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [filters, setFilters] = useState({ lang_code: '', module: '', remarks: '' })
  const [moduleOptions, setModuleOptions] = useState<string[]>([])
  const [langCodeOptions, setLangCodeOptions] = useState<string[]>([])
  const [batchTypeId, setBatchTypeId] = useState<number | undefined>()
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [editing, setEditing] = useState<{ code?: string; remarks: string; edit: number; is_admin: number; list: LangCodeRow[] }>({
    remarks: '',
    edit: 0,
    is_admin: 1,
    list: [],
  })

  const activeTypes = useMemo(() => langTypes.filter((item) => item.status === 1 && item.is_del !== 1), [langTypes])

  const buildEmptyRows = (currentRows?: LangCodeRow[]) =>
    activeTypes.map((type) => ({
      id: currentRows?.find((row) => row.type_id === type.id)?.id,
      type_id: type.id,
      language_name: type.language_name,
      lang_explain: currentRows?.find((row) => row.type_id === type.id)?.lang_explain || '',
    }))

  const fetchTypes = async () => {
    const res = await getLangTypes({ page: 1, limit: 200 })
    if (res.code === 200) {
      setLangTypes(res.data.list)
    }
  }

  const fetchList = async (
    page = pagination.current,
    pageSize = pagination.pageSize,
    nextFilters: typeof filters = filters
  ) => {
    setLoading(true)
    try {
      const res = await getLangCodes({
        page,
        limit: pageSize,
        lang_code: nextFilters.lang_code || undefined,
        module: nextFilters.module || undefined,
        remarks: nextFilters.remarks || undefined,
      })
      if (res.code === 200) {
        setList(res.data.list)
        setPagination({ current: page, pageSize, total: res.data.count })
        if (res.data.moduleOptions) setModuleOptions(res.data.moduleOptions)
        if (res.data.langCodeOptions) setLangCodeOptions(res.data.langCodeOptions)
      } else {
        message.error(res.message || '获取翻译词条失败')
      }
    } catch (error) {
      console.error(error)
      message.error('获取翻译词条失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTypes()
  }, [])

  useEffect(() => {
    fetchList(1, pagination.pageSize)
  }, [filters.lang_code, filters.module])

  useEffect(() => {
    if (activeTypes.length && !editing.list.length) {
      setEditing((prev) => ({ ...prev, list: buildEmptyRows() }))
    }
  }, [activeTypes.length])

  const openCreateModal = () => {
    setEditing({
      remarks: '',
      edit: 0,
      is_admin: 1,
      list: buildEmptyRows(),
    })
    setOpen(true)
  }

  const openEditModal = async (code: string) => {
    setLoading(true)
    try {
      const res = await getLangCodeInfo(code)
      if (res.code === 200) {
        setEditing({
          code: res.data.code,
          remarks: res.data.remarks,
          edit: 1,
          is_admin: filters.is_admin,
          list: buildEmptyRows(res.data.list),
        })
        setOpen(true)
      } else {
        message.error(res.message || '获取词条详情失败')
      }
    } catch (error) {
      console.error(error)
      message.error('获取词条详情失败')
    } finally {
      setLoading(false)
    }
  }

  const handleMachineTranslate = async () => {
    if (!editing.remarks.trim()) {
      message.warning('请先输入中文标识')
      return
    }

    setTranslating(true)
    try {
      const res = await translateText(editing.remarks)
      console.log('[translate] res:', res)
      if (res.code === 200 && res.data) {
        const translatedMap = res.data
        console.log('[translate] translatedMap:', translatedMap, 'activeTypes:', activeTypes.map(t => ({ id: t.id, file_name: t.file_name })))
        setEditing((prev) => {
          console.log('[translate] prev.list type_ids:', prev.list.map(r => r.type_id))
          const newList = prev.list.map((row) => {
            const type = activeTypes.find((t) => t.id === row.type_id)
            const key = type?.file_name ?? String(row.type_id)
            const val = translatedMap[key]
            console.log('[translate] row.type_id:', row.type_id, '→ key:', key, '→ val:', val)
            return val ? { ...row, lang_explain: val } : row
          })
          console.log('[translate] newList:', newList.map(r => ({ type_id: r.type_id, lang_explain: r.lang_explain })))
          return { ...prev, list: newList }
        })
        message.success('机器翻译已完成')
      } else {
        message.error(res.message || '机器翻译失败')
      }
    } catch (error) {
      console.error(error)
      message.error('机器翻译失败')
    } finally {
      setTranslating(false)
    }
  }

  const handleSave = async () => {
    if (!editing.remarks.trim()) {
      message.error('请输入中文标识')
      return
    }

    setSaving(true)
    try {
      const res = await saveLangCode({
        code: editing.code,
        remarks: editing.remarks,
        edit: editing.edit,
        is_admin: editing.is_admin,
        list: editing.list.map((row) => ({
          id: row.id,
          type_id: row.type_id,
          lang_explain: row.lang_explain,
        })),
      })
      if (res.code === 200) {
        message.success('翻译词条已保存')
        setOpen(false)
        fetchList()
      } else {
        message.error(res.message || '保存失败')
      }
    } catch (error) {
      console.error(error)
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (code: string) => {
    const res = await deleteLangCode(code)
    if (res.code === 200) {
      message.success('翻译词条已删除')
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
      content: `确认删除选中的 ${selectedRowKeys.length} 条翻译词条吗？`,
      okText: '删除',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/admin/translations/batch-delete`, {
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

  const handleBatchTranslate = async () => {
    const targetType = activeTypes.find((item) => item.id === batchTypeId)
    if (!targetType) {
      message.warning('请选择目标语言')
      return
    }

    setBatchLoading(true)
    try {
      const res = await batchTranslate(targetType.id, targetType.file_name)
      if (res.code === 200) {
        message.success('批量翻译任务已执行')
        fetchList()
      } else {
        message.error(res.message || '批量翻译失败')
      }
    } catch (error) {
      console.error(error)
      message.error('批量翻译失败')
    } finally {
      setBatchLoading(false)
    }
  }

  return (
    <Card
      title="翻译词条管理"
      extra={
        <Space wrap>
          <span style={{ lineHeight: '32px', whiteSpace: 'nowrap' }}>模块：</span>
          <Select
            allowClear
            placeholder="全部模块"
            style={{ width: 160 }}
            value={filters.module || undefined}
            onChange={(value) => setFilters((prev) => ({ ...prev, module: value || '' }))}
            options={moduleOptions.map((m) => ({ label: m, value: m }))}
          />
          <span style={{ lineHeight: '32px', whiteSpace: 'nowrap' }}>语言：</span>
          <Select
            allowClear
            placeholder="全部语言"
            style={{ width: 160 }}
            value={filters.lang_code || undefined}
            onChange={(value) => setFilters((prev) => ({ ...prev, lang_code: value || '' }))}
            options={langCodeOptions.map((l) => ({ label: l, value: l }))}
          />
          <span style={{ lineHeight: '32px', whiteSpace: 'nowrap' }}>关键词：</span>
          <Input.Search
            allowClear
            placeholder="搜索中文标识"
            style={{ width: 220 }}
            onSearch={(value) => {
              const next = { ...filters, remarks: value }
              setFilters(next)
              fetchList(1, pagination.pageSize, next)
            }}
          />
          <Select
            allowClear
            placeholder="批量翻译到"
            value={batchTypeId}
            style={{ width: 180 }}
            onChange={setBatchTypeId}
            options={activeTypes.filter((item) => item.file_name !== 'zh-CN').map((item) => ({
              label: `${item.language_name} (${item.file_name})`,
              value: item.id,
            }))}
          />
          <Button onClick={() => {
            setFilters({ lang_code: '', module: '', remarks: '' });
            setPagination(prev => ({ ...prev, current: 1 }));
            setSelectedRowKeys([]);
            fetchList(1, pagination.pageSize, { lang_code: '', module: '', remarks: '' });
          }}>重置</Button>
          <Button icon={<TranslationOutlined />} loading={batchLoading} onClick={handleBatchTranslate}>
            批量翻译
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            新增词条
          </Button>
          {selectedRowKeys.length > 0 && (
            <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>
              批量删除 ({selectedRowKeys.length})
            </Button>
          )}
        </Space>
      }
    >
      {/* 词条筛选提示已隐藏 */}

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
          { title: '字段', dataIndex: 'remarks', ellipsis: true },
          { title: '翻译内容', dataIndex: 'lang_explain', ellipsis: true },
          { title: '模块', dataIndex: 'module', width: 100, render: (value: string) => <Tag color="blue">{value || '-'}</Tag> },
          { title: '业务ID', dataIndex: 'business_id', width: 80 },
          { title: '语言', dataIndex: 'language_name', width: 100 },
          {
            title: '操作',
            width: 160,
            render: (_, item) => (
              <Space size="small">
                <Button type="link" onClick={() => openEditModal(item.code)}>
                  编辑
                </Button>
                <Popconfirm
                  title="删除翻译词条"
                  description="确认删除这组语言版本吗？"
                  onConfirm={() => handleDelete(item.code)}
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
        title={editing.edit ? '编辑翻译词条' : '新增翻译词条'}
        open={open}
        onOk={handleSave}
        onCancel={() => setOpen(false)}
        confirmLoading={saving}
        width={880}
        destroyOnHidden
      >
        <Form layout="vertical">
          <Form.Item label="应用端">
            <Select
              value={editing.is_admin}
              style={{ width: 160 }}
              onChange={(value) => setEditing((prev) => ({ ...prev, is_admin: value }))}
              options={[
                { label: '管理后台', value: 1 },
                { label: '用户前端', value: 2 },
              ]}
            />
          </Form.Item>

          <Form.Item label="中文标识">
            <Input.Search
              value={editing.remarks}
              onChange={(event) => setEditing((prev) => ({ ...prev, remarks: event.target.value }))}
              onSearch={handleMachineTranslate}
              enterButton={<><TranslationOutlined /> 机器翻译</>}
              placeholder="请输入中文原文或动态内容标识"
              loading={translating}
            />
          </Form.Item>

          <Spin spinning={translating}>
            <Table
              rowKey="type_id"
              pagination={false}
              size="small"
              dataSource={editing.list}
              columns={[
                {
                  title: '语言',
                  dataIndex: 'language_name',
                  width: 220,
                  render: (_, row) => {
                    const target = activeTypes.find((item) => item.id === row.type_id)
                    return target ? getLangLabel(target.file_name) : (row.language_name || '')
                  },
                },
                {
                  title: '翻译内容',
                  dataIndex: 'lang_explain',
                  render: (value, row) => (
                    <Input
                      value={value}
                      onChange={(event) =>
                        setEditing((prev) => ({
                          ...prev,
                          list: prev.list.map((item) =>
                            item.type_id === row.type_id ? { ...item, lang_explain: event.target.value } : item
                          ),
                        }))
                      }
                    />
                  ),
                },
              ]}
            />
          </Spin>
        </Form>
      </Modal>
    </Card>
  )
}
