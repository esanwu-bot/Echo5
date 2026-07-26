"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { LayoutGrid, ChevronRight, ChevronDown } from "lucide-react"
import { categoryApi, seriesApi } from "../lib/api-client"

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

interface ProductCategoryTreeProps {
  selectedCategoryId?: number
  selectedSeriesId?: number
  onSelectCategory?: (id: number) => void
  onSelectSeries?: (id: number) => void
  showSeries?: boolean
}

export function ProductCategoryTree({
  selectedCategoryId,
  selectedSeriesId,
  onSelectCategory,
  onSelectSeries,
  showSeries = false,
}: ProductCategoryTreeProps) {
  const { t } = useTranslation()
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [seriesMap, setSeriesMap] = useState<Record<number, SeriesItem[]>>({})
  const [loadingSeries, setLoadingSeries] = useState<Set<number>>(new Set())

  useEffect(() => {
    categoryApi.getCategoryTree().then(res => {
      if (res.code === 200 && Array.isArray(res.data)) {
        setCategories(res.data)
      }
    })
  }, [])

  const findPath = useCallback((nodes: CategoryItem[], targetId: number): number[] | null => {
    for (const node of nodes) {
      if (node.id === targetId) {
        return [node.id]
      }
      if (node.children) {
        const childPath = findPath(node.children, targetId)
        if (childPath) {
          return [node.id, ...childPath]
        }
      }
    }
    return null
  }, [])

  const loadSeries = async (categoryId: number) => {
    if (seriesMap[categoryId] || loadingSeries.has(categoryId)) return
    setLoadingSeries(prev => new Set(prev).add(categoryId))
    try {
      const res = await seriesApi.getSeriesList({
        category_id: categoryId,
        page: 1,
        page_size: 100,
      })
      if (res.code === 200) {
        setSeriesMap(prev => ({ ...prev, [categoryId]: res.data.series || [] }))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingSeries(prev => {
        const next = new Set(prev)
        next.delete(categoryId)
        return next
      })
    }
  }

  useEffect(() => {
    if (!categories.length) return
    const ids = new Set<number>()

    // 默认展开选中分类的路径（与原型一致）
    if (selectedCategoryId) {
      const path = findPath(categories, selectedCategoryId)
      path?.forEach(id => ids.add(id))
    }

    setExpandedIds(ids)
  }, [categories, selectedCategoryId, findPath])

  useEffect(() => {
    if (!showSeries || !selectedCategoryId) return
    loadSeries(selectedCategoryId)
  }, [showSeries, selectedCategoryId])

  const toggleExpand = async (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const renderCategory = (item: CategoryItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedIds.has(item.id)
    const isSelectedCategory = selectedCategoryId === item.id
    const isInPath = selectedCategoryId !== undefined && isExpanded && findPath(categories, selectedCategoryId)?.includes(item.id)

    return (
      <div key={`cat-${item.id}`}>
        <div
          onClick={async () => {
            if (hasChildren) {
              await toggleExpand(item.id)
            } else if (showSeries) {
              await toggleExpand(item.id)
            }
            onSelectCategory?.(item.id)
          }}
          className="flex items-center justify-between cursor-pointer transition-colors"
          style={{
            padding: level === 0 ? "8px 16px" : "6px 16px",
            paddingLeft: level === 0 ? "16px" : `${16 + level * 12}px`,
            backgroundColor: isSelectedCategory ? "#fff" : isInPath ? "var(--tqx-red-50)" : "transparent",
            borderLeft: isSelectedCategory ? "3px solid var(--tqx-red-500)" : "3px solid transparent",
          }}
        >
          <span
            className="truncate"
            style={{
              fontWeight: isSelectedCategory || isInPath ? 600 : 400,
              color: isSelectedCategory || isInPath ? "var(--tqx-red-500)" : "var(--tqx-neutral-700)",
              fontSize: "13px",
            }}
          >
            {item.name}
          </span>
          {(hasChildren || showSeries) && (
            isExpanded ? (
              <ChevronDown style={{ width: "14px", height: "14px", color: "var(--tqx-red-500)", flexShrink: 0 }} />
            ) : (
              <ChevronRight style={{ width: "14px", height: "14px", color: "var(--tqx-neutral-600)", flexShrink: 0 }} />
            )
          )}
        </div>

        {isExpanded && (
          <div style={{ backgroundColor: level === 0 ? "var(--tqx-red-50)" : "#fff" }}>
            {item.children?.map(child => renderCategory(child, level + 1))}
            {showSeries && !hasChildren && (
              <div style={{ paddingLeft: `${16 + (level + 1) * 12}px` }}>
                {loadingSeries.has(item.id) ? (
                  <div style={{ padding: "5px 16px", fontSize: "12px", color: "var(--tqx-neutral-400)" }}>加载中...</div>
                ) : (
                  seriesMap[item.id]?.map(series => (
                    <div
                      key={`series-${series.id}`}
                      onClick={() => onSelectSeries?.(series.id)}
                      className="cursor-pointer truncate transition-colors"
                      style={{
                        padding: "5px 16px",
                        color: selectedSeriesId === series.id ? "var(--tqx-red-500)" : "var(--tqx-neutral-600)",
                        fontWeight: selectedSeriesId === series.id ? 600 : 400,
                        backgroundColor: selectedSeriesId === series.id ? "var(--tqx-red-50)" : "transparent",
                        borderLeft: selectedSeriesId === series.id ? "3px solid var(--tqx-red-500)" : "3px solid transparent",
                        fontSize: "13px",
                      }}
                    >
                      {series.name}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside className="hidden md:block" style={{ width: "220px", minWidth: "220px", flexShrink: 0 }}>
      <div style={{ background: "#fff", border: "1px solid var(--tqx-neutral-200)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", background: "var(--tqx-neutral-100)", borderBottom: "1px solid var(--tqx-neutral-200)", fontWeight: 600, fontSize: "var(--font-size-body)", color: "var(--tqx-neutral-900)" }}>
          <LayoutGrid style={{ width: "16px", height: "16px", display: "inline", verticalAlign: "middle", marginRight: "6px", color: "var(--tqx-neutral-600)" }} />
          {t('所有产品')}
        </div>
        <div style={{ padding: "4px 0", fontSize: "13px" }}>
          {categories.map(cat => renderCategory(cat))}
        </div>
      </div>
    </aside>
  )
}