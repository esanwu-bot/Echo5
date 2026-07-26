"use client"

/**
 * 样品申请弹窗组件
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Send, Loader2 } from 'lucide-react'
import { guideApi } from '@/lib/guide-api'

interface SampleModalProps {
  isOpen: boolean
  onClose: () => void
  product: {
    id: number
    name: string
    product_code: string
    stock: number
  } | null
}

export default function GuideSampleModal({ isOpen, onClose, product }: SampleModalProps) {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    quantity: 1,
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    company: '',
    purpose: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    if (!product) return
    if (!form.contact_name || !form.contact_phone) {
      alert(t('请填写联系人和电话'))
      return
    }

    setLoading(true)
    try {
      const res = await guideApi.createSample({
        product_id: product.id,
        quantity: form.quantity,
        contact_name: form.contact_name,
        contact_phone: form.contact_phone,
        contact_email: form.contact_email,
        company: form.company,
        purpose: form.purpose,
      })

      if (res.code === 200) {
        setSuccess(true)
        setTimeout(() => {
          onClose()
          setSuccess(false)
          setForm({
            quantity: 1,
            contact_name: '',
            contact_phone: '',
            contact_email: '',
            company: '',
            purpose: '',
          })
        }, 2000)
      } else {
        alert(res.message || t('提交失败'))
      }
    } catch (error) {
      alert(t('提交失败，请稍后重试'))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !product) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">{t('申请样品')}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="text-emerald-500" size={32} />
            </div>
            <h4 className="text-lg font-semibold text-slate-900 mb-2">{t('申请已提交')}</h4>
            <p className="text-slate-500">{t('我们会尽快审核并联系您')}</p>
          </div>
        ) : (
          <>
            {/* 产品信息 */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="text-sm text-slate-500 mb-1">{t('申请产品')}</div>
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-slate-900">{product.product_code}</div>
                  <div className="text-sm text-slate-500">{t(product.name)}</div>
                </div>
                <div className="text-sm text-slate-500">{t('库存')}: {product.stock}</div>
              </div>
            </div>

            {/* 表单 */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('申请数量')}</label>
                <input
                  type="number"
                  min={1}
                  max={Math.min(10, product.stock)}
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
                <p className="text-xs text-slate-400 mt-1">{t('样品数量通常限制在1-10片')}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('联系人')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.contact_name}
                    onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    placeholder={t('请输入姓名')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('电话')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={form.contact_phone}
                    onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    placeholder={t('请输入电话')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('邮箱')}</label>
                <input
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder={t('请输入邮箱（选填）')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('公司')}</label>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder={t('请输入公司名称（选填）')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('用途说明')}</label>
                <textarea
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                  placeholder={t('请说明样品用途（选填）')}
                />
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                {t('取消')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <Loader2 className="animate-spin" size={16} />}
                {t('提交申请')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
