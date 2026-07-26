import type React from "react"
import { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
  X,
  Warehouse,
  FileText,
  Plus,
  ShoppingCart,
  CheckCircle,
  Loader2,
  Columns2,
  Cpu,
  ClipboardList,
} from "lucide-react"
import { useTranslation } from 'react-i18next'
import { modelApi, alternateApi, type ModelDetail as ModelDetailType, type AlternateModel, type ModelDownloadFile, getAuthToken, type BOMItem } from "../../lib/api-client"

interface ModelDetailProps {
  modelId: string
  onClose?: () => void
}

interface StockLocation {
  warehouse: string
  warehouse_code: string
  stock: number
  status: 'in_stock' | 'low_stock' | 'out_of_stock'
}

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
const SUCCESS_600 = '#00802b'
const SUCCESS_50 = '#e6f4ea'

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
    <span
      style={{
        display: 'inline-block',
        width: '8px',
        height: '8px',
        backgroundColor: RED_PRIMARY,
        transform: 'rotate(45deg)',
        marginRight: '8px',
        flexShrink: 0,
        marginTop: '3px',
      }}
    />
    <h3 style={{ fontSize: '14px', fontWeight: 600, color: NEUTRAL_800, margin: 0 }}>{children}</h3>
  </div>
)

export const ModelDetailDrawer: React.FC<ModelDetailProps> = ({ modelId, onClose }) => {
  const { t } = useTranslation()
  const [model, setModel] = useState<ModelDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [alternates, setAlternates] = useState<AlternateModel[]>([])
  const [stockLocations, setStockLocations] = useState<StockLocation[]>([])
  const [downloads, setDownloads] = useState<ModelDownloadFile[]>([])
  const [bomList, setBomList] = useState<BOMItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('bomList') || '[]') } catch { return [] }
  })
  const [compareList, setCompareList] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem('compareModels')
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.filter((id: unknown): id is number => typeof id === 'number') : []
    } catch {
      return []
    }
  })
  const navigate = useNavigate()

  useEffect(() => {
    localStorage.setItem('bomList', JSON.stringify(bomList))
    window.dispatchEvent(new Event('bomListUpdated'))
  }, [bomList])

  useEffect(() => {
    localStorage.setItem('compareModels', JSON.stringify(compareList))
    window.dispatchEvent(new Event('compareListUpdated'))
  }, [compareList])

  useEffect(() => {
    if (modelId) {
      fetchModelDetail(modelId)
      fetchAlternates(modelId)
      fetchStockLocations(modelId)
      fetchDownloads(modelId)
    }
  }, [modelId])

  const fetchModelDetail = async (id: string) => {
    try {
      setLoading(true)
      const response = await modelApi.getModelDetail(id)
      if (response.code === 200) {
        setModel(response.data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchAlternates = async (id: string) => {
    try {
      const res = await alternateApi.getModelAlternates(Number(id))
      if (res.code === 200) {
        setAlternates(res.data)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const fetchStockLocations = async (id: string) => {
    try {
      const res = await modelApi.getStockLocations(id)
      if (res.code === 200) {
        setStockLocations(res.data || [])
      }
    } catch (err) {
      console.error(err)
    }
  }

  const fetchDownloads = async (id: string) => {
    try {
      const res = await modelApi.getDownloads(id)
      if (res.code === 200) {
        setDownloads(res.data || [])
      }
    } catch (err) {
      console.error(err)
    }
  }

  const getParamValue = useCallback((paramName: string) => {
    if (!model) return '-'
    const param = model.params?.find(p => p.name === paramName || p.paramName === paramName)
    return param?.value || param?.paramValue || '-'
  }, [model])

  const addToBOM = () => {
    if (!model) return
    const code = model.header.modelCode
    setBomList(prev => {
      const existing = prev.find(b => b.model_code === code)
      if (existing) {
        return prev.map(b => b.model_code === code ? { ...b, quantity: b.quantity + 1 } : b)
      }
      return [...prev, { model_id: Number(modelId), model_code: code, model_name: model.header.modelName || '', quantity: 1 }]
    })
  }

  const toggleCompare = () => {
    if (!model) return
    const targetId = Number(modelId)
    setCompareList(prev => {
      const exists = prev.includes(targetId)
      if (exists) {
        return prev.filter(id => id !== targetId)
      }
      if (prev.length >= 4) {
        return prev
      }
      return [...prev, targetId]
    })
  }

  const handleOrderClick = () => {
    const token = getAuthToken()
    if (!token) {
      const returnUrl = encodeURIComponent(`/models/${modelId}`)
      navigate(`/login?redirect=${returnUrl}`)
      return
    }
    if (model?.header.modelCode) {
      navigate(`/order/${model.header.modelCode}`)
    }
  }

  const isInCompare = compareList.includes(Number(modelId))

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      window.history.length > 1 ? navigate(-1) : navigate('/series')
    }
  }

  const coreParams = [
    { label: t('阻值'), value: getParamValue('resistance') },
    { label: t('精度'), value: getParamValue('tolerance') },
    { label: t('封装'), value: model?.packageInfo?.packageType?.value || getParamValue('package_type') },
    { label: t('额定功率'), value: getParamValue('power') },
    { label: t('工作电压'), value: getParamValue('voltage') },
    { label: t('温度系数'), value: getParamValue('tcr') },
    { label: t('包装'), value: model?.packageInfo?.packaging?.value || getParamValue('packaging') },
    { label: t('工作温度'), value: model?.packageInfo?.operatingTemperature?.value || getParamValue('operating_temperature') },
  ].filter(p => p.value && p.value !== '-')

  const priceBreaks = model?.pricing?.priceBreaks || []

  const datasheetFiles = downloads.filter(d => d.type === 'datasheet')
  const complianceFiles = downloads.filter(d => d.type === 'spec_report' || d.type === 'compliance')
  const ecadFiles = downloads.filter(d => d.type === '3d_model' || d.type === 'footprint')

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.35)',
          zIndex: 50,
        }}
        onClick={handleClose}
      />

      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '480px',
          maxWidth: '100vw',
          backgroundColor: '#ffffff',
          boxShadow: '0 20px 48px rgba(0,0,0,.05)',
          zIndex: 60,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: `1px solid ${NEUTRAL_200}`,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: NEUTRAL_900,
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {model?.header.modelCode || `${t('型号')} ${modelId}`}
            </h2>
            <p
              style={{
                fontSize: '12px',
                color: NEUTRAL_500,
                margin: '4px 0 0 0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {model?.header.modelName || model?.breadcrumbs?.find(b => b.link?.startsWith('/brand/'))?.label || t('加载中...')}
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: NEUTRAL_100,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginLeft: '12px',
              transition: 'background-color 0.15s',
            }}
            onMouseOver={e => { e.currentTarget.style.backgroundColor = NEUTRAL_200 }}
            onMouseOut={e => { e.currentTarget.style.backgroundColor = NEUTRAL_100 }}
          >
            <X size={16} style={{ color: NEUTRAL_500 }} />
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
          }}
        >
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
              <Loader2 size={28} style={{ color: RED_PRIMARY, animation: 'spin 1s linear infinite' }} />
            </div>
          ) : !model ? (
            <div style={{ textAlign: 'center', padding: '64px 0', color: NEUTRAL_500 }}>
              {t('型号不存在')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <section>
                <SectionTitle>{t('核心参数')}</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {coreParams.map((param, index) => (
                    <div
                      key={index}
                      style={{
                        backgroundColor: NEUTRAL_100,
                        borderRadius: '4px',
                        padding: '12px',
                      }}
                    >
                      <p style={{ fontSize: '12px', color: NEUTRAL_500, margin: '0 0 4px 0' }}>{param.label}</p>
                      <p
                        style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: NEUTRAL_900,
                          margin: 0,
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                      >
                        {param.value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {priceBreaks.length > 0 && (
                <section>
                  <SectionTitle>{t('价格阶梯')}</SectionTitle>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {priceBreaks.map((pb, index) => {
                      const isBest = index > 0 && index < priceBreaks.length - 1
                      return (
                        <div
                          key={index}
                          style={{
                            backgroundColor: NEUTRAL_100,
                            borderRadius: '4px',
                            padding: '12px',
                            position: 'relative',
                          }}
                        >
                          <p style={{ fontSize: '12px', color: NEUTRAL_500, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {pb.quantity}
                            {isBest && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '0 6px',
                                  height: '16px',
                                  borderRadius: '2px',
                                  backgroundColor: SUCCESS_50,
                                  color: SUCCESS_600,
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {t('最优')}
                              </span>
                            )}
                          </p>
                          <p
                            style={{
                              fontSize: '18px',
                              fontWeight: 700,
                              color: NEUTRAL_900,
                              margin: 0,
                              fontFamily: 'JetBrains Mono, monospace',
                            }}
                          >
                            ${pb.price.toFixed(3)} USD
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              <section>
                <SectionTitle>{t('库存信息')}</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {stockLocations.length > 0 ? (
                    stockLocations.map((location, index) => (
                      <div
                        key={index}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: NEUTRAL_100,
                          borderRadius: '4px',
                          padding: '10px 12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <Warehouse size={14} style={{ color: NEUTRAL_500, flexShrink: 0 }} />
                          <span style={{ fontSize: '12px', color: NEUTRAL_700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {location.warehouse}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          <span
                            style={{
                              fontSize: '14px',
                              fontWeight: 700,
                              color: NEUTRAL_900,
                              fontFamily: 'JetBrains Mono, monospace',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {location.stock.toLocaleString()}
                          </span>
                          <span style={{ fontSize: '12px', color: NEUTRAL_400 }}>{t('片')}</span>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              padding: '0 6px',
                              height: '18px',
                              borderRadius: '2px',
                              backgroundColor: SUCCESS_50,
                              color: SUCCESS_600,
                              fontSize: '10px',
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <CheckCircle size={10} />
                            {t('现货')}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '8px 0', color: NEUTRAL_500, fontSize: '14px' }}>
                      {t('暂无库存信息')}
                    </div>
                  )}
                </div>
              </section>

              <section>
                <SectionTitle>{t('替代型号推荐')}</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {alternates.length > 0 ? (
                    alternates.slice(0, 5).map((alt, index) => (
                      <div
                        key={index}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          border: `1px solid ${NEUTRAL_200}`,
                          borderRadius: '4px',
                          padding: '10px 12px',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0, marginRight: '8px' }}>
                          <p
                            style={{
                              fontSize: '12px',
                              fontWeight: 500,
                              color: NEUTRAL_800,
                              margin: 0,
                              fontFamily: 'JetBrains Mono, monospace',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {alt.alternate_model?.model_code || `#${alt.alternate_model_id}`}
                          </p>
                          <p
                            style={{
                              fontSize: '11px',
                              color: NEUTRAL_500,
                              margin: '2px 0 0 0',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {alt.alternate_model?.brand?.name || ''}
                            {alt.reason && ` · ${alt.reason}`}
                          </p>
                        </div>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0 8px',
                            height: '18px',
                            borderRadius: '2px',
                            border: `1px solid ${alt.match_type === 'DIRECT' ? NEUTRAL_500 : RED_PRIMARY}`,
                            color: alt.match_type === 'DIRECT' ? NEUTRAL_700 : RED_PRIMARY,
                            fontSize: '10px',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          {alt.match_type === 'DIRECT' ? t('直接替代') : t('功能替代')}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '8px 0', color: NEUTRAL_500, fontSize: '14px' }}>
                      {t('暂无推荐的替代型号')}
                    </div>
                  )}
                </div>
              </section>

              <section>
                <SectionTitle>{t('文档下载')}</SectionTitle>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {datasheetFiles.length > 0 && (
                    <a
                      href={datasheetFiles[0].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '0 12px',
                        height: '32px',
                        border: `1px solid ${NEUTRAL_300}`,
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: NEUTRAL_600,
                        backgroundColor: '#ffffff',
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        transition: 'border-color 0.15s',
                      }}
                      onMouseOver={e => { e.currentTarget.style.borderColor = NEUTRAL_400 }}
                      onMouseOut={e => { e.currentTarget.style.borderColor = NEUTRAL_300 }}
                    >
                      <FileText size={13} />
                      {t('数据手册')}
                    </a>
                  )}
                  {complianceFiles.length > 0 && (
                    <a
                      href={complianceFiles[0].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '0 12px',
                        height: '32px',
                        border: `1px solid ${NEUTRAL_300}`,
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: NEUTRAL_600,
                        backgroundColor: '#ffffff',
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        transition: 'border-color 0.15s',
                      }}
                      onMouseOver={e => { e.currentTarget.style.borderColor = NEUTRAL_400 }}
                      onMouseOut={e => { e.currentTarget.style.borderColor = NEUTRAL_300 }}
                    >
                      <ClipboardList size={13} />
                      {t('合规证书')}
                    </a>
                  )}
                  {ecadFiles.length > 0 && (
                    <a
                      href={ecadFiles[0].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '0 12px',
                        height: '32px',
                        border: `1px solid ${NEUTRAL_300}`,
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: NEUTRAL_600,
                        backgroundColor: '#ffffff',
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        transition: 'border-color 0.15s',
                      }}
                      onMouseOver={e => { e.currentTarget.style.borderColor = NEUTRAL_400 }}
                      onMouseOut={e => { e.currentTarget.style.borderColor = NEUTRAL_300 }}
                    >
                      <Cpu size={13} />
                      {t('ECAD库')}
                    </a>
                  )}
                  {downloads.length === 0 && (
                    <div style={{ padding: '8px 0', color: NEUTRAL_500, fontSize: '14px' }}>
                      {t('暂无下载资料')}
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>

        <div
          style={{
            flexShrink: 0,
            borderTop: `1px solid ${NEUTRAL_200}`,
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#ffffff',
          }}
        >
          <button
            onClick={addToBOM}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 12px',
              height: '36px',
              border: `1px solid ${NEUTRAL_300}`,
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 500,
              color: NEUTRAL_600,
              backgroundColor: '#ffffff',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'border-color 0.15s',
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = NEUTRAL_400 }}
            onMouseOut={e => { e.currentTarget.style.borderColor = NEUTRAL_300 }}
          >
            <Plus size={14} />
            {t('加入BOM')}
          </button>
          <button
            onClick={toggleCompare}
            disabled={compareList.length >= 4 && !isInCompare}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 12px',
              height: '36px',
              border: `1px solid ${NEUTRAL_300}`,
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 500,
              color: NEUTRAL_600,
              backgroundColor: isInCompare ? NEUTRAL_50 : '#ffffff',
              cursor: compareList.length >= 4 && !isInCompare ? 'not-allowed' : 'pointer',
              opacity: compareList.length >= 4 && !isInCompare ? 0.5 : 1,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'border-color 0.15s',
            }}
            onMouseOver={e => { if (!isInCompare && !(compareList.length >= 4)) e.currentTarget.style.borderColor = NEUTRAL_400 }}
            onMouseOut={e => { if (!isInCompare) e.currentTarget.style.borderColor = NEUTRAL_300 }}
          >
            <Columns2 size={14} />
            {isInCompare ? t('已加入对比') : t('加入对比')}
          </button>
          <button
            onClick={handleOrderClick}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 20px',
              height: '36px',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#ffffff',
              backgroundColor: RED_PRIMARY,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              marginLeft: 'auto',
              transition: 'background-color 0.15s',
            }}
            onMouseOver={e => { e.currentTarget.style.backgroundColor = '#c7000f' }}
            onMouseOut={e => { e.currentTarget.style.backgroundColor = RED_PRIMARY }}
          >
            <ShoppingCart size={14} />
            {t('立即购买')}
          </button>
        </div>
      </div>
    </>
  )
}