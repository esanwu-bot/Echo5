"use client"

import { useEffect, useState, useMemo } from "react"
import { Link, useSearchParams, useNavigate } from "react-router-dom"
import { useTranslation } from 'react-i18next'
import { seriesApi, type SeriesItem } from "../../lib/api-client"
import { Loader2, ArrowRight, FileText, RotateCcw, ClipboardList } from "lucide-react"
import { CategorySidebar } from "../../components/CategorySidebar/CategorySidebar"

const BOM_STORAGE_KEY = "bomList"

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
const NEUTRAL_900 = '#1a1a1a'

const TEXT_PRIMARY = NEUTRAL_800
const TEXT_SECONDARY = NEUTRAL_500
const TEXT_MUTED = NEUTRAL_400
const BG_GRAY = NEUTRAL_50

interface FilterState {
  brandId: number | undefined
  packageType: string
  tolerance: string
  resistanceRange: { min?: number; max?: number } | undefined
}

interface CategoryAttributeItem {
  id?: number
  name?: string
  code?: string
  type?: string
  available_values?: string[]
  value_range?: { min?: number; max?: number }
}

export function SeriesListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [seriesList, setSeriesList] = useState<SeriesItem[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const categoryId = searchParams.get('category_id') ? Number(searchParams.get('category_id')) : undefined
  const keyword = searchParams.get('keyword') || ''
  const [categoryName, setCategoryName] = useState('')
  const [categoryNameEn, setCategoryNameEn] = useState('')
  const [categoryDescription, setCategoryDescription] = useState('')

  const [bomItemCount, setBomItemCount] = useState(0)
  const [bomList, setBomList] = useState<any[]>([])

  const [brandOptions, setBrandOptions] = useState<Array<{ id: number; name: string }>>([])
  const [packageOptions, setPackageOptions] = useState<string[]>([])
  const [toleranceOptions, setToleranceOptions] = useState<string[]>([])

  const [filters, setFilters] = useState<FilterState>(() => {
    const resistanceMin = searchParams.get('resistance_min')
    const resistanceMax = searchParams.get('resistance_max')
    return {
      brandId: searchParams.get('brand_id') ? Number(searchParams.get('brand_id')) : undefined,
      packageType: searchParams.get('package_type') || '',
      tolerance: searchParams.get('tolerance') || '',
      resistanceRange: resistanceMin || resistanceMax ? {
        min: resistanceMin ? Number(resistanceMin) : undefined,
        max: resistanceMax ? Number(resistanceMax) : undefined,
      } : undefined,
    }
  })

  useEffect(() => {
    const resistanceMin = searchParams.get('resistance_min')
    const resistanceMax = searchParams.get('resistance_max')
    setFilters({
      brandId: searchParams.get('brand_id') ? Number(searchParams.get('brand_id')) : undefined,
      packageType: searchParams.get('package_type') || '',
      tolerance: searchParams.get('tolerance') || '',
      resistanceRange: resistanceMin || resistanceMax ? {
        min: resistanceMin ? Number(resistanceMin) : undefined,
        max: resistanceMax ? Number(resistanceMax) : undefined,
      } : undefined,
    })
    setResistanceInput({
      min: searchParams.get('resistance_min') || '',
      max: searchParams.get('resistance_max') || '',
    })
  }, [searchParams])

  const [sortBy, setSortBy] = useState<'hot' | 'model_count' | 'newest'>('hot')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const [resistanceInput, setResistanceInput] = useState<{ min: string; max: string }>(() => ({
    min: searchParams.get('resistance_min') || '',
    max: searchParams.get('resistance_max') || '',
  }))

  const updateBomCount = () => {
    try {
      const raw = localStorage.getItem(BOM_STORAGE_KEY)
      if (raw) {
        const items = JSON.parse(raw)
        setBomItemCount(items.length || 0)
        setBomList(items)
      } else {
        setBomItemCount(0)
        setBomList([])
      }
    } catch {
      setBomItemCount(0)
      setBomList([])
    }
  }

  const addSeriesToBom = (series: SeriesItem) => {
    try {
      const bomList = localStorage.getItem(BOM_STORAGE_KEY)
      const items = bomList ? JSON.parse(bomList) : []
      const existingIndex = items.findIndex((item: any) => item.series_id === series.id)
      if (existingIndex >= 0) {
        items[existingIndex].quantity = (items[existingIndex].quantity || 1) + 1
      } else {
        items.push({
          series_id: series.id,
          series_name: series.name,
          series_name_en: series.name_en,
          brand_name: series.brand_name,
          model_code: series.name,
          model_name: series.name,
          quantity: 1,
          unit_price: 0,
          stock: 0,
        })
      }
      localStorage.setItem(BOM_STORAGE_KEY, JSON.stringify(items))
      window.dispatchEvent(new Event('bomListUpdated'))
      updateBomCount()
    } catch (err) {
      console.error('Failed to add series to BOM:', err)
    }
  }

  useEffect(() => {
    updateBomCount()
    window.addEventListener('bomListUpdated', updateBomCount)
    return () => window.removeEventListener('bomListUpdated', updateBomCount)
  }, [])

  useEffect(() => {
    if (!categoryId) {
      setCategoryName('')
      setCategoryNameEn('')
      setCategoryDescription('')
      return
    }
    seriesApi.getSeriesList({
      category_id: categoryId,
      page: 1,
      page_size: 1,
    }).then(res => {
      if (res.code === 200 && res.data.series && res.data.series.length > 0) {
        const first = res.data.series[0]
        const anyFirst = first as any
        if (anyFirst.category) {
          setCategoryName(anyFirst.category.name || '')
          setCategoryNameEn(anyFirst.category.name_en || '')
          setCategoryDescription(anyFirst.category.description || '')
        }
      }
    }).catch(() => {
      setCategoryName('')
      setCategoryNameEn('')
      setCategoryDescription('')
    })
  }, [categoryId])

  useEffect(() => {
    if (!categoryId && !keyword) {
      setBrandOptions([])
      setPackageOptions([])
      setToleranceOptions([])
      return
    }

    const catId = categoryId || (seriesList.length > 0 && seriesList[0].category_id ? seriesList[0].category_id : null)
    if (!catId) return

    fetch(`/api/v1/categories/${catId}/brands`).then(res => res.json()).then(res => {
      if (res.code === 200 && res.data?.brands) {
        setBrandOptions(res.data.brands.map((b: { id: number; name: string }) => ({ id: b.id, name: b.name })))
      }
    }).catch(console.error)

    fetch(`/api/v1/categories/${catId}/attributes-with-values`).then(res => res.json()).then(res => {
      if (res.code === 200 && res.data) {
        const attrs: CategoryAttributeItem[] = Array.isArray(res.data) ? res.data : (res.data.attributes || [])
        attrs.forEach((attr: CategoryAttributeItem) => {
          if (attr.code === 'package_type') {
            setPackageOptions(attr.available_values || [])
          } else if (attr.code === 'tolerance') {
            setToleranceOptions(attr.available_values || [])
          }
        })
      }
    }).catch(console.error)
  }, [categoryId, keyword, seriesList])

  const fetchSeries = async () => {
    try {
      setLoading(true)
      const res = await seriesApi.getSeriesList({
        category_id: searchParams.get('category_id') ? Number(searchParams.get('category_id')) : undefined,
        brand_id: searchParams.get('brand_id') ? Number(searchParams.get('brand_id')) : undefined,
        package_type: searchParams.get('package_type') || undefined,
        tolerance: searchParams.get('tolerance') || undefined,
        resistance_min: searchParams.get('resistance_min') ? Number(searchParams.get('resistance_min')) : undefined,
        resistance_max: searchParams.get('resistance_max') ? Number(searchParams.get('resistance_max')) : undefined,
        keyword: searchParams.get('keyword') || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        page_size: 12,
      })
      if (res.code === 200) {
        const list = res.data.series
        setSeriesList(list)
        setTotal(res.data.pagination.total)
        setTotalPages(res.data.pagination.total_pages)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSeries()
  }, [page, searchParams, sortBy, sortOrder])

  const applyFiltersToUrl = (next: FilterState) => {
    const params = new URLSearchParams()
    if (categoryId) {
      params.set('category_id', String(categoryId))
    }
    if (keyword) {
      params.set('keyword', keyword)
    }
    if (next.brandId) {
      params.set('brand_id', String(next.brandId))
    }
    if (next.packageType) {
      params.set('package_type', next.packageType)
    }
    if (next.tolerance) {
      params.set('tolerance', next.tolerance)
    }
    if (next.resistanceRange) {
      if (next.resistanceRange.min !== undefined) {
        params.set('resistance_min', String(next.resistanceRange.min))
      }
      if (next.resistanceRange.max !== undefined) {
        params.set('resistance_max', String(next.resistanceRange.max))
      }
    }
    if (page > 1) {
      params.set('page', String(page))
    }
    setSearchParams(params)
  }

  const updateFilter = (patch: Partial<FilterState>) => {
    const next = { ...filters, ...patch }
    setFilters(next)
    setPage(1)
    applyFiltersToUrl(next)
  }

  const clearFilters = () => {
    const next: FilterState = { brandId: undefined, packageType: '', tolerance: '', resistanceRange: undefined }
    setFilters(next)
    setResistanceInput({ min: '', max: '' })
    setPage(1)
    applyFiltersToUrl(next)
  }

  const applyResistanceRange = () => {
    const min = resistanceInput.min ? Number(resistanceInput.min) : undefined
    const max = resistanceInput.max ? Number(resistanceInput.max) : undefined
    updateFilter({ resistanceRange: min || max ? { min, max } : undefined })
  }

  const handleSort = (field: 'hot' | 'model_count' | 'newest') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
    setPage(1)
  }

  const breadcrumbs = [
    { name: t('主页'), href: '/' },
    { name: t('产品'), href: '/series' },
  ]

  const sortItems: { key: 'hot' | 'model_count' | 'newest'; label: string }[] = [
    { key: 'hot', label: t('热度') },
    { key: 'model_count', label: t('型号数量') },
    { key: 'newest', label: t('最新上架') },
  ]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: BG_GRAY }}>
      <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex' }}>
        <CategorySidebar
          selectedCategoryId={categoryId}
          autoExpandCategoryId={categoryId}
          showSeriesList={true}
        />

        <div style={{ flex: 1, minWidth: 0, padding: '20px 24px 0', borderLeft: `1px solid ${NEUTRAL_200}`, marginLeft: '-1px' }}>
          <div style={{ fontSize: '12px', color: NEUTRAL_500, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1
              return (
                <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  {isLast || !crumb.href ? (
                    <span style={{ color: isLast ? NEUTRAL_800 : NEUTRAL_500, fontWeight: isLast ? 500 : 400 }}>{crumb.name}</span>
                  ) : (
                    <Link to={crumb.href} style={{ color: NEUTRAL_500, textDecoration: 'none' }}>{crumb.name}</Link>
                  )}
                  {!isLast && <span>/</span>}
                </span>
              )
            })}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h1 style={{
              fontSize: '22px',
              fontWeight: 700,
              color: NEUTRAL_900,
              margin: '0 0 6px',
              lineHeight: 1.3,
              wordBreak: 'keep-all',
              overflowWrap: 'break-word',
            }}>
              {categoryName || t('产品系列')}
              {categoryNameEn && (
                <span style={{ fontSize: '16px', color: NEUTRAL_500, fontWeight: 400, marginLeft: '8px' }}>
                  ({categoryNameEn})
                </span>
              )}
            </h1>
            {categoryDescription && (
              <p style={{ fontSize: '13px', color: NEUTRAL_500, lineHeight: 1.6, margin: '0 0 8px' }}>
                {categoryDescription}
              </p>
            )}
            <p style={{ fontSize: '13px', color: NEUTRAL_600, margin: 0 }}>
              {t('共找到')} <span style={{ color: RED_PRIMARY, fontWeight: 700 }}>{total}</span> {t('个相关系列')}
            </p>
          </div>

          <div style={{
            background: '#ffffff',
            border: `1px solid ${NEUTRAL_200}`,
            borderRadius: '8px',
            padding: '16px 20px',
            marginBottom: '20px',
            position: 'relative',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: NEUTRAL_700, minWidth: '56px', paddingTop: '5px', fontWeight: 500, flexShrink: 0 }}>{t('品牌')}：</span>
              <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  onClick={() => updateFilter({ brandId: undefined })}
                  style={{
                    padding: '4px 14px',
                    fontSize: '13px',
                    borderRadius: '6px',
                    border: `1px solid ${!filters.brandId ? RED_PRIMARY : NEUTRAL_200}`,
                    cursor: 'pointer',
                    background: !filters.brandId ? RED_PRIMARY : '#fff',
                    color: !filters.brandId ? '#fff' : NEUTRAL_700,
                    fontWeight: !filters.brandId ? 500 : 400,
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t('全部')}
                </button>
                {brandOptions.map(b => (
                  <button
                    key={b.id}
                    onClick={() => updateFilter({ brandId: b.id })}
                    style={{
                      padding: '4px 14px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: `1px solid ${filters.brandId === b.id ? RED_PRIMARY : NEUTRAL_200}`,
                      cursor: 'pointer',
                      background: filters.brandId === b.id ? RED_PRIMARY : '#fff',
                      color: filters.brandId === b.id ? '#fff' : NEUTRAL_700,
                      fontWeight: filters.brandId === b.id ? 500 : 400,
                      transition: 'all 0.15s',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: NEUTRAL_700, minWidth: '56px', paddingTop: '5px', fontWeight: 500, flexShrink: 0 }}>{t('封装')}：</span>
              <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  onClick={() => updateFilter({ packageType: '' })}
                  style={{
                    padding: '4px 14px',
                    fontSize: '13px',
                    borderRadius: '6px',
                    border: `1px solid ${!filters.packageType ? RED_PRIMARY : NEUTRAL_200}`,
                    cursor: 'pointer',
                    background: !filters.packageType ? RED_PRIMARY : '#fff',
                    color: !filters.packageType ? '#fff' : NEUTRAL_700,
                    fontWeight: !filters.packageType ? 500 : 400,
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t('全部')}
                </button>
                {packageOptions.map(p => (
                  <button
                    key={p}
                    onClick={() => updateFilter({ packageType: p })}
                    style={{
                      padding: '4px 14px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: `1px solid ${filters.packageType === p ? RED_PRIMARY : NEUTRAL_200}`,
                      cursor: 'pointer',
                      background: filters.packageType === p ? RED_PRIMARY : '#fff',
                      color: filters.packageType === p ? '#fff' : NEUTRAL_700,
                      fontWeight: filters.packageType === p ? 500 : 400,
                      transition: 'all 0.15s',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: NEUTRAL_700, minWidth: '56px', fontWeight: 500, flexShrink: 0 }}>{t('阻值范围')}：</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="text"
                  placeholder={t('最小值')}
                  value={resistanceInput.min}
                  onChange={e => setResistanceInput(prev => ({ ...prev, min: e.target.value }))}
                  onBlur={applyResistanceRange}
                  onKeyDown={e => e.key === 'Enter' && applyResistanceRange()}
                  style={{
                    width: '80px', height: '32px', borderRadius: '6px',
                    border: `1px solid ${NEUTRAL_200}`, padding: '0 10px',
                    fontSize: '13px', outline: 'none', textAlign: 'center',
                    fontFamily: 'JetBrains Mono, monospace',
                    color: NEUTRAL_800, background: '#fff',
                  }}
                />
                <span style={{ fontSize: '13px', color: NEUTRAL_400, fontWeight: 500 }}>Ω</span>
                <span style={{ color: NEUTRAL_400 }}>~</span>
                <input
                  type="text"
                  placeholder={t('最大值')}
                  value={resistanceInput.max}
                  onChange={e => setResistanceInput(prev => ({ ...prev, max: e.target.value }))}
                  onBlur={applyResistanceRange}
                  onKeyDown={e => e.key === 'Enter' && applyResistanceRange()}
                  style={{
                    width: '80px', height: '32px', borderRadius: '6px',
                    border: `1px solid ${NEUTRAL_200}`, padding: '0 10px',
                    fontSize: '13px', outline: 'none', textAlign: 'center',
                    fontFamily: 'JetBrains Mono, monospace',
                    color: NEUTRAL_800, background: '#fff',
                  }}
                />
                <span style={{ fontSize: '13px', color: NEUTRAL_400, fontWeight: 500 }}>Ω</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: NEUTRAL_700, minWidth: '56px', paddingTop: '5px', fontWeight: 500, flexShrink: 0 }}>{t('精度等级')}：</span>
              <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  onClick={() => updateFilter({ tolerance: '' })}
                  style={{
                    padding: '4px 14px',
                    fontSize: '13px',
                    borderRadius: '6px',
                    border: `1px solid ${!filters.tolerance ? RED_PRIMARY : NEUTRAL_200}`,
                    cursor: 'pointer',
                    background: !filters.tolerance ? RED_PRIMARY : '#fff',
                    color: !filters.tolerance ? '#fff' : NEUTRAL_700,
                    fontWeight: !filters.tolerance ? 500 : 400,
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t('全部')}
                </button>
                {toleranceOptions.map(tol => (
                  <button
                    key={tol}
                    onClick={() => updateFilter({ tolerance: tol })}
                    style={{
                      padding: '4px 14px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: `1px solid ${filters.tolerance === tol ? RED_PRIMARY : NEUTRAL_200}`,
                      cursor: 'pointer',
                      background: filters.tolerance === tol ? RED_PRIMARY : '#fff',
                      color: filters.tolerance === tol ? '#fff' : NEUTRAL_700,
                      fontWeight: filters.tolerance === tol ? 500 : 400,
                      transition: 'all 0.15s',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tol}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={clearFilters}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 14px',
                fontSize: '12px',
                borderRadius: '6px',
                border: `1px solid ${NEUTRAL_300}`,
                background: '#fff',
                color: NEUTRAL_600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
                position: 'absolute',
                right: '20px',
                bottom: '16px',
              }}
            >
              <RotateCcw style={{ width: '12px', height: '12px' }} />
              {t('重置筛选')}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '13px', color: NEUTRAL_500 }}>{t('排序')}：</span>
              {sortItems.map(item => {
                const active = sortBy === item.key
                return (
                  <button
                    key={item.key}
                    onClick={() => handleSort(item.key)}
                    style={{
                      fontSize: '13px',
                      color: active ? RED_PRIMARY : NEUTRAL_600,
                      fontWeight: active ? 600 : 400,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px 0',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      textDecoration: active ? 'underline' : 'none',
                      textUnderlineOffset: '3px',
                      transition: 'color 0.15s',
                    }}
                  >
                    {item.label}
                    {active && (
                      <span style={{ fontSize: '12px' }}>
                        {sortOrder === 'desc' ? '▼' : '▲'}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
              <Loader2 className="animate-spin" style={{ color: RED_PRIMARY, width: 32, height: 32 }} />
            </div>
          )}

          {!loading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
              {seriesList.map(series => {
                const anySeries = series as any
                const packageRange = anySeries.spec_summary?.packageRange || '—'
                const resistanceRange = anySeries.spec_summary?.resistanceRange || '—'
                const toleranceRange = anySeries.spec_summary?.toleranceRange || '—'
                const powerRange = anySeries.spec_summary?.powerRange || '—'

                return (
                  <div
                    key={series.id}
                    style={{
                      background: '#ffffff',
                      border: `1px solid ${NEUTRAL_200}`,
                      borderRadius: '8px',
                      padding: '20px',
                      transition: 'box-shadow 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.05)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '4px',
                          background: NEUTRAL_100,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: NEUTRAL_500,
                            letterSpacing: '0.5px',
                          }}
                        >
                          {series.brand_name
                            ? series.brand_name.slice(0, 6).toUpperCase()
                            : 'BRAND'}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: NEUTRAL_800 }}>
                          {series.brand_name || t('品牌')}
                        </span>
                      </div>
                    </div>

                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: NEUTRAL_900,
                      margin: '0 0 8px',
                      lineHeight: 1.4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      <Link to={`/series/${series.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        {series.name}
                      </Link>
                    </h3>

                    <div style={{ borderTop: `1px solid ${NEUTRAL_100}`, marginBottom: '12px' }}></div>

                    <div style={{
                      fontSize: '12px',
                      marginBottom: '12px',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      border: `1px solid ${NEUTRAL_100}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', background: NEUTRAL_50 }}>
                        <span style={{ color: NEUTRAL_500, minWidth: '60px', flexShrink: 0 }}>{t('封装')}</span>
                        <span style={{ color: NEUTRAL_800, fontFamily: 'JetBrains Mono, monospace', fontWeight: 500 }}>{packageRange}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', background: '#fff' }}>
                        <span style={{ color: NEUTRAL_500, minWidth: '60px', flexShrink: 0 }}>{t('阻值')}</span>
                        <span style={{ color: NEUTRAL_800, fontFamily: 'JetBrains Mono, monospace', fontWeight: 500 }}>{resistanceRange}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', background: NEUTRAL_50 }}>
                        <span style={{ color: NEUTRAL_500, minWidth: '60px', flexShrink: 0 }}>{t('精度')}</span>
                        <span style={{ color: NEUTRAL_800, fontFamily: 'JetBrains Mono, monospace', fontWeight: 500 }}>{toleranceRange}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', background: '#fff' }}>
                        <span style={{ color: NEUTRAL_500, minWidth: '60px', flexShrink: 0 }}>{t('功率')}</span>
                        <span style={{ color: NEUTRAL_800, fontFamily: 'JetBrains Mono, monospace', fontWeight: 500 }}>{powerRange}</span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: NEUTRAL_600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t('在售型号')}：<span style={{ color: RED_PRIMARY, fontWeight: 700 }}>{series.model_count}</span> {t('款')}
                      </span>
                      <Link
                        to={`/series/${series.id}#datasheet`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          color: NEUTRAL_600,
                          border: `1px solid ${NEUTRAL_200}`,
                          borderRadius: '6px',
                          background: '#fff',
                          textDecoration: 'none',
                          transition: 'all 0.15s',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <FileText style={{ width: '12px', height: '12px' }} />
                        {t('技术文档')}
                      </Link>
                      {(() => {
                        const isInBom = bomList.some((item: any) => item.series_id === series.id || item.model_code === series.name)
                        return (
                          <button
                            onClick={() => !isInBom && addSeriesToBom(series)}
                            disabled={isInBom}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              fontSize: '12px',
                              color: isInBom ? NEUTRAL_400 : '#fff',
                              border: isInBom ? `1px solid ${NEUTRAL_200}` : 'none',
                              borderRadius: '6px',
                              background: isInBom ? '#fff' : RED_PRIMARY,
                              cursor: isInBom ? 'not-allowed' : 'pointer',
                              transition: 'all 0.15s',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <ClipboardList style={{ width: '12px', height: '12px' }} />
                            {isInBom ? t('已加入BOM') : t('加入BOM')}
                          </button>
                        )
                      })()}
                      <Link
                        to={`/series/${series.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          padding: '6px 0',
                          fontSize: '12px',
                          color: RED_PRIMARY,
                          background: 'transparent',
                          textDecoration: 'none',
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t('查看型号')} →
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {!loading && seriesList.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: NEUTRAL_400 }}>{t('暂无符合条件的产品系列')}</div>
          )}

          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '24px', marginBottom: '32px', fontSize: '12px' }}>
              <span style={{ color: NEUTRAL_500 }}>
                {t('共')} {total} {t('个系列')}，{t('当前第')} {page}/{totalPages} {t('页')}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    fontSize: '13px',
                    color: page <= 1 ? NEUTRAL_400 : NEUTRAL_700,
                    border: `1px solid ${NEUTRAL_200}`,
                    background: '#fff',
                    cursor: page <= 1 ? 'not-allowed' : 'pointer',
                    borderRadius: '4px',
                    opacity: page <= 1 ? 0.4 : 1,
                    transition: 'all 0.15s',
                  }}
                >
                  ‹
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
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '32px',
                        height: '32px',
                        fontSize: '13px',
                        color: p === page ? '#fff' : NEUTRAL_700,
                        background: p === page ? RED_PRIMARY : '#fff',
                        border: p === page ? 'none' : `1px solid ${NEUTRAL_200}`,
                        cursor: 'pointer',
                        borderRadius: '4px',
                        padding: '0 10px',
                        fontWeight: p === page ? 600 : 400,
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
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    fontSize: '13px',
                    color: page >= totalPages ? NEUTRAL_400 : NEUTRAL_700,
                    border: `1px solid ${NEUTRAL_200}`,
                    background: '#fff',
                    cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                    borderRadius: '4px',
                    opacity: page >= totalPages ? 0.4 : 1,
                    transition: 'all 0.15s',
                  }}
                >
                  ›
                </button>
              </div>
            </div>
          )}

          {bomItemCount > 0 && (
            <div style={{
              position: 'fixed',
              left: '220px',
              right: 0,
              bottom: 0,
              background: '#ffffff',
              borderTop: `1px solid ${NEUTRAL_200}`,
              padding: '14px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 100,
              boxShadow: '0 -2px 6px rgba(0,0,0,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClipboardList style={{ width: '16px', height: '16px', color: NEUTRAL_500 }} />
                <span style={{ fontSize: '13px', color: NEUTRAL_700 }}>
                  {t('已选')} <span style={{ color: RED_PRIMARY, fontWeight: 700 }}>{bomItemCount}</span> {t('个型号')}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Link
                  to="/bom"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '8px 18px',
                    fontSize: '13px',
                    color: NEUTRAL_700,
                    border: `1px solid ${NEUTRAL_300}`,
                    borderRadius: '6px',
                    background: '#fff',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'all 0.15s',
                  }}
                >
                  {t('查看清单')}
                </Link>
                <Link
                  to="/bom"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '8px 24px',
                    fontSize: '13px',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    background: RED_PRIMARY,
                    textDecoration: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    transition: 'all 0.15s',
                  }}
                >
                  {t('一键询价')}
                </Link>
              </div>
            </div>
          )}

          {bomItemCount > 0 && (
            <div style={{ height: '60px' }}></div>
          )}
        </div>
      </div>
    </div>
  )
}