"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useTranslation } from 'react-i18next'
import { seriesApi, type SeriesDetail, type SeriesModelItem, type BOMItem } from "../../lib/api-client"
import { Loader2, Search, Download, ShoppingCart, ChevronLeft, ChevronRight, Scale } from "lucide-react"
import { toast } from "sonner"
import { ModelDetailDrawer } from "../../components/ModelDetail/ModelDetail"

// TQX Design System - aligned with prototype parametric-list.html
const RED_PRIMARY = '#e60012'
const RED_50 = '#fef2f2'
const NEUTRAL_50 = '#fafafa'
const NEUTRAL_100 = '#f5f5f5'
const NEUTRAL_200 = '#e0e0e0'
const NEUTRAL_300 = '#b3b3b3'
const NEUTRAL_400 = '#999999'
const NEUTRAL_500 = '#666666'
const NEUTRAL_600 = '#555555'
const NEUTRAL_700 = '#444444'
const NEUTRAL_800 = '#333333'
const SUCCESS_600 = '#00802b'
const ERROR_500 = '#cc0000'

interface SeriesFilterDef {
  name: string
  label: string
  values: string[]
}

const PAGE_SIZE = 20

export function ModelMatrixPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()

  const [series, setSeries] = useState<SeriesDetail | null>(null)
  const [models, setModels] = useState<SeriesModelItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(() => {
    const p = searchParams.get('page')
    return p ? Math.max(1, parseInt(p)) : 1
  })
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // 从 URL 获取 keyword，并同步到 URL
  const [keyword, setKeyword] = useState(() => searchParams.get('keyword') || '')
  const [inStockOnly, setInStockOnly] = useState(() => searchParams.get('in_stock') === 'true')
  const [paramFilters, setParamFilters] = useState<Record<string, string[]>>(() => {
    const filtersParam = searchParams.get('filters')
    if (filtersParam) {
      try {
        return JSON.parse(filtersParam)
      } catch {
        return {}
      }
    }
    return {}
  })
  const [dynamicFilters, setDynamicFilters] = useState<SeriesFilterDef[]>([])
  const [filtersLoading, setFiltersLoading] = useState(false)
  const [sortField, setSortField] = useState<string>(() => searchParams.get('sort_field') || 'id')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => (searchParams.get('sort_order') as 'asc' | 'desc') || 'asc')
  const [exporting, setExporting] = useState(false)

  // Checkbox 选中的型号 ID（用于底部栏显示"已选 N 个型号"）
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [drawerModelId, setDrawerModelId] = useState<string | null>(null)
  const [bomList, setBomList] = useState<BOMItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('bomList') || '[]') } catch { return [] }
  })

  // 对比列表（最多 4 个）
  const [compareList, setCompareList] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem('compareModels')
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return (Array.isArray(parsed) ? parsed : []).filter((id: unknown) => typeof id === 'number' && id > 0)
    } catch {
      return []
    }
  })

  // 同步 keyword 到 URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    if (keyword) {
      params.set('keyword', keyword)
    } else {
      params.delete('keyword')
    }
    if (page > 1) {
      params.set('page', String(page))
    } else {
      params.delete('page')
    }
    setSearchParams(params, { replace: true })
  }, [keyword, page])

  // BOM 事件派发
  useEffect(() => {
    localStorage.setItem('bomList', JSON.stringify(bomList))
    window.dispatchEvent(new Event('bomListUpdated'))
  }, [bomList])

  // 对比列表变更时同步到 localStorage
  useEffect(() => {
    localStorage.setItem('compareModels', JSON.stringify(compareList))
    window.dispatchEvent(new Event('compareListUpdated'))
  }, [compareList])

  // 加载系列详情
  useEffect(() => {
    if (id) {
      seriesApi.getSeriesDetail(Number(id)).then(res => {
        if (res.code === 200) setSeries(res.data)
      }).catch(console.error)
    }
  }, [id])

  // 加载筛选器定义
  useEffect(() => {
    if (id) {
      setFiltersLoading(true)
      seriesApi.getSeriesFilters(Number(id))
        .then(res => {
          if (res.code === 200) setDynamicFilters(res.data || [])
        })
        .catch(console.error)
        .finally(() => setFiltersLoading(false))
    }
  }, [id])

  // 加载型号列表
  const fetchModels = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      const res = await seriesApi.getSeriesModels(Number(id), {
        keyword: keyword || undefined,
        in_stock: inStockOnly || undefined,
        param_filters: Object.keys(paramFilters).length > 0 ? paramFilters : undefined,
        sort_field: sortField,
        sort_order: sortOrder,
        page,
        page_size: PAGE_SIZE,
      })
      if (res.code === 200) {
        setModels(res.data.models)
        setTotal(res.data.pagination.total)
        setTotalPages(res.data.pagination.total_pages)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [id, keyword, inStockOnly, paramFilters, page, sortField, sortOrder])

  useEffect(() => {
    fetchModels()
  }, [fetchModels])

  // 参数 ID 到筛选名称的映射
  const paramIdToFilterName = useMemo(() => {
    const map: Record<number, string> = {}
    if (!dynamicFilters.length || !models.length) return map
    const filterValueSets: Record<string, Set<string>> = {}
    dynamicFilters.forEach(f => {
      filterValueSets[f.name] = new Set(f.values || [])
    })
    for (const model of models) {
      for (const p of model.params || []) {
        if (!p.value || map[p.param_id] !== undefined) continue
        for (const f of dynamicFilters) {
          if (filterValueSets[f.name]?.has(String(p.value))) {
            map[p.param_id] = f.name
            break
          }
        }
      }
    }
    return map
  }, [models, dynamicFilters])

  const getParamValue = (model: SeriesModelItem, filterName: string): string => {
    const param = model.params?.find(p => paramIdToFilterName[p.param_id] === filterName)
    return param?.value || ''
  }

  const getModelPrice = (model: SeriesModelItem): string => {
    const unitPrice = (model as any).unit_price
    if (unitPrice !== undefined && unitPrice !== null && unitPrice !== '') {
      return String(unitPrice)
    }
    return ''
  }

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedIds.size === models.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(models.map(m => m.id)))
    }
  }

  // 单行勾选
  const toggleSelect = (modelId: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(modelId)) {
        next.delete(modelId)
      } else {
        next.add(modelId)
      }
      return next
    })
  }

  // 加入 BOM
  const addToBOM = (model: SeriesModelItem) => {
    setBomList(prev => {
      const existing = prev.find(b => b.model_id === model.id)
      if (existing) {
        return prev.map(b => b.model_id === model.id ? { ...b, quantity: b.quantity + 1 } : b)
      }
      return [...prev, {
        model_id: model.id,
        model_code: model.model_code,
        model_name: model.model_name,
        brand_name: model.brand_name,
        quantity: 1,
        stock: model.stock,
      }]
    })
  }

  // 批量加入 BOM
  const addSelectedToBOM = () => {
    const selectedModels = models.filter(m => selectedIds.has(m.id))
    setBomList(prev => {
      const updated = [...prev]
      for (const model of selectedModels) {
        const existing = updated.find(b => b.model_id === model.id)
        if (existing) {
          existing.quantity += 1
        } else {
          updated.push({
            model_id: model.id,
            model_code: model.model_code,
            model_name: model.model_name,
            brand_name: model.brand_name,
            quantity: 1,
            stock: model.stock,
          })
        }
      }
      return updated
    })
    setSelectedIds(new Set())
  }

  // 批量加入对比（最多 4 个，去重）
  const addSelectedToCompare = () => {
    const selectedModelIds = models.filter(m => selectedIds.has(m.id)).map(m => m.id)
    if (selectedModelIds.length === 0) {
      toast.info(t('请先选择要对比的型号'))
      return
    }

    setCompareList(prev => {
      const merged = Array.from(new Set([...prev, ...selectedModelIds]))
      if (merged.length > 4) {
        toast.warning(t('对比列表最多只能添加 4 个型号，当前已选 {count} 个，超出部分将被忽略', { count: selectedModelIds.length }))
        return merged.slice(0, 4)
      }
      toast.success(t('已加入对比'))
      return merged
    })
  }

  // 切换筛选
  const toggleParamFilter = (filterName: string, value: string) => {
    setParamFilters(prev => {
      const current = prev[filterName] || []
      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value]
      const updated = { ...prev }
      if (next.length > 0) {
        updated[filterName] = next
      } else {
        delete updated[filterName]
      }
      return updated
    })
    setPage(1)
  }

  // 重置筛选
  const resetFilters = () => {
    setKeyword('')
    setInStockOnly(false)
    setParamFilters({})
    setSortField('id')
    setSortOrder('asc')
    setPage(1)
  }

  // 库存颜色
  const stockColor = (stock: number) => {
    if (stock > 0) return SUCCESS_600
    return ERROR_500
  }

  // 排序
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
    setPage(1)
  }

  // 导出
  const handleExport = async () => {
    if (!id || models.length === 0) return
    setExporting(true)
    try {
      const blob = await seriesApi.exportSeriesModels(Number(id), {
        keyword: keyword || undefined,
        in_stock: inStockOnly || undefined,
        param_filters: Object.keys(paramFilters).length > 0 ? paramFilters : undefined,
      })
      if (blob instanceof Blob) {
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${series?.name || 'series'}_models.xlsx`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('导出失败', err)
    }
    setExporting(false)
  }

  // 表格参数筛选列（排除封装）
  const tableParamFilters = useMemo(
    () => dynamicFilters.filter(f => f.name !== 'package_type'),
    [dynamicFilters]
  )

  const colSpan = 6 + tableParamFilters.length

  return (
    <div style={{ minHeight: '100vh', background: NEUTRAL_50 }}>
      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 20px 16px', display: 'flex', gap: 0 }}>
        {/* ====== 左侧筛选侧边栏 ====== */}
        <aside
          style={{
            width: '220px',
            minWidth: '220px',
            flexShrink: 0,
            borderRight: `1px solid ${NEUTRAL_200}`,
            marginRight: '20px',
            background: '#fff',
            maxHeight: 'calc(100vh - 180px)',
            overflowY: 'auto',
            position: 'sticky',
            top: '90px',
          }}
          className="hidden lg:block"
        >
          <h3 style={{
            fontSize: '14px',
            fontWeight: 600,
            padding: '12px 12px',
            borderBottom: `1px solid ${NEUTRAL_200}`,
            color: NEUTRAL_800,
          }}>
            {t('参数筛选')}
          </h3>

          {/* 关键词搜索 */}
          <div style={{ padding: '12px 12px', borderBottom: `1px solid ${NEUTRAL_100}` }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: NEUTRAL_400 }} />
              <input
                type="text"
                value={keyword}
                onChange={e => { setKeyword(e.target.value); setPage(1) }}
                placeholder={t('搜索型号...')}
                style={{
                  width: '100%',
                  paddingLeft: '32px',
                  paddingRight: '12px',
                  paddingTop: '8px',
                  paddingBottom: '8px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: `1px solid ${NEUTRAL_200}`,
                  outline: 'none',
                  color: NEUTRAL_800,
                  background: '#fff',
                }}
              />
            </div>
          </div>

          {/* 仅显示有库存 */}
          <div style={{ padding: '12px 12px', borderBottom: `1px solid ${NEUTRAL_100}` }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={e => { setInStockOnly(e.target.checked); setPage(1) }}
                style={{
                  width: '14px',
                  height: '14px',
                  border: `1.5px solid ${NEUTRAL_300}`,
                  borderRadius: '2px',
                  accentColor: RED_PRIMARY,
                }}
              />
              <span style={{ fontSize: '12px', color: NEUTRAL_600 }}>{t('有库存')}</span>
            </label>
          </div>

          {/* 动态参数筛选 */}
          {filtersLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
              <Loader2 size={20} style={{ color: RED_PRIMARY, animation: 'spin 1s linear infinite' }} />
            </div>
          ) : dynamicFilters.length === 0 ? (
            <div style={{ fontSize: '12px', padding: '16px 12px', color: NEUTRAL_400 }}>{t('暂无筛选参数')}</div>
          ) : (
            dynamicFilters.map(filter => (
              <div key={filter.name} style={{ borderBottom: `1px solid ${NEUTRAL_100}` }}>
                <p style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  padding: '12px 12px 8px',
                  color: NEUTRAL_700,
                }}>
                  {filter.label}
                </p>
                <div style={{ padding: '0 12px 8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {filter.values?.map(value => (
                    <label
                      key={value}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '6px' }}
                    >
                      <input
                        type="checkbox"
                        checked={(paramFilters[filter.name] || []).includes(value)}
                        onChange={() => toggleParamFilter(filter.name, value)}
                        style={{
                          width: '14px',
                          height: '14px',
                          border: `1.5px solid ${NEUTRAL_300}`,
                          borderRadius: '2px',
                          accentColor: RED_PRIMARY,
                        }}
                      />
                      <span
                        style={{ fontSize: '12px', color: NEUTRAL_600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={value}
                      >
                        {value}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))
          )}

          {/* 重置按钮 */}
          <div style={{ padding: '12px 12px' }}>
            <button
              onClick={resetFilters}
              style={{
                width: '100%',
                height: '32px',
                fontSize: '12px',
                fontWeight: 500,
                borderRadius: '6px',
                border: `1px solid ${RED_PRIMARY}`,
                background: 'transparent',
                color: RED_PRIMARY,
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseOver={e => e.currentTarget.style.background = RED_50}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              {t('重置筛选')}
            </button>
          </div>
        </aside>

        {/* ====== 右侧内容区 ====== */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* 面包屑 & 操作栏 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: NEUTRAL_400 }}>
              <Link to="/" style={{ color: NEUTRAL_500, textDecoration: 'none' }}>{t('首页')}</Link>
              <span>/</span>
              <span style={{ color: NEUTRAL_600 }}>{series?.name || ''}</span>
              <span>/</span>
              <span style={{ color: NEUTRAL_800, fontWeight: 500 }}>{t('型号选型')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '12px', color: NEUTRAL_500 }}>
                {t('共')} <strong style={{ color: NEUTRAL_800 }}>{total}</strong> {t('个型号')}
              </span>
              <button
                onClick={addSelectedToCompare}
                disabled={selectedIds.size === 0}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0 12px',
                  height: '28px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: `1px solid ${RED_PRIMARY}`,
                  background: '#fff',
                  color: RED_PRIMARY,
                  cursor: selectedIds.size === 0 ? 'not-allowed' : 'pointer',
                  opacity: selectedIds.size === 0 ? 0.5 : 1,
                  transition: 'background 0.15s',
                }}
                onMouseOver={e => { if (selectedIds.size > 0) e.currentTarget.style.background = RED_50 }}
                onMouseOut={e => e.currentTarget.style.background = '#fff'}
              >
                <Scale size={13} />
                {t('型号对比')}
              </button>
              <button
                onClick={handleExport}
                disabled={exporting || models.length === 0}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0 12px',
                  height: '28px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: `1px solid ${NEUTRAL_300}`,
                  background: '#fff',
                  color: NEUTRAL_600,
                  cursor: exporting || models.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: exporting || models.length === 0 ? 0.5 : 1,
                  transition: 'border-color 0.15s',
                }}
                onMouseOver={e => e.currentTarget.style.borderColor = NEUTRAL_400}
                onMouseOut={e => e.currentTarget.style.borderColor = NEUTRAL_300}
              >
                {exporting ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={13} />}
                {t('导出Excel')}
              </button>
            </div>
          </div>

          {/* 表格卡片 */}
          <div style={{
            borderRadius: '8px',
            border: `1px solid ${NEUTRAL_200}`,
            background: '#fff',
            boxShadow: '0 1px 2px rgba(0,0,0,.04)',
            overflow: 'hidden',
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontFamily: 'Noto Sans SC, Roboto, sans-serif' }}>
                <thead>
                  <tr style={{ background: NEUTRAL_100 }}>
                    <th style={{ padding: '10px 12px', width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.size === models.length && models.length > 0}
                        onChange={toggleSelectAll}
                        style={{
                          width: '16px',
                          height: '16px',
                          border: `2px solid ${NEUTRAL_300}`,
                          borderRadius: '2px',
                          accentColor: RED_PRIMARY,
                        }}
                      />
                    </th>
                    <th
                      style={{ padding: '10px 12px', width: '140px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: NEUTRAL_700, whiteSpace: 'nowrap', cursor: 'pointer' }}
                      onClick={() => handleSort('model_code')}
                    >
                      MPN {sortField === 'model_code' && <span style={{ fontSize: '12px', color: RED_PRIMARY }}>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                    </th>
                    {tableParamFilters.map(filter => (
                      <th
                        key={filter.name}
                        style={{ padding: '10px 12px', width: '100px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: NEUTRAL_700, whiteSpace: 'nowrap' }}
                      >
                        {filter.label}
                      </th>
                    ))}
                    <th style={{ padding: '10px 12px', width: '100px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: NEUTRAL_700, whiteSpace: 'nowrap' }}>{t('封装')}</th>
                    <th
                      style={{ padding: '10px 12px', width: '80px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: NEUTRAL_700, whiteSpace: 'nowrap', cursor: 'pointer' }}
                      onClick={() => handleSort('stock')}
                    >
                      {t('库存')} {sortField === 'stock' && <span style={{ fontSize: '12px', color: RED_PRIMARY }}>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                    </th>
                    <th
                      style={{ padding: '10px 12px', width: '100px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: NEUTRAL_700, whiteSpace: 'nowrap', cursor: 'pointer' }}
                      onClick={() => handleSort('unit_price')}
                    >
                      {t('单价')} {sortField === 'unit_price' && <span style={{ fontSize: '12px', color: RED_PRIMARY }}>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                    </th>
                    <th style={{ padding: '10px 12px', width: '100px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: NEUTRAL_700, whiteSpace: 'nowrap' }}>{t('操作')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={colSpan} style={{ textAlign: 'center', padding: '64px 0' }}>
                        <Loader2 size={28} style={{ color: RED_PRIMARY, animation: 'spin 1s linear infinite' }} />
                      </td>
                    </tr>
                  ) : models.length === 0 ? (
                    <tr>
                      <td colSpan={colSpan} style={{ textAlign: 'center', padding: '64px 0', color: NEUTRAL_500 }}>
                        {t('未找到匹配的型号')}
                      </td>
                    </tr>
                  ) : (
                    models.map((model, rowIdx) => (
                      <tr
                        key={model.id}
                        style={{
                          borderBottom: `1px solid ${NEUTRAL_100}`,
                          background: rowIdx % 2 === 0 ? '#fff' : NEUTRAL_50,
                          transition: 'background 0.15s',
                        }}
                        onMouseOver={e => e.currentTarget.style.background = RED_50}
                        onMouseOut={e => e.currentTarget.style.background = rowIdx % 2 === 0 ? '#fff' : NEUTRAL_50}
                      >
                        <td style={{ padding: '10px 12px' }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(model.id)}
                            onChange={() => toggleSelect(model.id)}
                            style={{
                              width: '16px',
                              height: '16px',
                              border: `2px solid ${NEUTRAL_300}`,
                              borderRadius: '2px',
                              accentColor: RED_PRIMARY,
                            }}
                          />
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'left' }}>
                          <Link
                            to={`/models/${model.id}`}
                            style={{
                              fontSize: '12px',
                              fontWeight: 500,
                              color: NEUTRAL_800,
                              textDecoration: 'none',
                              fontFamily: 'JetBrains Mono, monospace',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'block',
                            }}
                          >
                            {model.model_code}
                          </Link>
                        </td>
                        {tableParamFilters.map(filter => (
                          <td key={filter.name} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: NEUTRAL_600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {getParamValue(model, filter.name) || '-'}
                          </td>
                        ))}
                        <td style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: NEUTRAL_600 }}>
                          {model.package_type || '-'}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: stockColor(model.stock), fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
                          {model.stock > 0 ? model.stock.toLocaleString() : '0'}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 500, color: NEUTRAL_800, fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
                          {getModelPrice(model) ? `$${getModelPrice(model)} USD` : '-'}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <button
                              onClick={() => setDrawerModelId(String(model.id))}
                              style={{
                                fontSize: '12px',
                                padding: '2px 8px',
                                border: `1px solid ${RED_PRIMARY}`,
                                color: selectedIds.has(model.id) ? RED_PRIMARY : RED_PRIMARY,
                                background: selectedIds.has(model.id) ? RED_50 : 'transparent',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                fontWeight: selectedIds.has(model.id) ? 500 : 400,
                                transition: 'background 0.15s',
                              }}
                              onMouseOver={e => { e.currentTarget.style.background = RED_50 }}
                              onMouseOut={e => { e.currentTarget.style.background = selectedIds.has(model.id) ? RED_50 : 'transparent' }}
                            >
                              {t('核心参数')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderTop: `1px solid ${NEUTRAL_100}`,
                background: NEUTRAL_50,
              }}>
                <span style={{ fontSize: '12px', color: NEUTRAL_500 }}>
                  {t('第')} {models.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}-{(page - 1) * PAGE_SIZE + models.length} {t('条')}，{t('共')} {total} {t('条')}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    style={{
                      minWidth: '32px',
                      height: '32px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '4px',
                      border: `1px solid ${NEUTRAL_200}`,
                      background: '#fff',
                      color: page <= 1 ? NEUTRAL_400 : NEUTRAL_700,
                      cursor: page <= 1 ? 'not-allowed' : 'pointer',
                      opacity: page <= 1 ? 0.4 : 1,
                      transition: 'all 0.15s',
                    }}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    const start = Math.max(1, page - 3)
                    const p = start + i
                    if (p > totalPages) return null
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        style={{
                          minWidth: '32px',
                          height: '32px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '13px',
                          borderRadius: '4px',
                          border: p === page ? 'none' : `1px solid ${NEUTRAL_200}`,
                          background: p === page ? RED_PRIMARY : '#fff',
                          color: p === page ? '#fff' : NEUTRAL_700,
                          fontWeight: p === page ? 600 : 400,
                          cursor: 'pointer',
                          padding: '0 10px',
                          transition: 'all 0.15s',
                        }}
                      >
                        {p}
                      </button>
                    )
                  })}
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    style={{
                      minWidth: '32px',
                      height: '32px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '4px',
                      border: `1px solid ${NEUTRAL_200}`,
                      background: '#fff',
                      color: page >= totalPages ? NEUTRAL_400 : NEUTRAL_700,
                      cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                      opacity: page >= totalPages ? 0.4 : 1,
                      transition: 'all 0.15s',
                    }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ====== 底部固定栏 ====== */}
      {(selectedIds.size > 0 || bomList.length > 0) && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          borderTop: `1px solid ${NEUTRAL_200}`,
          background: NEUTRAL_100,
          zIndex: 40,
        }}>
          <div style={{
            maxWidth: '1440px',
            margin: '0 auto',
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '48px',
          }}>
            <span style={{ fontSize: '12px', color: NEUTRAL_600 }}>
              {t('已选')} <strong style={{ color: RED_PRIMARY }}>{selectedIds.size + bomList.length}</strong> {t('个型号')}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {selectedIds.size > 0 && (
                <button
                  onClick={addSelectedToCompare}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0 16px',
                    height: '32px',
                    fontSize: '12px',
                    fontWeight: 500,
                    borderRadius: '6px',
                    border: `1px solid ${RED_PRIMARY}`,
                    background: '#fff',
                    color: RED_PRIMARY,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseOver={e => e.currentTarget.style.background = RED_50}
                  onMouseOut={e => e.currentTarget.style.background = '#fff'}
                >
                  <Scale size={14} />
                  {t('型号对比')}
                </button>
              )}
              {selectedIds.size > 0 && (
                <button
                  onClick={addSelectedToBOM}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0 16px',
                    height: '32px',
                    fontSize: '12px',
                    fontWeight: 500,
                    borderRadius: '6px',
                    border: `1px solid ${NEUTRAL_300}`,
                    background: '#fff',
                    color: NEUTRAL_700,
                    cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = NEUTRAL_400}
                  onMouseOut={e => e.currentTarget.style.borderColor = NEUTRAL_300}
                >
                  {t('加入BOM')}
                </button>
              )}
              <Link
                to="/bom"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0 16px',
                  height: '32px',
                  fontSize: '12px',
                  fontWeight: 500,
                  borderRadius: '6px',
                  border: `1px solid ${NEUTRAL_300}`,
                  background: '#fff',
                  color: NEUTRAL_700,
                  textDecoration: 'none',
                  transition: 'border-color 0.15s',
                }}
                onMouseOver={e => e.currentTarget.style.borderColor = NEUTRAL_400}
                onMouseOut={e => e.currentTarget.style.borderColor = NEUTRAL_300}
              >
                {t('查看清单')}
              </Link>
              <Link
                to={compareList.length > 0 ? `/compare?ids=${compareList.join(',')}` : '/compare'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0 16px',
                  height: '32px',
                  fontSize: '12px',
                  fontWeight: 500,
                  borderRadius: '6px',
                  border: `1px solid ${NEUTRAL_300}`,
                  background: '#fff',
                  color: NEUTRAL_700,
                  textDecoration: 'none',
                  transition: 'border-color 0.15s',
                }}
                onMouseOver={e => e.currentTarget.style.borderColor = NEUTRAL_400}
                onMouseOut={e => e.currentTarget.style.borderColor = NEUTRAL_300}
              >
                <Scale size={14} />
                {t('查看对比')}{compareList.length > 0 ? ` (${compareList.length})` : ''}
              </Link>
              <Link
                to="/bom"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0 20px',
                  height: '32px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  background: RED_PRIMARY,
                  color: '#fff',
                  textDecoration: 'none',
                  transition: 'background 0.15s',
                }}
                onMouseOver={e => e.currentTarget.style.background = '#c7000f'}
                onMouseOut={e => e.currentTarget.style.background = RED_PRIMARY}
              >
                {t('一键询价')}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 底部栏占位 */}
      {(selectedIds.size > 0 || bomList.length > 0) && <div style={{ height: '48px' }} />}

      {/* 型号详情抽屉 */}
      {drawerModelId && (
        <ModelDetailDrawer
          modelId={drawerModelId}
          onClose={() => setDrawerModelId(null)}
        />
      )}
    </div>
  )
}