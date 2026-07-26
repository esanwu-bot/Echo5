import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  AlertTriangle,
  Bookmark,
  ClipboardList,
  FileSpreadsheet,
  Folder,
  Info,
  Plus,
  Save,
  Send,
  ShoppingBag,
  Trash2,
  Upload,
} from "lucide-react"
import {
  bomApi,
  getAuthToken,
  userApi,
  type BOMItem,
  type BOMProject,
  type BOMUploadResult,
} from "../../lib/api-client"

/**
 * BOM 本地存储键名（与 ModelMatrixPage、ModelDetail 保持一致）
 */
const BOM_STORAGE_KEY = "bomList"

/**
 * BOM 项目名称本地存储键名（v2 避免旧版中文默认值污染）
 */
const BOM_PROJECT_NAME_KEY = "tqx_bom_project_name_v2"

/**
 * 旧版 BOM 项目名称本地存储键名（仅用于迁移自定义名称）
 */
const LEGACY_PROJECT_NAME_KEY = "tqx_bom_project_name"

/**
 * 库存不足阈值（库存 <= 用量 * 该倍数时标记预警）
 */
const STOCK_WARNING_RATIO = 10

/**
 * BOM 管理页面
 *
 * 功能说明：
 * - 展示用户 BOM 清单表格，支持用量编辑、删除、汇总计算。
 * - 优先从 localStorage 读取 bomList，登录后调用 bomApi.validate 校验库存并获取替代建议。
 * - 提供添加型号、上传 BOM 文件、保存清单、导出 Excel 等工具栏操作。
 * - 底部支持直接下单、提交询盘、仅保存三种提交方式。
 */
