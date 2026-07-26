"use client"
import { useState, useEffect } from "react"
import { BrowserRouter } from "react-router-dom"
import { Header } from "./components/Header"
import { Footer } from "./components/Footer"
import { AppRouter } from "./router"
import { type HomeData, type HomeApiResponse, systemApi } from "./lib/api-client"
import { useCachedApi } from "./hooks/useCachedApi"
import SmartLoading from "./components/Loading/SmartLoading"
import ProductSkeleton from "./components/Loading/ProductSkeleton"
import i18n from "./lib/i18n"

// 把后端语言标识映射为前端 i18n 语言代码
const mapLangCode = (code: string): string => {
  const normalized = String(code).toLowerCase()
  if (normalized.startsWith('zh')) return 'zh'
  if (normalized.startsWith('en')) return 'en'
  if (normalized.startsWith('ja')) return 'ja'
  if (normalized.startsWith('ko')) return 'ko'
  return 'zh'
}

function App() {
  const { data: apiResponse, loading, error } = useCachedApi<HomeApiResponse>('/home')
  const [homeData, setHomeData] = useState<HomeData | null>(null)

  useEffect(() => {
    if (apiResponse?.code === 200) {
      setHomeData(apiResponse.data)
    }
  }, [apiResponse])

  // 初始化语言：优先使用 localStorage 缓存，无缓存时跟随后台默认语言
  useEffect(() => {
    // 1. 先检查 localStorage 是否有用户主动选择的语言缓存
    const cachedLang = localStorage.getItem('lang')
    if (cachedLang) {
      const lang = mapLangCode(cachedLang)
      if (i18n.language !== lang) {
        i18n.changeLanguage(lang)
      }
      return
    }

    // 2. 无缓存时才请求后端默认语言
    systemApi.getDefaultLanguage()
      .then(res => {
        if (res.code === 200 && res.data) {
          const defaultCode = res.data.code || res.data.lang_code || res.data.identifier || 'zh-CN'
          const lang = mapLangCode(defaultCode)
          const currentLang = i18n.language || 'zh'

          i18n.changeLanguage(lang)
          localStorage.setItem('lang', lang)
          document.cookie = `lang=${lang}; path=/; max-age=31536000`

          // 如果实际语言发生变化，刷新页面以重新请求 home 等接口，确保后端缓存的翻译词条随语言同步
          if (currentLang !== lang) {
            window.location.reload()
          }
        }
      })
      .catch(err => {
        console.error('获取默认语言失败:', err)
      })
  }, [])

  return (
    <BrowserRouter>
      <div className="min-h-screen w-full bg-white">
        <Header headerData={homeData?.header} />
        <SmartLoading
          isLoading={loading}
          error={error}
          fallback={<ProductSkeleton />}
          delay={200}
        >
          <main>
            <AppRouter />
          </main>
          <Footer data={homeData?.footer} />
        </SmartLoading>
      </div>
    </BrowserRouter>
  )
}

export default App
