import { useEffect, useMemo, useState } from "react"
import { useSearchParams, useNavigate, Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  Loader2,
  ArrowLeft,
  Plus,
  ShoppingCart,
  ListPlus,
  AlertCircle,
  X,
} from "lucide-react"
import {
  comparisonApi,
  modelApi,
  cartApi,
  type ModelComparisonResult,
  type ModelDetail,
  type BOMItem,
  getAuthToken,
} from "../../lib/api-client"

/**
 * 电子元器件商城 - 型号对比页面
 * 文件说明：提供型号参数对比功能，支持从 URL 参数或 localStorage 读取对比列表，
 *         调用后端对比接口获取数据，失败时本地构造对比表。
 * 路由：/compare
 */

/** 本地 fallback 时使用的型号数据 */
interface LocalModelData {
  id: number
  model_code: string
  model_name: string
  brand_name: string
  stock: number
  unit_price: number
  package_type: string
  operating_temperature: string
}

/** 页面加载状态 */
type LoadingState = "idle" | "loading" | "error"

export function ComparisonPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [comparison, setComparison] = useState<ModelComparisonResult | null>(null)
  const [loading, setLoading] = useState<LoadingState>("idle")
  const [errorMsg, setErrorMsg] = useState<string>("")

  const [bomList, setBomList] = useState<BOMItem[]>(() => {
    try {
      const raw = localStorage.getItem("bomList")
      if (!raw) return []
      const parsed = JSON.parse(raw)
      // 兼容 camelCase 和 snake_case 两种格式
      return (Array.isArray(parsed) ? parsed : []).map((item: Record<string, any>) => ({
        model_id: item.model_id ?? item.modelId ?? 0,
        model_code: item.model_code ?? item.modelCode ?? "",
        model_name: item.model_name ?? item.modelName ?? "",
        brand_name: item.brand_name ?? item.brandName ?? "",
        quantity: item.quantity ?? 1,
        unit_price: item.unit_price ?? item.unitPrice ?? 0,
        stock: item.stock ?? 0,
      }))
    } catch {
      return []
    }
  })

  // 对比列表（用于底部栏清空操作）
  const [compareList, setCompareList] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem("compareModels")
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return (Array.isArray(parsed) ? parsed : []).filter((id: unknown) => typeof id === "number" && id > 0)
    } catch {
      return []
    }
  })

  // 从 URL 查询参数 ?ids=1,2,3 解析对比 ID
  const modelIds = useMemo<number[]>(() => {
    const idsParam = searchParams.get("ids")
    if (idsParam) {
      return idsParam
        .split(/[,，]/)
        .map(s => Number(s.trim()))
        .filter(id => !isNaN(id) && id > 0)
    }
    // 无 URL 参数时从 localStorage 读取 compareModels 兜底
    try {
      const raw = localStorage.getItem("compareModels")
      if (!raw) return []
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed
          .map((item: any) => (typeof item === "number" ? item : item?.id))
          .filter((id: any) => typeof id === "number" && !isNaN(id) && id > 0)
      }
    } catch {
      // 解析失败则返回空数组
    }
    return []
  }, [searchParams])

  // BOM 列表变更时同步到 localStorage
  useEffect(() => {
    localStorage.setItem("bomList", JSON.stringify(bomList))
    window.dispatchEvent(new Event("bomListUpdated"))
  }, [bomList])

  // 对比列表变更时同步到 localStorage
  useEffect(() => {
    localStorage.setItem("compareModels", JSON.stringify(compareList))
    window.dispatchEvent(new Event("compareListUpdated"))
  }, [compareList])

  // 加载对比数据
  useEffect(() => {
    console.log('[ComparisonPage] modelIds:', modelIds, 'length:', modelIds.length)
    if (modelIds.length === 0) {
      setComparison(null)
      setLoading("idle")
      return
    }
    fetchComparisonData(modelIds)
  }, [modelIds])

  /**
   * 获取对比数据：优先调用 comparisonApi.compare，失败则本地构造。
   * @param ids 型号 ID 列表
   */
  const fetchComparisonData = async (ids: number[]) => {
    setLoading("loading")
    setErrorMsg("")
    try {
      const res = await comparisonApi.compare(ids)
      console.log('[ComparisonPage] API response:', JSON.stringify(res, null, 2))
      console.log('[ComparisonPage] res.code:', res.code, 'typeof:', typeof res.code)
      console.log('[ComparisonPage] res.data:', res.data)
      console.log('[ComparisonPage] res.data.models:', res.data?.models)
      console.log('[ComparisonPage] res.data.params:', res.data?.params)
      if (res.code === 200 && res.data) {
        console.log('[ComparisonPage] Setting comparison:', res.data)
        setComparison(res.data)
        setLoading("idle")
        return
      }
      throw new Error(res.message || t("获取对比数据失败"))
    } catch (err) {
      console.error("[ComparisonPage] 对比接口调用失败，尝试本地构造", err)
      try {
        const local = await buildLocalComparison(ids)
        setComparison(local)
        setLoading("idle")
      } catch (localErr) {
        console.error(localErr)
        setErrorMsg(t("加载对比数据失败，请稍后重试"))
        setLoading("error")
      }
    }
  }

  /**
   * 本地构造对比表：依次获取每个型号的详情并提取公共参数。
   * @param ids 型号 ID 列表
   * @returns 本地构造的对比结果
   */
  const buildLocalComparison = async (
    ids: number[]
  ): Promise<ModelComparisonResult> => {
    const models: LocalModelData[] = []
    for (const id of ids) {
      try {
        const res = await modelApi.getModelDetail(String(id))
        if (res.code === 200 && res.data) {
          const detail = res.data as ModelDetail
          models.push({
            id,
            model_code: detail.header?.modelCode || String(id),
            model_name: detail.header?.modelName || "",
            brand_name: extractBrandFromBreadcrumbs(detail.breadcrumbs),
            stock: detail.header?.stockQuantity || 0,
            unit_price: extractUnitPrice(detail),
            package_type: detail.packageInfo?.packageType?.value || "",
            operating_temperature: detail.packageInfo?.operatingTemperature?.value || "",
          })
        }
      } catch (e) {
        console.error(`[ComparisonPage] 获取型号 ${id} 详情失败`, e)
      }
    }

    // 构造公共参数行
    const params: ModelComparisonResult["params"] = []
    const addParam = (label: string, getter: (m: LocalModelData) => string | number | null) => {
      const values = models.map(getter)
      const hasDiff = new Set(values.map(v => String(v))).size > 1
      params.push({ name: label, label, values, has_diff: hasDiff })
    }

    if (models.some(m => m.brand_name)) {
      addParam(t("品牌"), m => m.brand_name || null)
    }
    if (models.some(m => m.package_type)) {
      addParam(t("封装"), m => m.package_type || null)
    }
    if (models.some(m => m.operating_temperature)) {
      addParam(t("工作温度"), m => m.operating_temperature || null)
    }
    addParam(t("库存"), m => m.stock)
    addParam(t("单价"), m => (m.unit_price ? `$${m.unit_price.toFixed(4)} USD` : null))

    return {
      models: models.map(m => ({
        id: m.id,
        model_code: m.model_code,
        model_name: m.model_name,
        brand_name: m.brand_name,
        stock: m.stock,
        unit_price: m.unit_price,
      })),
      params,
    }
  }

  /**
   * 从面包屑中提取品牌名。
   * @param breadcrumbs 面包屑数组
   * @returns 品牌名或空字符串
   */
  const extractBrandFromBreadcrumbs = (
    breadcrumbs?: ModelDetail["breadcrumbs"]
  ): string => {
    if (!breadcrumbs || breadcrumbs.length === 0) return ""
    const brand = breadcrumbs.find(b => b.link?.startsWith("/brand/"))
    return brand?.label || ""
  }

  /**
   * 从价格阶梯中提取最低单价。
   * @param detail 型号详情
   * @returns 单价数值
   */
  const extractUnitPrice = (detail: ModelDetail): number => {
    const breaks = detail.pricing?.priceBreaks
    if (!breaks || breaks.length === 0) return 0
    const prices = breaks.map(b => Number(b.price)).filter(p => !isNaN(p) && p > 0)
    return prices.length > 0 ? Math.min(...prices) : 0
  }

  /**
   * 加入 BOM。
   * @param model 要加入的型号
   */
  const addToBOM = (model: ModelComparisonResult["models"][number]) => {
    setBomList(prev => {
      const existing = prev.find(b => b.model_code === model.model_code)
      if (existing) {
        return prev.map(b =>
          b.model_code === model.model_code
            ? { ...b, quantity: b.quantity + 1 }
            : b
        )
      }
      return [
        ...prev,
        {
          model_id: model.id,
          model_code: model.model_code,
          model_name: model.model_name,
          brand_name: model.brand_name || "",
          quantity: 1,
          unit_price: model.unit_price || 0,
          stock: model.stock || 0,
        },
      ]
    })
    toast.success(t("已加入BOM"))
  }

  /**
   * 一键加入 BOM：将当前所有对比型号加入 BOM。
   */
  const addAllToBOM = () => {
    if (!comparison) return
    setBomList(prev => {
      const next = [...prev]
      comparison.models.forEach(model => {
        const existing = next.find(b => b.model_code === model.model_code)
        if (existing) {
          existing.quantity += 1
        } else {
          next.push({
            model_id: model.id,
            model_code: model.model_code,
            model_name: model.model_name,
            brand_name: model.brand_name || "",
            quantity: 1,
            unit_price: model.unit_price || 0,
            stock: model.stock || 0,
          })
        }
      })
      return next
    })
    toast.success(t("已全部加入BOM"))
  }

  /**
   * 清空对比列表。
   */
  const handleClearCompare = () => {
    if (compareList.length === 0 && !searchParams.get("ids")) return
    if (window.confirm(t("确定要清空对比列表吗？"))) {
      setCompareList([])
      setComparison(null)
      // 清空 URL 中的 ids 参数，触发页面重新加载为空状态
      const next = new URLSearchParams(searchParams)
      next.delete("ids")
      navigate(`/compare?${next.toString()}`, { replace: true })
      toast.success(t("已清空对比列表"))
    }
  }

  /**
   * 购买：将型号加入购物车后跳转到购物车；未登录时跳转登录页。
   * @param model 对比型号数据
   */
  const handleBuy = async (model: ModelComparisonResult["models"][number]) => {
    const token = getAuthToken()
    if (!token) {
      navigate(`/login?redirect=${encodeURIComponent(`/compare?ids=${modelIds.join(",")}`)}`)
      return
    }
    try {
      const res = await cartApi.addToCart({ model_id: model.id, quantity: 1 })
      if (res.code === 200) {
        navigate("/mall/cart")
      } else {
        toast.error(res.message || t("加入购物车失败"))
      }
    } catch {
      toast.error(t("加入购物车失败，请稍后重试"))
    }
  }

  /**
   * 返回列表。
   */
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate("/series")
    }
  }

  /**
   * 渲染单元格内容。
   * @param value 单元格值
   */
  const renderCell = (value: string | number | null) => {
    if (value === null || value === undefined || value === "") {
      return <span className="text-gray-400">-</span>
    }
    return String(value)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* 页面标题栏 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">{t("型号对比")}</h1>
          <button
            onClick={handleBack}
            className="px-4 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-600 bg-white hover:bg-gray-50 flex items-center gap-1 transition-colors"
          >
            <X size={16} />
            {t("返回")}
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {loading === "loading" && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="animate-spin text-[#e60012]" size={40} />
              <p className="mt-4 text-sm text-gray-500">{t("加载中")}...</p>
            </div>
          )}

          {loading === "error" && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <AlertCircle size={40} className="text-[#e60012] mb-3" />
              <p className="text-sm">{errorMsg}</p>
              <button
                onClick={() => fetchComparisonData(modelIds)}
                className="mt-4 px-4 py-2 text-sm rounded-lg bg-[#e60012] text-white hover:bg-[#cc0010] transition-colors"
              >
                {t("重新加载")}
              </button>
            </div>
          )}

          {loading !== "loading" && modelIds.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <AlertCircle size={40} className="text-gray-300 mb-3" />
              <p className="text-sm">{t("未选择对比型号")}</p>
              <Link
                to="/series"
                className="mt-4 px-4 py-2 text-sm rounded-lg bg-[#e60012] text-white hover:bg-[#cc0010] transition-colors"
              >
                {t("去选择型号")}
              </Link>
            </div>
          )}

          {loading !== "loading" && comparison && comparison.models.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: 700 }}>
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left p-3 text-sm font-semibold bg-gray-100 text-gray-700 w-36 whitespace-nowrap">
                      {t("参数")}
                    </th>
                    <th className="p-3 bg-white w-px"></th>
                    {comparison.models.map(model => (
                      <th
                        key={model.id}
                        className="text-center p-3 bg-white min-w-[180px]"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <Link
                            to={`/models/${model.id}`}
                            className="text-sm font-semibold text-gray-800 font-mono hover:text-[#e60012] hover:underline"
                          >
                            {model.model_code}
                          </Link>
                          <span className="text-xs text-gray-500">
                            {model.brand_name || "-"}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparison.params
                    .map((param, rowIndex) => ({
                      ...param,
                      displayLabel: param.label || param.name || `${t("参数")}${rowIndex + 1}`,
                    }))
                    .filter(param => param.values.some(v => v !== null && v !== undefined && v !== ""))
                    .map((param, rowIndex) => (
                      <tr
                        key={`${param.name || param.label || rowIndex}-${rowIndex}`}
                        className="border-b border-gray-200"
                      >
                        <td className="p-3 text-sm bg-gray-100 text-gray-600 whitespace-nowrap">
                          {param.displayLabel}
                        </td>
                        <td className="p-3 bg-white"></td>
                        {param.values.map((value, idx) => {
                          const hasDiff = param.has_diff
                          return (
                            <td
                              key={`${rowIndex}-${idx}`}
                              className={`text-center p-3 text-sm font-mono ${
                                hasDiff
                                  ? "bg-[#fef2f2] text-[#e60012] font-semibold"
                                  : "text-gray-800"
                              }`}
                            >
                              {renderCell(value)}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="p-3 bg-gray-100"></td>
                    <td className="p-3 bg-white"></td>
                    {comparison.models.map(model => (
                      <td key={model.id} className="text-center p-3 bg-white">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => addToBOM(model)}
                            className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-600 bg-white hover:bg-gray-50 flex items-center gap-1 transition-colors"
                          >
                            <Plus size={14} />
                            BOM
                          </button>
                          <button
                            onClick={() => handleBuy(model)}
                            className="px-4 py-1.5 text-xs rounded-lg text-white bg-[#e60012] hover:bg-[#cc0010] transition-colors"
                          >
                            {t("购买")}
                          </button>
                        </div>
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* 底部固定栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20 shadow-[0_-2px_8px_rgba(0,0,0,0.05)]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <button
            onClick={handleBack}
            className="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100 flex items-center gap-1 transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
            {t("返回列表")}
          </button>
          <span className="text-sm text-gray-500 hidden sm:inline">
            {t("最多可对比 4 个型号")}
          </span>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleClearCompare}
              disabled={compareList.length === 0}
              className="px-4 py-2 text-sm rounded-lg text-[#e60012] hover:text-[#c7000f] disabled:text-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            >
              <X size={16} />
              {t("清空")}
            </button>
            <button
              onClick={addAllToBOM}
              disabled={!comparison || comparison.models.length === 0}
              className="px-5 py-2 text-sm rounded-lg text-white bg-[#e60012] hover:bg-[#cc0010] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
            >
              <ListPlus size={16} />
              {t("一键加入BOM")}
            </button>
          </div>
        </div>
      </div>

      {/* BOM 悬浮提示（加入后显示） */}
      {bomList.length > 0 && (
        <Link
          to="/bom"
          className="fixed bottom-16 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-30 hover:bg-gray-700 transition-colors"
        >
          <ShoppingCart size={14} />
          <span>
            {t("BOM")} {bomList.length} {t("个型号")}
          </span>
        </Link>
      )}
    </div>
  )
}
