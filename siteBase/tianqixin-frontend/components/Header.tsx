"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ShoppingCart, Menu, X, Phone, ChevronDown, User, LogOut, Bot, Search, ClipboardList, BarChart3 } from "lucide-react"
import { getAuthToken, authApi, userApi, seriesApi, searchApi } from "../lib/api-client"
import { LanguageSwitcher } from "./LanguageSwitcher"

interface HeaderProps {
  onNavigate?: (page: string) => void
  headerData?: {
    navigation?: {
      items?: Array<{ name: string; url: string; active?: boolean }>
    }
  }
}

export const Header: React.FC<HeaderProps> = ({ onNavigate, headerData }) => {
  const { t } = useTranslation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [username, setUsername] = useState("")
  const [searchKeyword, setSearchKeyword] = useState("")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [bomCount, setBomCount] = useState(0)
  const [compareCount, setCompareCount] = useState(0)
  const searchRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const navigate = useNavigate()

  // 从 localStorage 读取 BOM 和对比列表数量
  const updateBadgeCounts = () => {
    try {
      const bomRaw = localStorage.getItem('bomList')
      const bomList = bomRaw ? JSON.parse(bomRaw) : []
      setBomCount(Array.isArray(bomList) ? bomList.length : 0)
    } catch {
      setBomCount(0)
    }
    try {
      const compareRaw = localStorage.getItem('compareModels')
      const compareList = compareRaw ? JSON.parse(compareRaw) : []
      setCompareCount(Array.isArray(compareList) ? compareList.length : 0)
    } catch {
      setCompareCount(0)
    }
  }

  useEffect(() => {
    updateBadgeCounts()
    // 监听 BOM 列表更新事件（同页面内）
    window.addEventListener('bomListUpdated', updateBadgeCounts)
    window.addEventListener('compareListUpdated', updateBadgeCounts)
    return () => {
      window.removeEventListener('bomListUpdated', updateBadgeCounts)
      window.removeEventListener('compareListUpdated', updateBadgeCounts)
    }
  }, [location.pathname])

  useEffect(() => {
    const checkLoginStatus = async () => {
      const token = getAuthToken()
      if (token) {
        setIsLoggedIn(true)
        try {
          const response = await userApi.getProfile()
          if (response.code === 200 && response.data) {
            setUsername(response.data.nickname || response.data.username || t('用户'))
          }
        } catch (error) {
          console.error("Failed to get user info:", error)
        }
      } else {
        setIsLoggedIn(false)
      }
    }

    checkLoginStatus()
  }, [location.pathname])

  const handleLogout = async () => {
    try {
      await authApi.logout()
      setIsLoggedIn(false)
      setUsername("")
      navigate('/')
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  const handleSearch = (keyword?: string) => {
    const q = (keyword || searchKeyword).trim()
    if (!q) return
    setShowSuggestions(false)
    navigate(`/series/2001/models?keyword=${encodeURIComponent(q)}`)
  }

  useEffect(() => {
    const timer = setTimeout(async () => {
      const q = searchKeyword.trim()
      if (q.length < 2) {
        setSuggestions([])
        setShowSuggestions(false)
        return
      }
      try {
        const res = await searchApi.getSuggestions(q)
        if (res.code === 200) {
          const raw = res.data?.list || res.data?.suggestions || res.data || []
          const list = Array.isArray(raw) ? raw : []
          // 兼容后端返回 { text, type } 对象的情况，统一取文本
          setSuggestions(list.map((item: any) => (typeof item === 'string' ? item : item?.text ?? String(item))))
          setShowSuggestions(true)
        }
      } catch {
        // ignore
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [searchKeyword])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const defaultNavLinks = [
    { name: t('首页'), href: "/" },
    { name: t('产品'), href: "/series" },
    { name: t('应用'), href: "/applications" },
    { name: t('技术支持'), href: "/support" },
    { name: t('关于我们'), href: "/about", hasDropdown: true },
    { name: t('新闻'), href: "/news" },
  ]

  // 使用 API 返回的多语言导航数据（如果有），将旧 /products 入口统一映射到 /series
  const navLinks = headerData?.navigation?.items
    ? headerData.navigation.items.map(item => ({
        name: t(item.name),
        href: item.url?.startsWith('/products') ? '/series' : item.url,
        hasDropdown: item.url === '/about'
      }))
    : defaultNavLinks

  const aboutSubLinks = [
    { name: t('企业简介'), href: "/about#profile" },
    { name: t('企业价值观'), href: "/about#values" },
    { name: t('团队介绍'), href: "/about#team" },
    { name: t('人才招聘'), href: "/about#careers" },
  ]

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/"
    return location.pathname.startsWith(href)
  }

  return (
    <header className="w-full sticky top-0 z-50 bg-white shadow-sm font-sans">
      <div className="bg-[#e60012] text-white text-xs" style={{ height: "32px", fontSize: "var(--font-size-caption)", fontFamily: "var(--font-body)" }}>
        <div className="max-w-[1200px] mx-auto px-4 h-full flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="bg-white rounded-full p-0.5">
              <Phone className="w-3 h-3 text-[#e60012]" fill="currentColor" />
            </div>
            <span className="font-medium">40066-88888</span>
          </div>
          <div className="flex items-center space-x-6">
            <Link to="/mall" className="flex items-center hover:opacity-80 transition-opacity">
              <ShoppingCart className="w-4 h-4 mr-1" />
              <span>{t('商城')}</span>
            </Link>
            <div className="h-3 w-px bg-white/50"></div>
            {isLoggedIn ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center hover:opacity-80 transition-opacity"
                >
                  <User className="w-4 h-4 mr-1" />
                  <span>{username}</span>
                  <ChevronDown className="w-3 h-3 ml-1" />
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-40 bg-white text-gray-800 rounded shadow-lg py-2 z-50">
                    <Link
                      to="/member"
                      className="block px-4 py-2 hover:bg-gray-100 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      {t('会员中心')}
                    </Link>
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        handleLogout()
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors flex items-center text-red-600"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      {t('退出登录')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="hover:opacity-80 transition-opacity">
                {t('登录 / 注册')}
              </Link>
            )}
            <div className="h-3 w-px bg-white/50"></div>
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="max-w-[1200px] mx-auto px-4 flex items-center justify-between gap-x-6" style={{ height: "56px" }}>
        <Link to="/" className="flex items-center">
          <img
            src="/logo.png"
            alt="Tianqixin Technology"
            width={180}
            height={60}
            className="h-12 w-auto object-contain"
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-6" style={{ fontFamily: "var(--font-body)", fontSize: "var(--font-size-body)" }}>
          {/* 智能体导购 - 红色高亮入口 */}
          <Link
            to="/guide"
            className={`no-underline whitespace-nowrap flex items-center ${isActive("/guide") ? "text-[#e60012] font-semibold" : "text-[#e60012]"}`}
          >
            <Bot className="w-4 h-4 mr-1.5" />
            {t('智能体导购')}
          </Link>

          {navLinks.map((link) => (
            <div key={link.name} className="relative group">
              <Link
                to={link.href}
                className={`no-underline whitespace-nowrap transition-colors ${isActive(link.href) ? "text-[#e60012] font-semibold" : "text-[#444444] hover:text-[#e60012]"}`}
              >
                {link.name}
              </Link>

              {link.hasDropdown && (
                <div className="absolute top-full left-0 w-32 bg-white shadow-lg border-t-2 border-[#e60012] py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top z-50 flex flex-col">
                  {aboutSubLinks.map((subLink) => (
                    <Link
                      key={subLink.name}
                      to={subLink.href}
                      className="px-4 py-2 text-sm text-gray-700 hover:text-[#e60012] hover:bg-gray-50 text-center block"
                    >
                      {subLink.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Search Box & BOM/Compare Icons */}
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <div ref={searchRef} className="relative">
            <div className="flex items-center" style={{ background: "var(--tqx-neutral-100)", border: "1px solid var(--tqx-neutral-200)", borderRadius: "var(--radius-md)", height: "var(--size-input-height)", padding: "0 10px", width: "200px" }}>
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder={t('搜索型号 / 关键词')}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch()
                }}
                style={{ background: "transparent", border: "none", outline: "none", fontSize: "13px", width: "100%", fontFamily: "var(--font-body)", color: "var(--fg)" }}
              />
              <button onClick={() => handleSearch()} style={{ border: "none", background: "transparent", cursor: "pointer" }}>
                <Search style={{ width: "16px", height: "16px", color: "var(--tqx-neutral-400)", flexShrink: 0 }} />
              </button>
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 w-full bg-white shadow-lg border border-gray-200 z-50 mt-1 rounded-sm max-h-60 overflow-y-auto">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-[#e60012] transition-colors border-b border-gray-100 last:border-0"
                    onClick={() => handleSearch(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* BOM 清单入口 */}
          <Link
            to="/bom"
            className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 transition-colors"
            title={t('BOM 清单')}
          >
            <ClipboardList className="w-5 h-5 text-[#444444]" />
            {bomCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#e60012] text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
                {bomCount}
              </span>
            )}
          </Link>

          {/* 型号对比入口 */}
          <Link
            to="/compare"
            className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 transition-colors"
            title={t('型号对比')}
          >
            <BarChart3 className="w-5 h-5 text-[#444444]" />
            {compareCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
                {compareCount}
              </span>
            )}
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button className="lg:hidden text-gray-700" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t p-4 absolute w-full shadow-lg z-40">
          <nav className="flex flex-col space-y-4">
            {/* 智能体导购 - 移动端入口 */}
            <Link
              to="/guide"
              onClick={() => setMobileMenuOpen(false)}
              className="font-medium text-[#e60012] flex items-center"
            >
              <Bot className="w-4 h-4 mr-2" />
              {t('智能体导购')}
            </Link>
            {navLinks.map((link) => (
              <div key={link.name}>
                <Link
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`font-medium block ${isActive(link.href) ? "text-[#e60012]" : "text-gray-700 hover:text-[#e60012]"}`}
                >
                  {link.name}
                </Link>
                {link.hasDropdown && (
                  <div className="pl-4 mt-2 border-l-2 border-gray-100 space-y-2">
                    {aboutSubLinks.map((sub) => (
                      <Link
                        key={sub.name}
                        to={sub.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block text-sm text-gray-500 hover:text-[#e60012]"
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {/* 移动端 BOM/对比入口 */}
            <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
              <Link
                to="/bom"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center text-sm text-gray-700 hover:text-[#e60012]"
              >
                <ClipboardList className="w-4 h-4 mr-2" />
                {t('BOM 清单')}
                {bomCount > 0 && (
                  <span className="ml-1 bg-[#e60012] text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
                    {bomCount}
                  </span>
                )}
              </Link>
              <Link
                to="/compare"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center text-sm text-gray-700 hover:text-[#e60012]"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                {t('型号对比')}
                {compareCount > 0 && (
                  <span className="ml-1 bg-blue-600 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
                    {compareCount}
                  </span>
                )}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