export function BOMPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // BOM 列表与项目信息
  const [items, setItems] = useState<BOMItem[]>([])
  const [projectName, setProjectName] = useState<string>("")

  // 标记用户是否手动编辑过项目名称（避免把默认翻译值写入 localStorage）
  const isProjectNameEdited = useRef(false)

  // 加载与校验状态
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(false)

  // 上传结果预览弹窗
  const [uploadPreview, setUploadPreview] = useState<BOMUploadResult | null>(null)

  // 校验返回的预警与替代建议
  const [warnings, setWarnings] = useState<
    Array<{ model_id: number; message: string; alternate?: any }>
  >([])

  // 询盘表单展开状态与字段
  const [showInquiryForm, setShowInquiryForm] = useState(false)
  const [inquiryCompany, setInquiryCompany] = useState("")
  const [inquiryContactName, setInquiryContactName] = useState("")
  const [inquiryEmail, setInquiryEmail] = useState("")
  const [inquiryPhone, setInquiryPhone] = useState("")
  const [inquiryProject, setInquiryProject] = useState(projectName)
  const [inquiryQuantity, setInquiryQuantity] = useState("")
  const [inquiryLeadTime, setInquiryLeadTime] = useState("")
  const [inquiryNotes, setInquiryNotes] = useState("")

  /**
   * 判断当前是否已登录
   */
  const isLoggedIn = useMemo(() => !!getAuthToken(), [items])

  /**
   * 登录用户自动填充联系人信息
   */
  useEffect(() => {
    if (isLoggedIn) {
      userApi.getProfile().then(res => {
        if (res.code === 200 && res.data) {
          setInquiryContactName(prev => prev || res.data.nickname || res.data.username || "")
          setInquiryEmail(prev => prev || res.data.email || "")
          setInquiryPhone(prev => prev || res.data.phone || "")
          setInquiryCompany(prev => prev || res.data.company || "")
        }
      }).catch(console.error)
    }
  }, [isLoggedIn])

  // 防止校验回写触发重复请求
  const validatingRef = useRef(false)
  const itemsRef = useRef<BOMItem[]>([])
  itemsRef.current = items

  /**
   * 仅当型号集合或用量变化时触发服务端校验（库存/阶梯价联动）
   * 不依赖 stock/unit_price，避免校验回写导致死循环
   */
  const validationKey = useMemo(
    () =>
      items
        .map((item) => `${item.model_id || 0}|${item.model_code || ""}|${item.quantity || 0}`)
        .join(";;"),
    [items]
  )

  /**
   * 组件挂载时：从 localStorage 加载 BOM 数据，并同步询盘表单的项目名称
   */
  useEffect(() => {
    const newName = localStorage.getItem(BOM_PROJECT_NAME_KEY)
    const legacyName = localStorage.getItem(LEGACY_PROJECT_NAME_KEY)
    const savedName = newName || legacyName
    const savedItems = localStorage.getItem(BOM_STORAGE_KEY)

    // 兼容旧数据：如果保存的是默认名称（中文旧值），视为未自定义
    const isDefaultName = !savedName || savedName === "未命名项目"
    if (savedName && !isDefaultName) {
      isProjectNameEdited.current = true
      setProjectName(savedName)
      setInquiryProject(savedName)
    } else {
      const defaultName = t("未命名项目")
      setProjectName(defaultName)
      setInquiryProject(defaultName)
    }

    if (savedItems) {
      try {
        const parsed: Array<Partial<BOMItem> & Record<string, any>> = JSON.parse(savedItems)
        // 兼容 ModelMatrixPage / ModelDetail / 旧版 series 误写入 的字段
        const normalized: BOMItem[] = parsed
          .map((item) => ({
            model_id: Number(item.model_id ?? item.modelId ?? 0) || 0,
            model_code: String(item.model_code ?? item.modelCode ?? ""),
            model_name: String(item.model_name ?? item.modelName ?? ""),
            brand_name: String(item.brand_name ?? item.brandName ?? ""),
            quantity: Math.max(1, Number(item.quantity ?? 1) || 1),
            unit_price: Number(item.unit_price ?? item.unitPrice ?? 0) || 0,
            stock: Number(item.stock ?? 0) || 0,
            warning: item.warning ?? false,
            alternate: item.alternate ?? null,
          }))
          // 过滤既无 model_id 又无 model_code 的脏数据（旧版把系列当型号写入）
          .filter((item) => item.model_id > 0 || !!item.model_code)
        setItems(normalized)
      } catch {
        // 本地数据解析失败时重置为空列表
        setItems([])
      }
    }
  }, [])

  /**
   * BOM 列表变化时：持久化到 localStorage（不触发校验）
   */
  useEffect(() => {
    if (items.length === 0) {
      localStorage.removeItem(BOM_STORAGE_KEY)
      setWarnings([])
      window.dispatchEvent(new Event("bomListUpdated"))
      return
    }

    localStorage.setItem(BOM_STORAGE_KEY, JSON.stringify(items))
    window.dispatchEvent(new Event("bomListUpdated"))
  }, [items])

  /**
   * 型号/用量变化时：防抖调用服务端校验，联动刷新单价与库存
   */
  useEffect(() => {
    if (!validationKey) {
      setWarnings([])
      return
    }

    const timer = window.setTimeout(() => {
      void validateStock()
    }, 350)

    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validationKey])

  /**
   * 同步项目名称到 localStorage 与询盘表单
   */
  useEffect(() => {
    if (isProjectNameEdited.current) {
      localStorage.setItem(BOM_PROJECT_NAME_KEY, projectName)
      // 迁移完成后删除旧 key，避免后续被误读
      localStorage.removeItem(LEGACY_PROJECT_NAME_KEY)
    }
    setInquiryProject(projectName)
  }, [projectName])

  /**
   * 汇总统计：型号数、总片数、总金额
   * 小计即时联动：quantity × unit_price
   */
  const summary = useMemo(() => {
    const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0)
    const totalAmount = items.reduce(
      (sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0),
      0
    )
    return {
      modelCount: items.length,
      totalQuantity,
      totalAmount,
    }
  }, [items])

  /**
   * 调用 bomApi.validate 校验库存并按用量刷新阶梯单价
   */
  const validateStock = async () => {
    const currentItems = itemsRef.current
    if (currentItems.length === 0 || validatingRef.current) return

    validatingRef.current = true
    setValidating(true)
    try {
      const payload = currentItems.map((item) => ({
        model_id: item.model_id || 0,
        model_code: item.model_code || "",
        quantity: item.quantity || 1,
      }))
      const res = await bomApi.validate(payload)

      if (res.code === 200 && res.data) {
        const validatedItems = res.data.items || []
        // 优先按 model_id 匹配，回退 model_code（兼容旧脏数据）
        const byId = new Map<number, (typeof validatedItems)[number]>()
        const byCode = new Map<string, (typeof validatedItems)[number]>()
        validatedItems.forEach((item) => {
          if (item.model_id) byId.set(item.model_id, item)
          if (item.model_code) byCode.set(item.model_code, item)
        })

        setItems((prev) => {
          let changed = false
          const next = prev.map((item) => {
            const validated =
              (item.model_id ? byId.get(item.model_id) : undefined) ||
              (item.model_code ? byCode.get(item.model_code) : undefined)
            if (!validated) return item

            const nextUnitPrice =
              validated.unit_price !== undefined && validated.unit_price !== null
                ? Number(validated.unit_price)
                : item.unit_price
            const nextStock =
              validated.stock !== undefined && validated.stock !== null
                ? Number(validated.stock)
                : item.stock
            const nextWarning = validated.warning ?? item.warning
            const nextModelId = validated.model_id || item.model_id
            const nextModelCode = validated.model_code || item.model_code
            const nextModelName = validated.model_name || item.model_name
            const nextBrand = validated.brand_name || item.brand_name

            if (
              nextUnitPrice === item.unit_price &&
              nextStock === item.stock &&
              nextWarning === item.warning &&
              nextModelId === item.model_id &&
              nextModelCode === item.model_code &&
              nextModelName === item.model_name &&
              nextBrand === item.brand_name
            ) {
              return item
            }

            changed = true
            return {
              ...item,
              model_id: nextModelId,
              model_code: nextModelCode,
              model_name: nextModelName,
              brand_name: nextBrand,
              // 用量以本地为准（用户正在编辑），不被服务端覆盖
              quantity: item.quantity,
              stock: nextStock,
              unit_price: nextUnitPrice,
              warning: nextWarning,
              alternate: validated.alternate ?? item.alternate,
            }
          })
          return changed ? next : prev
        })

        setWarnings(res.data.warnings || [])
      } else if (res.message) {
        // 校验接口业务失败时保留本地小计，仅提示
        console.warn("库存校验业务失败：", res.message)
      }
    } catch (error) {
      console.error("库存校验失败：", error)
      // 不打断用量编辑体验，仅在控制台记录；网络异常时仍用本地单价计算小计
    } finally {
      validatingRef.current = false
      setValidating(false)
    }
  }

  /**
   * 更新指定 BOM 项的用量
   * 本地立即重算小计（quantity × unit_price）；防抖后由 validationKey 触发服务端阶梯价刷新
   */
  const handleQuantityChange = (modelId: number, modelCode: string, value: string) => {
    const quantity = parseInt(value, 10)
    if (Number.isNaN(quantity) || quantity < 1) return

    setItems((prev) =>
      prev.map((item) => {
        const matched =
          (modelId > 0 && item.model_id === modelId) ||
          (!!modelCode && item.model_code === modelCode && item.model_id === modelId)
        // 兼容 model_id=0 的旧脏数据：用 model_code 匹配
        const matchedLegacy =
          modelId <= 0 && !!modelCode && item.model_code === modelCode
        if (!matched && !matchedLegacy) return item
        if (item.quantity === quantity) return item
        return { ...item, quantity }
      })
    )
  }

  /**
   * 删除指定 BOM 项
   * 使用 model_id + model_code 复合定位，兼容 model_id=0 的旧脏数据（避免误删同 id 条目）
   */
  const handleDelete = (modelId: number, modelCode: string) => {
    setItems((prev) =>
      prev.filter((item) => !(item.model_id === modelId && item.model_code === modelCode))
    )
    toast.success(t("已删除该型号"))
  }

  /**
   * 清空 BOM 清单
   */
  const handleClearBOM = () => {
    if (items.length === 0) return
    if (window.confirm(t("确定要清空 BOM 清单吗？"))) {
      setItems([])
      toast.success(t("已清空 BOM 清单"))
    }
  }

  /**
   * 添加型号：跳转到系列列表页
   */
  const handleAddModel = () => {
    navigate("/series")
  }

  /**
   * 上传 BOM 文件并打开预览弹窗
   */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    try {
      const res = await bomApi.uploadBOM(file)
      if (res.code === 200 && res.data) {
        setUploadPreview(res.data)
      } else {
        toast.error(res.message || t("上传失败"))
      }
    } catch (error) {
      console.error("BOM 上传失败：", error)
      toast.error(t("BOM 上传失败，请检查文件格式"))
    } finally {
      setLoading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  /**
   * 将上传结果中的匹配项合并到当前 BOM 列表
   */
  const mergeUploadResult = (result: BOMUploadResult) => {
    const { matched, unmatched } = result
    if (!matched || matched.length === 0) {
      toast.info(t("未从文件中识别到有效型号"))
      return
    }

    setItems((prev) => {
      const next = [...prev]
      matched.forEach((newItem) => {
        const existIndex = next.findIndex((item) => item.model_id === newItem.model_id)
        if (existIndex >= 0) {
          // 已存在则累加用量
          next[existIndex] = {
            ...next[existIndex],
            quantity: (next[existIndex].quantity || 0) + (newItem.quantity || 0),
          }
        } else {
          next.push({ ...newItem })
        }
      })
      return next
    })

    if (unmatched && unmatched.length > 0) {
      toast.warning(`${unmatched.length}${t("条型号未匹配")}：${unmatched.map((u) => u.mpn).join(", ")}`)
    } else {
      toast.success(`${t("成功导入")} ${matched.length} ${t("条型号")}`)
    }
  }

  /**
   * 确认导入：将匹配项合并到 BOM 列表并关闭预览弹窗
   */
  const handleConfirmImport = () => {
    if (!uploadPreview) return
    mergeUploadResult(uploadPreview)
    setUploadPreview(null)
  }

  /**
   * 取消导入：关闭预览弹窗
   */
  const handleCancelImport = () => {
    setUploadPreview(null)
  }

  /**
   * 保存 BOM 项目到云端
   */
  const handleSaveProject = async () => {
    if (items.length === 0) {
      toast.info(t("BOM 清单为空，无需保存"))
      return
    }

    if (!isLoggedIn) {
      toast.info(t("已保存到本地，登录后可同步到云端"))
      return
    }

    setLoading(true)
    try {
      const project: BOMProject = {
        name: projectName,
        items,
        total_quantity: summary.totalQuantity,
        total_amount: summary.totalAmount,
      }
      const res = await bomApi.saveProject(project)
      if (res.code === 200) {
        toast.success(t("清单保存成功"))
      } else {
        toast.error(res.message || t("保存失败"))
      }
    } catch (error) {
      console.error("保存 BOM 项目失败：", error)
      toast.error(t("保存失败，请稍后重试"))
    } finally {
      setLoading(false)
    }
  }

  /**
   * 导出 BOM 清单为 CSV 文件（兼容 Excel 打开）
   */
  const handleExportExcel = () => {
    if (items.length === 0) {
      toast.info(t("BOM 清单为空，无可导出数据"))
      return
    }

    // 表头使用 BOM  UTF-8 编码，Excel 打开中文不乱码
    const headers = [t("序号"), "MPN", t("品牌"), t("描述"), t("用量"), t("单价"), t("小计"), t("库存")]
    const rows = items.map((item, index) => [
      index + 1,
      item.model_code,
      item.brand_name || "-",
      item.model_name || "-",
      item.quantity || 0,
      item.unit_price || 0,
      ((item.quantity || 0) * (item.unit_price || 0)).toFixed(4),
      item.stock ?? "-",
    ])

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const text = String(cell)
            // 含逗号、双引号或换行时包裹双引号
            if (text.includes(",") || text.includes('"') || text.includes("\n")) {
              return `"${text.replace(/"/g, '""')}"`
            }
            return text
          })
          .join(",")
      )
      .join("\n")

    // 添加 BOM 头，确保 Excel 正确识别 UTF-8
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${projectName}_BOM_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success(t("BOM 清单导出成功"))
  }

  /**
   * 直接下单：未登录跳转登录页
   */
  const handleDirectOrder = () => {
    if (!isLoggedIn) {
      navigate("/login", { state: { from: "/bom" } })
      return
    }

    if (items.length === 0) {
      toast.info(t("BOM 清单为空，无法下单"))
      return
    }

    // 直接下单需跳转商城购物车，由用户确认后结算
    toast.success(t("已跳转至购物车，请确认商品后结算"))
    navigate("/mall/cart")
  }

  /**
   * 切换询盘表单显示状态
   */
  const handleToggleInquiry = () => {
    setShowInquiryForm((prev) => !prev)
  }

  /**
   * 提交 BOM 询盘
   */
  const handleSubmitInquiry = async () => {
    if (items.length === 0) {
      toast.info(t("BOM 清单为空，无法提交询盘"))
      return
    }

    setLoading(true)
    try {
      const res = await bomApi.submitInquiry({
        project_name: inquiryProject || projectName,
        company: inquiryCompany,
        contact_name: inquiryContactName,
        email: inquiryEmail,
        phone: inquiryPhone,
        quantity: inquiryQuantity,
        lead_time: inquiryLeadTime,
        notes: inquiryNotes,
        items: items.map((item) => ({
          model_id: item.model_id,
          model_code: item.model_code,
          quantity: item.quantity || 0,
        })),
      })

      if (res.code === 200) {
        toast.success(t("询盘提交成功"))
        setShowInquiryForm(false)
      } else {
        toast.error(res.message || t("提交失败"))
      }
    } catch (error) {
      console.error("提交询盘失败：", error)
      toast.error(t("提交询盘失败，请稍后重试"))
    } finally {
      setLoading(false)
    }
  }

  /**
   * 仅保存到本地
   */
  const handleSaveOnly = () => {
    localStorage.setItem(BOM_STORAGE_KEY, JSON.stringify(items))
    localStorage.setItem(BOM_PROJECT_NAME_KEY, projectName)
    toast.success(t("已保存到本地"))
  }

  /**
   * 判断某一行是否需要显示库存预警背景
   */
  const isWarningRow = (item: BOMItem) => {
    if (item.warning) return true
    const stock = item.stock ?? 0
    const quantity = item.quantity || 0
    return stock > 0 && stock <= quantity * STOCK_WARNING_RATIO
  }

  /**
   * 格式化金额显示
   */
  const formatPrice = (value: number) => {
    return `$${value.toFixed(4)} USD`
  }

  /**
   * 格式化库存显示
   */
  const formatStock = (value?: number) => {
    if (value === undefined || value === null) return "-"
    return value.toLocaleString("zh-CN")
  }

  return (
    <div className="min-h-screen bg-[#fafafa] pb-10">
      {/* 页面标题栏 */}
      <div className="bg-white border-b border-[#e0e0e0]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-xl font-bold text-[#1a1a1a] flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#e60012]" />
            {t("我的 BOM 清单")}
          </h1>
          <div className="flex items-center gap-2 text-sm text-[#666666]">
            <Folder className="w-4 h-4" />
            <span>{t("项目：")}</span>
            <input
              type="text"
              value={projectName}
              onChange={(e) => {
                isProjectNameEdited.current = true
                setProjectName(e.target.value)
              }}
              className="font-semibold text-[#333333] bg-transparent border-b border-transparent hover:border-[#e60012] focus:border-[#e60012] focus:outline-none px-1 transition-colors"
              placeholder={t("请输入项目名称")}
            />
          </div>
        </div>
      </div>

      {/* 顶部工具栏 */}
      <div className="bg-white border-b border-[#f5f5f5]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <button
            onClick={handleAddModel}
            className="px-3 py-1.5 text-sm rounded-lg border border-[#e0e0e0] text-[#666666] bg-white hover:border-[#e60012] hover:text-[#e60012] transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {t("添加型号")}
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-sm rounded-lg border border-[#e0e0e0] text-[#666666] bg-white hover:border-[#e60012] hover:text-[#e60012] transition-colors flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4" />
            {t("上传 BOM 文件")}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            onClick={handleSaveProject}
            disabled={loading}
            className="px-3 py-1.5 text-sm rounded-lg border border-[#e0e0e0] text-[#666666] bg-white hover:border-[#e60012] hover:text-[#e60012] transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {t("保存清单")}
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 text-sm rounded-lg border border-[#e0e0e0] text-[#666666] bg-white hover:border-[#e60012] hover:text-[#e60012] transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {t("导出 Excel")}
          </button>

          {!isLoggedIn && (
            <span className="text-xs text-[#999999]">{t("未登录，仅使用本地数据")}</span>
          )}
          {validating && (
            <span className="text-xs text-[#999999]">{t("库存校验中")}...</span>
          )}
        </div>
      </div>

      {/* BOM 表格 */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 py-5">
          {items.length === 0 ? (
            <div className="text-center py-16 text-[#999999] bg-[#fafafa] rounded-lg border border-dashed border-[#e0e0e0]">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 text-[#b3b3b3]" />
              <p className="text-sm mb-4">{t("BOM 清单为空，请添加型号或上传 BOM 文件")}</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleAddModel}
                  className="px-4 py-2 text-sm rounded-lg bg-[#e60012] text-white hover:bg-[#c7000f] transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  {t("添加型号")}
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 text-sm rounded-lg border border-[#e0e0e0] text-[#666666] hover:border-[#e60012] hover:text-[#e60012] transition-colors flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  {t("上传 BOM 文件")}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ minWidth: 800 }}>
                  <thead>
                    <tr className="border-b-2 border-[#e0e0e0]">
                      <th className="text-left p-3 text-xs font-semibold text-[#444444] w-12">#</th>
                      <th className="text-left p-3 text-xs font-semibold text-[#444444]">
                        {t("MPN (厂商型号)")}
                      </th>
                      <th className="text-left p-3 text-xs font-semibold text-[#444444]">{t("品牌")}</th>
                      <th className="text-left p-3 text-xs font-semibold text-[#444444]">{t("描述")}</th>
                      <th className="text-center p-3 text-xs font-semibold text-[#444444]">{t("用量")}</th>
                      <th className="text-center p-3 text-xs font-semibold text-[#444444]">{t("单价")}</th>
                      <th className="text-center p-3 text-xs font-semibold text-[#444444]">{t("小计")}</th>
                      <th className="text-center p-3 text-xs font-semibold text-[#444444]">{t("库存")}</th>
                      <th className="text-center p-3 text-xs font-semibold text-[#444444] w-16">{t("操作")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const warning = isWarningRow(item)
                      return (
                        <tr
                          key={`${item.model_id || 0}-${item.model_code || index}`}
                          className={`border-b border-[#e0e0e0] ${
                            warning ? "bg-[#fff5e6]" : "bg-white"
                          }`}
                        >
                          <td className="p-3 text-sm text-[#999999]">{index + 1}</td>
                          <td className="p-3 text-sm font-medium text-[#1a1a1a] font-mono max-w-[220px] truncate">
                            {item.model_code}
                          </td>
                          <td className="p-3 text-sm text-[#666666]">
                            {item.brand_name || "-"}
                          </td>
                          <td className="p-3 text-sm text-[#666666] max-w-[200px] truncate">
                            {item.model_name || "-"}
                          </td>
                          <td className="text-center p-3 text-sm text-[#333333]">
                            <input
                              type="number"
                              min={1}
                              value={item.quantity || ""}
                              onChange={(e) =>
                                handleQuantityChange(item.model_id, item.model_code, e.target.value)
                              }
                              className="w-16 text-center px-2 py-1 border border-[#e0e0e0] rounded focus:border-[#e60012] focus:outline-none"
                            />
                          </td>
                          <td className="text-center p-3 text-sm text-[#333333] font-mono">
                            {formatPrice(item.unit_price || 0)}
                          </td>
                          <td className="text-center p-3 text-sm font-medium text-[#333333] font-mono">
                            {formatPrice((item.quantity || 0) * (item.unit_price || 0))}
                          </td>
                          <td className="text-center p-3 text-sm font-mono">
                            {warning ? (
                              <span className="text-[#e67e00] font-semibold flex items-center justify-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {formatStock(item.stock)}
                              </span>
                            ) : (
                              <span className="text-[#00802b]">
                                {formatStock(item.stock)}
                              </span>
                            )}
                          </td>
                          <td className="text-center p-3">
                            <button
                              onClick={() => handleDelete(item.model_id, item.model_code)}
                              className="w-7 h-7 flex items-center justify-center rounded-md text-[#999999] hover:text-[#e60012] hover:bg-[#fef2f2] transition-colors mx-auto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* 汇总栏 */}
              <div className="mt-4 px-4 py-3 bg-[#f5f5f5] border border-[#e0e0e0] rounded-lg flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-4 text-sm text-[#555555]">
                  <span>
                    <strong>{summary.modelCount}</strong> {t("个型号")}
                  </span>
                  <span className="text-[#e0e0e0]">|</span>
                  <span>
                    <strong>{summary.totalQuantity}</strong> {t("片")}
                  </span>
                  <span className="text-[#e0e0e0]">|</span>
                  <span className="font-semibold text-[#e60012]">
                    {formatPrice(summary.totalAmount)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* 预警与替代建议 */}
      {warnings.length > 0 && (
        <section className="bg-white">
          <div className="max-w-7xl mx-auto px-4 pb-5 flex flex-col gap-3">
            {warnings.map((warning, index) => (
              <div
                key={`warning-${warning.model_id}-${index}`}
                className="px-4 py-3 bg-[#fff5e6] border border-[#ffe3bf] rounded-lg flex items-start gap-3"
              >
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-[#e67e00]" />
                <div className="text-sm text-[#6e3a00]">
                  <span className="font-semibold">{t("库存预警")}：</span>
                  {warning.message}
                </div>
              </div>
            ))}
            {warnings
              .filter((w) => w.alternate)
              .map((warning, index) => (
                <div
                  key={`alternate-${warning.model_id}-${index}`}
                  className="px-4 py-3 bg-[#f0f0f0] border border-[#e0e0e0] rounded-lg flex items-start gap-3"
                >
                  <Info className="w-5 h-5 shrink-0 mt-0.5 text-[#444444]" />
                  <div className="text-sm text-[#333333]">
                    <span className="font-semibold">{t("替代建议")}：</span>
                    {warning.alternate.alternate_model
                      ? `${warning.alternate.alternate_model.model_code} (${warning.alternate.alternate_model.brand_name || "-"})，${t("库存")} ${
                          warning.alternate.alternate_model.stock ?? t("未知")
                        } ${t("片")}。${warning.alternate.notes || ""}`
                      : warning.alternate.notes || t("该型号暂无替代建议")}
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* 底部提交区 */}
      <section className="bg-white border-t border-[#e0e0e0]">
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-center gap-3 flex-wrap">
          <button
            onClick={handleDirectOrder}
            className="px-6 py-2 text-sm rounded-lg text-white bg-[#e60012] hover:bg-[#c7000f] transition-colors flex items-center gap-1.5"
          >
            <ShoppingBag className="w-4 h-4" />
            {t("直接下单")}
          </button>
          <button
            onClick={handleToggleInquiry}
            className={`px-6 py-2 text-sm rounded-lg border transition-colors flex items-center gap-1.5 ${
              showInquiryForm
                ? "border-[#e60012] text-[#e60012] bg-[#fef2f2]"
                : "border-[#e0e0e0] text-[#666666] bg-white hover:border-[#e60012] hover:text-[#e60012]"
            }`}
          >
            <Send className="w-4 h-4" />
            {showInquiryForm ? t("收起询盘") : t("提交询盘")}
          </button>
          <button
            onClick={handleSaveOnly}
            className="px-6 py-2 text-sm rounded-lg border border-[#e0e0e0] text-[#666666] bg-white hover:border-[#e60012] hover:text-[#e60012] transition-colors flex items-center gap-1.5"
          >
            <Bookmark className="w-4 h-4" />
            {t("仅保存")}
          </button>
          <button
            onClick={handleClearBOM}
            disabled={items.length === 0}
            className="px-6 py-2 text-sm rounded-lg text-[#e60012] hover:text-[#c7000f] disabled:text-[#999999] disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            {t("清空")}
          </button>
        </div>
      </section>

      {/* 询盘表单 */}
      {showInquiryForm && (
        <section className="bg-[#fafafa] border-t border-[#e0e0e0]">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <h2 className="text-base font-semibold mb-4 text-[#333333]">{t("询盘信息")}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-[#555555]">{t("公司名称")}</label>
                <input
                  type="text"
                  value={inquiryCompany}
                  onChange={(e) => setInquiryCompany(e.target.value)}
                  placeholder={t("请输入公司名称")}
                  className="px-3 h-9 border border-[#e0e0e0] rounded-lg text-sm text-[#333333] bg-white focus:border-[#e60012] focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-[#555555]">{t("联系人姓名")}</label>
                <input
                  type="text"
                  value={inquiryContactName}
                  onChange={(e) => setInquiryContactName(e.target.value)}
                  placeholder={t("请输入联系人姓名")}
                  className="px-3 h-9 border border-[#e0e0e0] rounded-lg text-sm text-[#333333] bg-white focus:border-[#e60012] focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-[#555555]">{t("邮箱")}</label>
                <input
                  type="email"
                  value={inquiryEmail}
                  onChange={(e) => setInquiryEmail(e.target.value)}
                  placeholder={t("请输入邮箱地址")}
                  className="px-3 h-9 border border-[#e0e0e0] rounded-lg text-sm text-[#333333] bg-white focus:border-[#e60012] focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-[#555555]">{t("电话")}</label>
                <input
                  type="tel"
                  value={inquiryPhone}
                  onChange={(e) => setInquiryPhone(e.target.value)}
                  placeholder={t("请输入联系电话")}
                  className="px-3 h-9 border border-[#e0e0e0] rounded-lg text-sm text-[#333333] bg-white focus:border-[#e60012] focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-[#555555]">{t("项目名称")}</label>
                <input
                  type="text"
                  value={inquiryProject}
                  onChange={(e) => setInquiryProject(e.target.value)}
                  placeholder={t("请输入项目名称")}
                  className="px-3 h-9 border border-[#e0e0e0] rounded-lg text-sm text-[#333333] bg-white focus:border-[#e60012] focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-[#555555]">{t("需求数量")}</label>
                <input
                  type="text"
                  value={inquiryQuantity}
                  onChange={(e) => setInquiryQuantity(e.target.value)}
                  placeholder={t("例：1000 PCS")}
                  className="px-3 h-9 border border-[#e0e0e0] rounded-lg text-sm text-[#333333] bg-white focus:border-[#e60012] focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-[#555555]">{t("交期要求")}</label>
                <input
                  type="text"
                  value={inquiryLeadTime}
                  onChange={(e) => setInquiryLeadTime(e.target.value)}
                  placeholder={t("例：3天内")}
                  className="px-3 h-9 border border-[#e0e0e0] rounded-lg text-sm text-[#333333] bg-white focus:border-[#e60012] focus:outline-none"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5 mb-4">
              <label className="text-sm text-[#555555]">{t("备注说明")}</label>
              <textarea
                value={inquiryNotes}
                onChange={(e) => setInquiryNotes(e.target.value)}
                rows={3}
                placeholder={t("请输入补充说明，如特殊包装、资质要求等")}
                className="px-3 py-2 border border-[#e0e0e0] rounded-lg text-sm text-[#333333] bg-white resize-none focus:border-[#e60012] focus:outline-none"
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSubmitInquiry}
                disabled={loading}
                className="px-6 py-2 text-sm rounded-lg text-white bg-[#e60012] hover:bg-[#c7000f] transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {t("提交询盘")}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 全局加载遮罩 */}
      {loading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg px-6 py-4 flex items-center gap-3 shadow-lg">
            <div className="w-5 h-5 border-2 border-[#e60012] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-[#555555]">{t("处理中")}...</span>
          </div>
        </div>
      )}

      {/* 上传结果预览弹窗 */}
      {uploadPreview && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            {/* 弹窗头部 */}
            <div className="px-6 py-4 border-b border-[#f0f0f0] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#fff0f0] flex items-center justify-center flex-shrink-0">
                  <FileSpreadsheet className="w-5 h-5 text-[#e60012]" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#222222]">{t("BOM 上传结果预览")}</h3>
                  <p className="text-xs text-[#999999] mt-0.5">
                    {t("共解析")} {uploadPreview.total ?? (uploadPreview.matched?.length ?? 0) + (uploadPreview.unmatched?.length ?? 0)} {t("条")}
                    <span className="mx-2">|</span>
                    <span className="text-green-600">{t("匹配成功")} {uploadPreview.matched?.length ?? 0} {t("条")}</span>
                    <span className="mx-2">|</span>
                    <span className="text-[#ff9500]">{t("未匹配")} {uploadPreview.unmatched?.length ?? 0} {t("条")}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancelImport}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f5f5f5] transition-colors"
              >
                <span className="text-xl text-[#999999] leading-none">×</span>
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="flex-1 overflow-auto p-6 space-y-6">
              {/* 匹配成功 */}
              {(uploadPreview.matched?.length ?? 0) > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium text-[#333333]">
                      {t("匹配成功")}（{uploadPreview.matched.length} {t("条")}）
                    </span>
                  </div>
                  <div className="border border-[#f0f0f0] rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#fafafa] text-[#666666]">
                          <th className="px-4 py-2.5 text-left font-medium">{t("型号")}</th>
                          <th className="px-4 py-2.5 text-left font-medium">{t("品牌")}</th>
                          <th className="px-4 py-2.5 text-left font-medium">{t("描述")}</th>
                          <th className="px-4 py-2.5 text-right font-medium">{t("用量")}</th>
                          <th className="px-4 py-2.5 text-right font-medium">{t("库存")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploadPreview.matched.map((item, idx) => (
                          <tr key={idx} className="border-t border-[#f5f5f5]">
                            <td className="px-4 py-3">
                              <div className="text-[#222222] font-medium">{item.model_code}</div>
                              <div className="text-xs text-[#999999] mt-0.5">{item.model_name}</div>
                            </td>
                            <td className="px-4 py-3 text-[#555555]">{item.brand_name || "-"}</td>
                            <td className="px-4 py-3 text-[#666666] max-w-[180px] truncate">
                              {item.model_name || "-"}
                            </td>
                            <td className="px-4 py-3 text-right text-[#222222] font-medium">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={(item.stock ?? 0) > 0 ? "text-green-600" : "text-[#ff4d4f]"}>
                                {(item.stock ?? 0).toLocaleString()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 未匹配 */}
              {(uploadPreview.unmatched?.length ?? 0) > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-[#ff9500]" />
                    <span className="text-sm font-medium text-[#333333]">
                      {t("未匹配")}（{uploadPreview.unmatched.length} {t("条")}）
                    </span>
                    <span className="text-xs text-[#999999]">{t("这些型号未在系统中找到，导入时将被忽略")}</span>
                  </div>
                  <div className="border border-[#ffe5b4] bg-[#fffaf0] rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[#996600] bg-[#fff5e6]">
                          <th className="px-4 py-2.5 text-left font-medium">{t("行号")}</th>
                          <th className="px-4 py-2.5 text-left font-medium">{t("型号(MPN)")}</th>
                          <th className="px-4 py-2.5 text-right font-medium">{t("用量")}</th>
                          <th className="px-4 py-2.5 text-left font-medium">{t("原因")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploadPreview.unmatched.map((item, idx) => (
                          <tr key={idx} className="border-t border-[#ffe5b4]/60">
                            <td className="px-4 py-3 text-[#666666]">{item.row ?? idx + 2}</td>
                            <td className="px-4 py-3 text-[#664400] font-mono text-xs">{item.mpn}</td>
                            <td className="px-4 py-3 text-right text-[#666666]">{item.quantity}</td>
                            <td className="px-4 py-3 text-[#996600] text-xs">{item.reason || t("未找到匹配型号")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 完全无匹配提示 */}
              {(uploadPreview.matched?.length ?? 0) === 0 && (
                <div className="text-center py-10 text-[#999999]">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-[#ff9500]" />
                  <p className="text-sm">{t("未从文件中识别到有效型号")}</p>
                  <p className="text-xs mt-1">{t("请检查型号(MPN)列是否填写正确的型号编码")}</p>
                </div>
              )}
            </div>

            {/* 弹窗底部 */}
            <div className="px-6 py-4 border-t border-[#f0f0f0] flex items-center justify-between flex-shrink-0">
              <div className="text-xs text-[#999999]">
                {t("导入后将与已有清单合并，相同型号累加用量")}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCancelImport}
                  className="px-5 py-2 text-sm rounded-lg border border-[#e0e0e0] text-[#666666] hover:border-[#cccccc] transition-colors"
                >
                  {t("取消")}
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={(uploadPreview.matched?.length ?? 0) === 0}
                  className="px-5 py-2 text-sm rounded-lg bg-[#e60012] text-white hover:bg-[#c7000f] transition-colors disabled:bg-[#e0e0e0] disabled:text-[#999999] disabled:cursor-not-allowed"
                >
                  {t("确认导入")}（{uploadPreview.matched?.length ?? 0} {t("条")}）
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
