import type React from "react"
import { Phone } from "lucide-react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import type { HomeData } from "../lib/api-client"

interface FooterProps {
  data?: HomeData["footer"]
}

export const Footer: React.FC<FooterProps> = ({ data }) => {
  const { t, i18n } = useTranslation()
  const showFilingInfo = i18n.language === 'zh' || i18n.language.startsWith('zh-') || i18n.language === 'zh_hant'

  return (
    <footer className="bg-[#1B212D] text-gray-300 py-16 text-sm">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12 border-b border-gray-700 pb-12">
          {/* Logo & Info */}
          <div className="space-y-4 lg:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <img src="/footer-logo.png" alt="Logo" className="w-12 h-12 object-contain" />
              <div>
                <h3 className="text-2xl font-bold text-white leading-none tracking-tight">
                  {data?.companyInfo?.name ? t(data.companyInfo.name) : t('天启芯科技')}
                </h3>
                <p className="text-[10px] text-gray-400 tracking-wider mt-0.5">Tianqixin Technology</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              {data?.companyInfo?.description ? t(data.companyInfo.description) : t('天启芯 为全球电子制造提供更加优质、高效、便捷的电子元件供应与服务。')}
            </p>
          </div>

          {/* Products */}
          <div>
            <h4 className="text-white font-bold mb-6 text-lg">{t('产品')}</h4>
            <ul className="space-y-3">
              {data?.hotProductCategories && data.hotProductCategories.length > 0 ? (
                data.hotProductCategories.map((cat: any) => (
                  <li key={cat.id}>
                    <Link to={`/series?category_id=${cat.id}`} className="hover:text-white transition-colors">
                      {t(cat.name)}
                    </Link>
                  </li>
                ))
              ) : (
                <>
                  <li><Link to="/series" className="hover:text-white transition-colors">{t('电阻')}</Link></li>
                  <li><Link to="/series" className="hover:text-white transition-colors">{t('电感')}</Link></li>
                  <li><Link to="/series" className="hover:text-white transition-colors">{t('电容')}</Link></li>
                  <li><Link to="/series" className="hover:text-white transition-colors">{t('集成电路 (IC)')}</Link></li>
                </>
              )}
            </ul>
          </div>

          {/* Applications */}
          <div>
            <h4 className="text-white font-bold mb-6 text-lg">{t('应用')}</h4>
            <ul className="space-y-3">
              {data?.hotApplicationCategories && data.hotApplicationCategories.length > 0 ? (
                data.hotApplicationCategories.map((cat: any) => (
                  <li key={cat.id}>
                    <Link to={`/applications?category_id=${cat.id}`} className="hover:text-white transition-colors">
                      {t(cat.name)}
                    </Link>
                  </li>
                ))
              ) : (
                <>
                  <li><Link to="/applications" className="hover:text-white transition-colors">{t('电源管理')}</Link></li>
                  <li><Link to="/applications" className="hover:text-white transition-colors">{t('电机驱动器')}</Link></li>
                </>
              )}
            </ul>
          </div>

          {/* About */}
          <div>
            <h4 className="text-white font-bold mb-6 text-lg">{t('关于天启芯')}</h4>
            <ul className="space-y-3">
              <li><Link to="/about#intro" className="hover:text-white transition-colors">{t('企业简介')}</Link></li>
              <li><Link to="/about#values" className="hover:text-white transition-colors">{t('企业价值观')}</Link></li>
              <li><Link to="/about#team" className="hover:text-white transition-colors">{t('团队介绍')}</Link></li>
              <li><Link to="/about#careers" className="hover:text-white transition-colors">{t('人才招聘')}</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-bold mb-6 text-lg">{t('联系我们')}</h4>
            <div className="flex items-center space-x-2 text-white text-lg font-medium mb-2">
              <div className="bg-white text-black rounded-full p-1">
                <Phone className="w-4 h-4" />
              </div>
              <span>{data?.companyInfo?.contact?.phone || "40066-88888"}</span>
            </div>
            {data?.companyInfo?.contact?.email && (
              <p className="text-xs text-gray-400 mt-2">{data.companyInfo.contact.email}</p>
            )}
            {data?.companyInfo?.contact?.address && (
              <p className="text-xs text-gray-400 mt-1">{t(data.companyInfo.contact.address)}</p>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center text-xs text-gray-500">
          <div className="flex flex-wrap gap-4 justify-center md:justify-start mb-4 md:mb-0">
            <Link to="/article/cookie-policy" className="hover:text-white">Cookie {t('政策')}</Link>
            <Link to="/article/privacy-policy" className="hover:text-white">{t('隐私政策')}</Link>
            <Link to="/article/sales-terms" className="hover:text-white">{t('销售条款')}</Link>
            <Link to="/article/use-terms" className="hover:text-white">{t('使用条款')}</Link>
            <Link to="/article/trademark" className="hover:text-white">{t('商标')}</Link>
            <Link to="/article/feedback" className="hover:text-white">{t('网站反馈')}</Link>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4">
            <p>{data?.copyright || t('© 2025 天启芯科技 版权所有')}</p>
            <div className="flex flex-wrap items-center gap-4">
              {showFilingInfo && (
                <>
                  <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                    {data?.icp || t('粤ICP备88888888号')}
                  </a>
                  <a href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=88888888888888" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-white transition-colors">
                    <img src="/ba.png" alt="备案" className="w-4 h-4 object-contain" />
                    <span>{t('粤公网安备 88888888888888号')}</span>
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
