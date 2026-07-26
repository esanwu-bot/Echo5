"use client"

import { useEffect, useState, useCallback } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useTranslation } from 'react-i18next'
import { categoryApi, seriesApi } from "../../lib/api-client"
import { Cpu, Layers, Zap, Cable, Radio, Gauge, Lightbulb, Power, CircuitBoard, ChevronRight, ChevronDown, LayoutGrid } from "lucide-react"

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

interface CategoryItem {
  id: number
  name: string
  name_en?: string
  children?: CategoryItem[]
}

interface SeriesItem {
  id: number
  name: string
  model_count: number
}

const categoryIcons: Record<string, React.ReactNode> = {
  '芯片': <Cpu style={{ width: '15px', height: '15px' }} />,
  '半导体': <CircuitBoard style={{ width: '15px', height: '15px' }} />,
  '被动元件': <Layers style={{ width: '15px', height: '15px' }} />,
  '连接器': <Cable style={{ width: '15px', height: '15px' }} />,
  '传感器': <Gauge style={{ width: '15px', height: '15px' }} />,
  '电感器': <Zap style={{ width: '15px', height: '15px' }} />,
  '电源管理芯片': <Power style={{ width: '15px', height: '15px' }} />,
  '接口与驱动': <Cable style={{ width: '15px', height: '15px' }} />,
  '运算放大器': <Lightbulb style={{ width: '15px', height: '15px' }} />,
  '电阻': <Radio style={{ width: '15px', height: '15px' }} />,
  '电阻器': <Radio style={{ width: '15px', height: '15px' }} />,
  '电容': <Layers style={{ width: '15px', height: '15px' }} />,
  '电容器': <Layers style={{ width: '15px', height: '15px' }} />,
  '机电元件': <Zap style={{ width: '15px', height: '15px' }} />,
  '电源管理': <Power style={{ width: '15px', height: '15px' }} />,
}

const getCategoryIcon = (name: string) => {
  return categoryIcons[name] || <CircuitBoard style={{ width: '15px', height: '15px' }} />
}

interface CategorySidebarProps {
  selectedCategoryId?: number
  selectedSeriesId?: number
  autoExpandCategoryId?: number
  showSeriesList?: boolean
}

