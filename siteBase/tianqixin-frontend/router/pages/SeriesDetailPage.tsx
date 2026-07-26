"use client"

import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useTranslation } from 'react-i18next'
import { seriesApi, type SeriesDetail } from "../../lib/api-client"
import { Loader2, FileText, Download, ArrowRight, Cpu, ShieldCheck } from "lucide-react"
import { CategorySidebar } from "../../components/CategorySidebar/CategorySidebar"

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

export function SeriesDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const [series, setSeries] = useState<SeriesDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    seriesApi.getSeriesDetail(Number(id))
      .then(detailRes => {
        if (detailRes.code === 200) {
          setSeries(detailRes.data)
          if (detailRes.data.category && detailRes.data.category.categoryId) {
            setCategoryId(Number(detailRes.data.category.categoryId))
          }
        }
      })
      .catch(err => {
        console.error('获取系列详情失败:', err)
      })
      .finally(() => setLoading(false))
  }, [id])

  const breadcrumbs = [
    { name: t('主页'), href: '/' },
    { name: t('产品'), href: '/series' },
  ]
  if (series?.category?.path?.length) {
    series.category.path.forEach((name, idx) => {
      breadcrumbs.push({
        name,
        href: idx === series.category.path.length - 1 ? `/series?category_id=${series.category.categoryId}` : '#',
      })
    })
  }
  if (series) {
    breadcrumbs.push({ name: series.name, href: '' })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 className="animate-spin" style={{ color: RED_PRIMARY, width: 48, height: 48 }} />
      </div>
    )
  }

  if (!series) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <div style={{ fontSize: '18px', color: TEXT_SECONDARY }}>{t('系列不存在')}</div>
        <Link to="/series" style={{ color: RED_PRIMARY, textDecoration: 'none' }}>{t('返回系列列表')}</Link>
      </div>
    )
  }

  const datasheets = series.documents?.filter(d => d.type === 'datasheet') || []
  // const ecadDocs = series.documents?.filter(d => d.type === 'cad_model') || []
  // const appNotes = series.documents?.filter(d => d.type === 'application_note') || []
  const certifications = series.documents?.filter(d => d.type === 'certification') || []

  const specItems = [
    { label: t('封装'), value: series.specSummary?.packageRange },
    { label: t('阻值'), value: series.specSummary?.resistanceRange },
    { label: t('精度'), value: series.specSummary?.toleranceRange },
    { label: t('功率'), value: series.specSummary?.powerRange },
  ].filter(item => item.value && item.value !== '—')

  return (
    <div style={{ minHeight: '100vh', backgroundColor: BG_GRAY }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 16px 48px', display: 'flex', gap: '16px' }}>
        <CategorySidebar
          selectedCategoryId={categoryId}
          selectedSeriesId={Number(id)}
          autoExpandCategoryId={categoryId}
          showSeriesList={true}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', color: TEXT_MUTED, marginBottom: '12px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1
              return (
                <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  {isLast || !crumb.href || crumb.href === '#' ? (
                    <span style={{ color: isLast ? TEXT_PRIMARY : TEXT_MUTED }}>{crumb.name}</span>
                  ) : (
                    <Link to={crumb.href} style={{ color: TEXT_MUTED, textDecoration: 'none' }}>{crumb.name}</Link>
                  )}
                  {!isLast && <span style={{ color: TEXT_MUTED }}>/</span>}
                </span>
              )
            })}
          </div>

          <div style={{
            background: '#fff',
            border: `1px solid ${NEUTRAL_200}`,
            borderRadius: '6px',
            padding: '24px 32px',
            boxShadow: '0 1px 2px rgba(0,0,0,.04)',
          }}>
            <div className="flex flex-col md:flex-row gap-6" style={{ marginBottom: '20px' }}>
              <div style={{
                width: '200px',
                minWidth: '200px',
                height: '160px',
                background: NEUTRAL_100,
                border: `1px solid ${NEUTRAL_200}`,
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: '8px',
              }}>
                {series.image ? (
                  <img src={series.image} alt={series.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '16px' }} />
                ) : (
                  <>
                    <div style={{
                      width: '80px',
                      height: '50px',
                      background: NEUTRAL_200,
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Cpu style={{ width: '32px', height: '32px', color: NEUTRAL_400 }} />
                    </div>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: NEUTRAL_400 }}>{series.seriesId}</span>
                  </>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0, flexDirection: 'column', justifyContent: 'center', display: 'flex' }}>
                <h1 style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: NEUTRAL_900,
                  margin: '0 0 10px 0',
                  textWrap: 'balance',
                  wordBreak: 'keep-all',
                  overflowWrap: 'break-word',
                }}>
                  {series.name}
                </h1>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {series.brand?.name && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '3px 12px',
                      border: `1px solid ${RED_PRIMARY}`,
                      borderRadius: '2px',
                      fontSize: '12px',
                      color: RED_PRIMARY,
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                    }}>
                      <ShieldCheck style={{ width: '13px', height: '13px', marginRight: '4px' }} />
                      {series.brand.name}
                    </span>
                  )}
                  <span style={{ fontSize: '12px', color: TEXT_MUTED, whiteSpace: 'nowrap' }}>
                    {t('制造商编号')}: {series.seriesId}
                  </span>
                  {series.mpnPrefix && (
                    <span style={{ fontSize: '12px', color: TEXT_MUTED, whiteSpace: 'nowrap' }}>
                      MPN前缀: {series.mpnPrefix}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '16px', color: RED_PRIMARY, fontWeight: 600, marginBottom: '14px' }}>
                  {t('在售型号')}：<span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{series.modelCount}</span> {t('款')}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gapX: '24px', gapY: '6px', fontSize: '13px' }}>
                  {specItems.map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{ color: TEXT_MUTED, fontSize: '12px' }}>{item.label}</span>
                      <span style={{ color: TEXT_PRIMARY, fontWeight: 500, fontFamily: 'JetBrains Mono, monospace' }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${NEUTRAL_200}`, margin: '20px 0' }}></div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{
                color: NEUTRAL_600,
                fontSize: '14px',
                lineHeight: '1.7',
                margin: '0 0 12px 0',
                maxWidth: '800px',
              }}>
                {series.description || t('该系列产品暂无详细描述')}
              </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              {datasheets.length > 0 ? (
                <a
                  href={datasheets[0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 20px',
                    border: `1px solid ${RED_PRIMARY}`,
                    borderRadius: '4px',
                    color: RED_PRIMARY,
                    fontSize: '13px',
                    fontWeight: 500,
                    background: '#fff',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  <Download style={{ width: '16px', height: '16px' }} />
                  {t('技术文档')}
                </a>
              ) : (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 20px',
                  border: `1px solid ${NEUTRAL_200}`,
                  borderRadius: '4px',
                  color: TEXT_MUTED,
                  fontSize: '13px',
                  fontWeight: 500,
                  background: '#fff',
                  cursor: 'not-allowed',
                }}>
                  <Download style={{ width: '16px', height: '16px' }} />
                  {t('技术文档')}
                </span>
              )}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                {datasheets.map((doc, idx) => (
                  <a
                    key={`datasheet-${idx}`}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: RED_PRIMARY,
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <FileText style={{ width: '14px', height: '14px' }} />
                    <span>{doc.name}</span>
                    {doc.size && <span style={{ fontSize: '12px', color: TEXT_MUTED }}>PDF {doc.size}</span>}
                  </a>
                ))}
                {certifications.map((doc, idx) => (
                  <a
                    key={`cert-${idx}`}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: RED_PRIMARY,
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <ShieldCheck style={{ width: '14px', height: '14px' }} />
                    <span>{doc.name}</span>
                    {doc.size && <span style={{ fontSize: '12px', color: TEXT_MUTED }}>PDF {doc.size}</span>}
                  </a>
                ))}
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${NEUTRAL_200}`, margin: '0 0 20px 0' }}></div>

            <Link
              to={`/series/${series.id}/models`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                width: '100%',
                padding: '12px 0',
                background: RED_PRIMARY,
                color: '#fff',
                fontSize: '15px',
                fontWeight: 600,
                borderRadius: '6px',
                textDecoration: 'none',
                transition: 'background 0.15s',
              }}
            >
              {t('查看全部')} {series.modelCount} {t('个型号')}
              <ArrowRight style={{ width: '18px', height: '18px' }} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}