export function CategorySidebar({
  selectedCategoryId,
  selectedSeriesId,
  autoExpandCategoryId,
  showSeriesList = true,
}: CategorySidebarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [seriesMap, setSeriesMap] = useState<Record<number, SeriesItem[]>>({})
  const [loadingSeriesCats, setLoadingSeriesCats] = useState<Set<number>>(new Set())

  useEffect(() => {
    categoryApi.getCategoryTree().then(res => {
      if (res.code === 200 && Array.isArray(res.data)) {
        setCategories(res.data)
      }
    }).catch(console.error)
  }, [])

  useEffect(() => {
    if (autoExpandCategoryId && categories.length > 0) {
      const findAndExpand = (nodes: CategoryItem[], targetId: number): boolean => {
        for (const node of nodes) {
          if (node.id === targetId) {
            setExpandedIds(prev => {
              const next = new Set(prev)
              next.add(node.id)
              return next
            })
            return true
          }
          if (node.children) {
            if (findAndExpand(node.children, targetId)) {
              setExpandedIds(prev => {
                const next = new Set(prev)
                next.add(node.id)
                return next
              })
              return true
            }
          }
        }
        return false
      }
      findAndExpand(categories, autoExpandCategoryId)
    }
  }, [autoExpandCategoryId, categories])

  useEffect(() => {
    if (showSeriesList && expandedIds.size > 0) {
      expandedIds.forEach(catId => {
        if (!seriesMap[catId]) {
          loadSeriesForCategory(catId)
        }
      })
    }
  }, [showSeriesList, expandedIds, seriesMap])

  const loadSeriesForCategory = async (categoryId: number) => {
    if (loadingSeriesCats.has(categoryId)) return
    setLoadingSeriesCats(prev => new Set(prev).add(categoryId))
    try {
      const res = await seriesApi.getSeriesList({
        category_id: categoryId,
        page: 1,
        page_size: 100,
      })
      if (res.code === 200) {
        const data = res.data.series || []
        setSeriesMap(prev => ({ ...prev, [categoryId]: data }))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingSeriesCats(prev => {
        const next = new Set(prev)
        next.delete(categoryId)
        return next
      })
    }
  }

  const toggleExpand = useCallback((catId: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }, [])

  const handleCategoryClick = useCallback((cat: CategoryItem, hasChildren: boolean) => {
    if (hasChildren) {
      toggleExpand(cat.id)
    } else {
      toggleExpand(cat.id)
    }
    navigate(`/series?category_id=${cat.id}`)
  }, [toggleExpand, navigate])

  const findPath = useCallback((nodes: CategoryItem[], targetId: number): number[] | null => {
    for (const node of nodes) {
      if (node.id === targetId) return [node.id]
      if (node.children) {
        const childPath = findPath(node.children, targetId)
        if (childPath) return [node.id, ...childPath]
      }
    }
    return null
  }, [])

  const renderCategory = (item: CategoryItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedIds.has(item.id)
    const isSelected = selectedCategoryId === item.id
    const hasSeries = showSeriesList && seriesMap[item.id] && seriesMap[item.id].length > 0
    const canExpand = hasChildren || hasSeries

    let textColor = NEUTRAL_700
    let fontWeight = 400
    let bgColor = 'transparent'
    let borderLeft = '3px solid transparent'

    if (isSelected) {
      textColor = RED_PRIMARY
      fontWeight = 600
      bgColor = RED_50
      borderLeft = `3px solid ${RED_PRIMARY}`
    } else if (level === 0 && hasChildren) {
      fontWeight = 600
      textColor = NEUTRAL_800
    }

    return (
      <div key={`cat-${item.id}`}>
        <div
          onClick={() => handleCategoryClick(item, !!hasChildren)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            padding: level === 0 ? '7px 12px' : '6px 12px',
            paddingLeft: level === 0 ? '12px' : `${12 + level * 20}px`,
            backgroundColor: bgColor,
            borderLeft,
            transition: 'background-color 0.15s, color 0.15s',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, overflow: 'hidden' }}>
            {level === 0 && <span style={{ color: isSelected ? RED_PRIMARY : NEUTRAL_400, flexShrink: 0 }}>{getCategoryIcon(item.name)}</span>}
            <span
              style={{
                fontWeight,
                color: textColor,
                fontSize: '13px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.name}
            </span>
          </span>
          {canExpand && (
            <span style={{ flexShrink: 0, marginLeft: '8px' }}>
              {isExpanded ? (
                <ChevronDown style={{ width: level === 0 ? '14px' : '12px', height: level === 0 ? '14px' : '12px', color: isSelected ? RED_PRIMARY : NEUTRAL_400 }} />
              ) : (
                <ChevronRight style={{ width: level === 0 ? '14px' : '12px', height: level === 0 ? '14px' : '12px', color: level === 0 ? NEUTRAL_400 : NEUTRAL_300 }} />
              )}
            </span>
          )}
        </div>

        {isExpanded && (
          <div>
            {item.children?.map(child => renderCategory(child, level + 1))}
            {hasSeries && (
              <div style={{ paddingLeft: `${12 + (level + 1) * 20}px` }}>
                {loadingSeriesCats.has(item.id) ? (
                  <div style={{ padding: '6px 16px', fontSize: '12px', color: NEUTRAL_400 }}>{t('加载中')}...</div>
                ) : (
                  seriesMap[item.id]?.map(s => {
                    const isSeriesActive = selectedSeriesId === s.id
                    return (
                      <Link
                        key={`series-${s.id}`}
                        to={`/series/${s.id}`}
                        style={{
                          display: 'block',
                          padding: '5px 16px',
                          color: isSeriesActive ? RED_PRIMARY : NEUTRAL_600,
                          fontWeight: isSeriesActive ? 600 : 400,
                          backgroundColor: isSeriesActive ? RED_50 : 'transparent',
                          borderLeft: isSeriesActive ? `3px solid ${RED_PRIMARY}` : '3px solid transparent',
                          fontSize: '13px',
                          textDecoration: 'none',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {s.name.endsWith('系列')
                          ? `${s.name.slice(0, -2)}${t('系列')}`
                          : s.name}
                      </Link>
                    )
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside style={{ width: '220px', minWidth: '220px', flexShrink: 0 }}>
      <div style={{
        background: '#ffffff',
        borderRight: `1px solid ${NEUTRAL_200}`,
        maxHeight: 'calc(100vh - 88px)',
        overflowY: 'auto',
        position: 'sticky',
        top: '88px',
      }}>
        <div style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${NEUTRAL_200}`,
          fontSize: '14px',
          fontWeight: 700,
          color: NEUTRAL_900,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <LayoutGrid style={{ width: '16px', height: '16px', color: NEUTRAL_600 }} />
          {t('所有产品')}
        </div>
        <div style={{ fontSize: '13px', padding: '4px 0' }}>
          {categories.map(cat => renderCategory(cat))}
        </div>
      </div>
    </aside>
  )
}