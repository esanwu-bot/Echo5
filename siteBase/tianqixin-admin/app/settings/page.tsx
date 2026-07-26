"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { message, Upload } from "antd"
import { UploadOutlined } from "@ant-design/icons"
import Image from "next/image"
import { Settings, Globe, Search, Mail, Phone, Building, FileText, ShoppingCart, Package, Shield } from "lucide-react"
import { API_BASE_URL } from "../../lib/api/config"
import { authService } from "../../lib/api/auth"

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    basic: {
      site_name: '',
      site_logo: '',
      site_description: '',
      site_keywords: '',
      site_icp: '',
      site_copyright: ''
    },
    contact: {
      contact_phone: '',
      contact_email: '',
      contact_address: '',
      contact_qq: '',
      contact_wechat: '',
      service_time: ''
    },
    seo: {
      meta_title: '',
      meta_description: '',
      meta_keywords: '',
      og_image: '',
      google_analytics: '',
      baidu_analytics: '',
      baidu_verification: ''
    },
    third_party: {
      map_api_key: '',
      map_provider: 'baidu',
      google_site_verification: '',
      customer_service_code: ''
    },
    company: {
      company_name: '',
      company_short_name: '',
      company_english_name: '',
      company_address: '',
      company_phone: '',
      company_email: '',
      company_fax: '',
      company_postcode: '',
      company_website: '',
      business_license: '',
      tax_number: '',
      bank_account: '',
      bank_name: ''
    },
    order: {
      order_auto_cancel_minutes: 30,
      order_auto_confirm_days: 7,
      order_prefix: '',
      allow_guest_order: false,
      min_order_amount: 0
    },
    inventory: {
      low_stock_threshold: 10,
      out_of_stock_threshold: 0,
      stock_deduction_time: 'order',
      allow_oversell: false
    },
    upload: {
      upload_max_size: 10485760,
      upload_allowed_ext: '',
      upload_path: '',
      image_quality: 80,
      create_thumbnail: true,
      thumbnail_size: '300x300'
    }
  })

  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')

  // Helper function to get authentication headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Authorization': `Bearer ${token}`,
    };
  };

  // 获取设置
  const fetchSettings = async () => {
    setLoading(true)
    try {
      // 确保使用完整URL，避免代理问题
      const fullUrl = API_BASE_URL.startsWith('http') 
        ? `${API_BASE_URL}/admin/settings`
        : `/api/admin/settings`;
        
      const response = await fetch(fullUrl, {
        credentials: 'include',
        mode: 'cors',
        headers: {
          ...getAuthHeaders(),
        },
      })

      if (!response.ok) {
        throw new Error('获取设置失败')
      }

      const data = await response.json()
      if (data.code === 200) {
        setSettings(data.data)
      } else {
        message.error(data.message || '获取设置失败')
      }
    } catch (error: any) {
      message.error(error.message || '获取设置失败')
    } finally {
      setLoading(false)
    }
  }

  // 保存设置
  const saveSettings = async (section: string, sectionData: any) => {
    setLoading(true)
    try {
      // 确保使用完整URL，避免代理问题
      const fullUrl = API_BASE_URL.startsWith('http') 
        ? `${API_BASE_URL}/admin/settings/update-group/${section}`
        : `/api/admin/settings/update-group/${section}`;
        
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        mode: 'cors',
        body: JSON.stringify(sectionData),
      })

      if (!response.ok) {
        throw new Error('保存设置失败')
      }

      const data = await response.json()
      if (data.code === 200) {
        message.success('设置保存成功')
        fetchSettings() // 重新获取设置
      } else {
        message.error(data.message || '保存设置失败')
      }
    } catch (error: any) {
      message.error(error.message || '保存设置失败')
    } finally {
      setLoading(false)
    }
  }

  // 更新设置值
  const updateSetting = (section: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [key]: value
      }
    }))
  }

  // 保存特定分组的设置
  const handleSaveSection = (section: string) => {
    saveSettings(section, settings[section as keyof typeof settings])
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="w-6 h-6" />
        <h1 className="text-2xl font-bold">系统设置</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            基本信息
          </TabsTrigger>
          <TabsTrigger value="contact" className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            联系信息
          </TabsTrigger>
          <TabsTrigger value="seo" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            SEO配置
          </TabsTrigger>
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            公司信息
          </TabsTrigger>
          <TabsTrigger value="third_party" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            第三方服务
          </TabsTrigger>
          <TabsTrigger value="order" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            订单设置
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            库存设置
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            上传设置
          </TabsTrigger>
        </TabsList>

        {/* 基本信息 */}
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>基本信息设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="site_name">网站名称</Label>
                  <Input
                    id="site_name"
                    value={settings.basic.site_name}
                    onChange={(e) => updateSetting('basic', 'site_name', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="site_logo">网站Logo</Label>
                  <div className="space-y-2">
                    {/* Logo Preview */}
                    {settings.basic.site_logo && (
                      <div className="flex items-center space-x-2">
                        <Image
                          src={settings.basic.site_logo}
                          alt="网站Logo"
                          width={100}
                          height={100}
                          style={{ objectFit: 'contain' }}
                        />
                        <Button variant="destructive" size="sm" onClick={() => updateSetting('basic', 'site_logo', '')}>
                          移除
                        </Button>
                      </div>
                    )}
                    {/* Upload Component */}
                    <Upload
                      name="file"
                      action={API_BASE_URL.startsWith('http') 
                        ? `${API_BASE_URL}/admin/upload/image`
                        : "/api/admin/upload/image"}
                      accept="image/*"
                      listType="picture-card"
                      showUploadList={false}
                      headers={{
                        'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
                      }}
                      withCredentials={true}
                      onChange={(info) => {
                        if (info.file.status === 'done') {
                          const response = info.file.response;
                          if (response && response.code === 200 && response.data?.url) {
                            updateSetting('basic', 'site_logo', response.data.url);
                            message.success('Logo上传成功');
                          } else {
                            message.error('Logo上传失败: ' + (response?.message || '未知错误'));
                          }
                        } else if (info.file.status === 'error') {
                          message.error('Logo上传失败');
                        }
                      }}
                    >
                      <div className="flex flex-col items-center justify-center p-4 border border-dashed border-gray-300 rounded-md">
                        <UploadOutlined className="text-2xl text-gray-400 mb-2" />
                        <span className="text-gray-500 text-sm">点击上传Logo</span>
                        <span className="text-gray-400 text-xs mt-1">支持JPG、PNG、GIF等格式</span>
                      </div>
                    </Upload>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="site_description">网站描述</Label>
                <Textarea
                  id="site_description"
                  value={settings.basic.site_description}
                  onChange={(e) => updateSetting('basic', 'site_description', e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="site_keywords">网站关键词</Label>
                <Input
                  id="site_keywords"
                  value={settings.basic.site_keywords}
                  onChange={(e) => updateSetting('basic', 'site_keywords', e.target.value)}
                  placeholder="用逗号分隔多个关键词"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="site_icp">ICP备案号</Label>
                  <Input
                    id="site_icp"
                    value={settings.basic.site_icp}
                    onChange={(e) => updateSetting('basic', 'site_icp', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="site_copyright">版权信息</Label>
                  <Input
                    id="site_copyright"
                    value={settings.basic.site_copyright}
                    onChange={(e) => updateSetting('basic', 'site_copyright', e.target.value)}
                  />
                </div>
              </div>

              <Button onClick={() => handleSaveSection('basic')} disabled={loading}>
                {loading ? '保存中...' : '保存设置'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 联系信息 */}
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle>联系信息设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="contact_phone">联系电话</Label>
                  <Input
                    id="contact_phone"
                    value={settings.contact.contact_phone}
                    onChange={(e) => updateSetting('contact', 'contact_phone', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="contact_email">联系邮箱</Label>
                  <Input
                    id="contact_email"
                    value={settings.contact.contact_email}
                    onChange={(e) => updateSetting('contact', 'contact_email', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="contact_address">联系地址</Label>
                <Input
                  id="contact_address"
                  value={settings.contact.contact_address}
                  onChange={(e) => updateSetting('contact', 'contact_address', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="contact_qq">QQ号</Label>
                  <Input
                    id="contact_qq"
                    value={settings.contact.contact_qq}
                    onChange={(e) => updateSetting('contact', 'contact_qq', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="contact_wechat">微信号</Label>
                  <Input
                    id="contact_wechat"
                    value={settings.contact.contact_wechat}
                    onChange={(e) => updateSetting('contact', 'contact_wechat', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="service_time">服务时间</Label>
                  <Input
                    id="service_time"
                    value={settings.contact.service_time}
                    onChange={(e) => updateSetting('contact', 'service_time', e.target.value)}
                    placeholder="如：9:00-18:00"
                  />
                </div>
              </div>

              <Button onClick={() => handleSaveSection('contact')} disabled={loading}>
                {loading ? '保存中...' : '保存设置'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO配置 */}
        <TabsContent value="seo">
          <Card>
            <CardHeader>
              <CardTitle>SEO配置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="meta_title">页面标题</Label>
                <Input
                  id="meta_title"
                  value={settings.seo.meta_title}
                  onChange={(e) => updateSetting('seo', 'meta_title', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="meta_description">页面描述</Label>
                <Textarea
                  id="meta_description"
                  value={settings.seo.meta_description}
                  onChange={(e) => updateSetting('seo', 'meta_description', e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="meta_keywords">关键词</Label>
                <Input
                  id="meta_keywords"
                  value={settings.seo.meta_keywords}
                  onChange={(e) => updateSetting('seo', 'meta_keywords', e.target.value)}
                  placeholder="用逗号分隔多个关键词"
                />
              </div>

              <div>
                <Label htmlFor="og_image">社交分享图片</Label>
                <div className="space-y-2">
                  {/* Social Share Image Preview */}
                  {settings.seo.og_image && (
                    <div className="flex items-center space-x-2">
                      <Image
                        src={settings.seo.og_image}
                        alt="社交分享图片"
                        width={150}
                        height={150}
                        style={{ objectFit: 'contain' }}
                      />
                      <Button variant="destructive" size="sm" onClick={() => updateSetting('seo', 'og_image', '')}>
                        移除
                      </Button>
                    </div>
                  )}
                  {/* Upload Component */}
                  <Upload
                    name="file"
                    action={API_BASE_URL.startsWith('http') 
                      ? `${API_BASE_URL}/admin/upload/image`
                      : "/api/admin/upload/image"}
                    accept="image/*"
                    listType="picture-card"
                    showUploadList={false}
                    headers={{
                      'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
                    }}
                    withCredentials={true}
                    onChange={(info) => {
                      if (info.file.status === 'done') {
                        const response = info.file.response;
                        if (response && response.code === 200 && response.data?.url) {
                          updateSetting('seo', 'og_image', response.data.url);
                          message.success('社交分享图片上传成功');
                        } else {
                          message.error('社交分享图片上传失败: ' + (response?.message || '未知错误'));
                        }
                      } else if (info.file.status === 'error') {
                        message.error('社交分享图片上传失败');
                      }
                    }}
                  >
                    <div className="flex flex-col items-center justify-center p-4 border border-dashed border-gray-300 rounded-md">
                      <UploadOutlined className="text-2xl text-gray-400 mb-2" />
                      <span className="text-gray-500 text-sm">点击上传社交分享图片</span>
                      <span className="text-gray-400 text-xs mt-1">建议尺寸: 1200x630px</span>
                    </div>
                  </Upload>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="google_analytics">Google Analytics代码</Label>
                  <Textarea
                    id="google_analytics"
                    value={settings.seo.google_analytics}
                    onChange={(e) => updateSetting('seo', 'google_analytics', e.target.value)}
                    rows={3}
                    placeholder="粘贴完整的GA代码"
                  />
                </div>
                <div>
                  <Label htmlFor="baidu_analytics">百度统计代码</Label>
                  <Textarea
                    id="baidu_analytics"
                    value={settings.seo.baidu_analytics}
                    onChange={(e) => updateSetting('seo', 'baidu_analytics', e.target.value)}
                    rows={3}
                    placeholder="粘贴完整的百度统计代码"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="baidu_verification">百度站长验证代码</Label>
                <Textarea
                  id="baidu_verification"
                  value={settings.seo.baidu_verification}
                  onChange={(e) => updateSetting('seo', 'baidu_verification', e.target.value)}
                  rows={2}
                  placeholder="粘贴完整的百度站长验证代码"
                />
              </div>

              <Button onClick={() => handleSaveSection('seo')} disabled={loading}>
                {loading ? '保存中...' : '保存设置'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 公司信息 */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>公司信息设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="company_name">公司全称</Label>
                  <Input
                    id="company_name"
                    value={settings.company.company_name}
                    onChange={(e) => updateSetting('company', 'company_name', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="company_short_name">公司简称</Label>
                  <Input
                    id="company_short_name"
                    value={settings.company.company_short_name}
                    onChange={(e) => updateSetting('company', 'company_short_name', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="company_english_name">公司英文名称</Label>
                  <Input
                    id="company_english_name"
                    value={settings.company.company_english_name}
                    onChange={(e) => updateSetting('company', 'company_english_name', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="company_address">公司地址</Label>
                <Input
                  id="company_address"
                  value={settings.company.company_address}
                  onChange={(e) => updateSetting('company', 'company_address', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="company_phone">公司电话</Label>
                  <Input
                    id="company_phone"
                    value={settings.company.company_phone}
                    onChange={(e) => updateSetting('company', 'company_phone', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="company_fax">公司传真</Label>
                  <Input
                    id="company_fax"
                    value={settings.company.company_fax}
                    onChange={(e) => updateSetting('company', 'company_fax', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="company_email">公司邮箱</Label>
                  <Input
                    id="company_email"
                    value={settings.company.company_email}
                    onChange={(e) => updateSetting('company', 'company_email', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="company_postcode">邮政编码</Label>
                  <Input
                    id="company_postcode"
                    value={settings.company.company_postcode}
                    onChange={(e) => updateSetting('company', 'company_postcode', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="company_website">公司网站</Label>
                  <Input
                    id="company_website"
                    value={settings.company.company_website}
                    onChange={(e) => updateSetting('company', 'company_website', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="business_license">营业执照号</Label>
                  <Input
                    id="business_license"
                    value={settings.company.business_license}
                    onChange={(e) => updateSetting('company', 'business_license', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="tax_number">税号</Label>
                  <Input
                    id="tax_number"
                    value={settings.company.tax_number}
                    onChange={(e) => updateSetting('company', 'tax_number', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="bank_name">开户银行</Label>
                  <Input
                    id="bank_name"
                    value={settings.company.bank_name}
                    onChange={(e) => updateSetting('company', 'bank_name', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bank_account">银行账号</Label>
                <Input
                  id="bank_account"
                  value={settings.company.bank_account}
                  onChange={(e) => updateSetting('company', 'bank_account', e.target.value)}
                />
              </div>

              <Button onClick={() => handleSaveSection('company')} disabled={loading}>
                {loading ? '保存中...' : '保存设置'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 第三方服务 */}
        <TabsContent value="third_party">
          <Card>
            <CardHeader>
              <CardTitle>第三方服务设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="map_provider">地图服务商</Label>
                  <Select value={settings.third_party.map_provider} onValueChange={(value) => updateSetting('third_party', 'map_provider', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择地图服务商" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baidu">百度地图</SelectItem>
                      <SelectItem value="amap">高德地图</SelectItem>
                      <SelectItem value="google">Google地图</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="map_api_key">地图API Key</Label>
                  <Input
                    id="map_api_key"
                    value={settings.third_party.map_api_key}
                    onChange={(e) => updateSetting('third_party', 'map_api_key', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="google_site_verification">Google站点验证</Label>
                <Textarea
                  id="google_site_verification"
                  value={settings.third_party.google_site_verification}
                  onChange={(e) => updateSetting('third_party', 'google_site_verification', e.target.value)}
                  rows={2}
                  placeholder="粘贴Google Search Console验证代码"
                />
              </div>

              <div>
                <Label htmlFor="customer_service_code">客服代码</Label>
                <Textarea
                  id="customer_service_code"
                  value={settings.third_party.customer_service_code}
                  onChange={(e) => updateSetting('third_party', 'customer_service_code', e.target.value)}
                  rows={4}
                  placeholder="粘贴第三方客服代码"
                />
              </div>

              <Button onClick={() => handleSaveSection('third_party')} disabled={loading}>
                {loading ? '保存中...' : '保存设置'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 订单设置 */}
        <TabsContent value="order">
          <Card>
            <CardHeader>
              <CardTitle>订单设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="order_prefix">订单前缀</Label>
                  <Input
                    id="order_prefix"
                    value={settings.order.order_prefix}
                    onChange={(e) => updateSetting('order', 'order_prefix', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="min_order_amount">最小订单金额</Label>
                  <Input
                    id="min_order_amount"
                    type="number"
                    value={settings.order.min_order_amount}
                    onChange={(e) => updateSetting('order', 'min_order_amount', parseFloat(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="order_auto_cancel_minutes">订单自动取消时间(分钟)</Label>
                  <Input
                    id="order_auto_cancel_minutes"
                    type="number"
                    value={settings.order.order_auto_cancel_minutes}
                    onChange={(e) => updateSetting('order', 'order_auto_cancel_minutes', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="order_auto_confirm_days">订单自动确认天数</Label>
                  <Input
                    id="order_auto_confirm_days"
                    type="number"
                    value={settings.order.order_auto_confirm_days}
                    onChange={(e) => updateSetting('order', 'order_auto_confirm_days', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="allow_guest_order">允许游客下单</Label>
                <Switch
                  id="allow_guest_order"
                  checked={settings.order.allow_guest_order}
                  onCheckedChange={(checked) => updateSetting('order', 'allow_guest_order', checked)}
                />
              </div>

              <Button onClick={() => handleSaveSection('order')} disabled={loading}>
                {loading ? '保存中...' : '保存设置'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 库存设置 */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>库存设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="low_stock_threshold">低库存预警阈值</Label>
                  <Input
                    id="low_stock_threshold"
                    type="number"
                    value={settings.inventory.low_stock_threshold}
                    onChange={(e) => updateSetting('inventory', 'low_stock_threshold', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="out_of_stock_threshold">缺货阈值</Label>
                  <Input
                    id="out_of_stock_threshold"
                    type="number"
                    value={settings.inventory.out_of_stock_threshold}
                    onChange={(e) => updateSetting('inventory', 'out_of_stock_threshold', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="stock_deduction_time">库存扣减时间</Label>
                  <Select value={settings.inventory.stock_deduction_time} onValueChange={(value) => updateSetting('inventory', 'stock_deduction_time', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="order">下单时</SelectItem>
                      <SelectItem value="payment">付款时</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="allow_oversell">允许超卖</Label>
                  <Switch
                    id="allow_oversell"
                    checked={settings.inventory.allow_oversell}
                    onCheckedChange={(checked) => updateSetting('inventory', 'allow_oversell', checked)}
                  />
                </div>
              </div>

              <Button onClick={() => handleSaveSection('inventory')} disabled={loading}>
                {loading ? '保存中...' : '保存设置'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 上传设置 */}
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>上传设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="upload_path">文件上传路径</Label>
                  <Input
                    id="upload_path"
                    value={settings.upload.upload_path}
                    onChange={(e) => updateSetting('upload', 'upload_path', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="upload_max_size">上传文件最大大小(字节)</Label>
                  <Input
                    id="upload_max_size"
                    type="number"
                    value={settings.upload.upload_max_size}
                    onChange={(e) => updateSetting('upload', 'upload_max_size', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="upload_allowed_ext">允许上传的文件扩展名</Label>
                <Input
                  id="upload_allowed_ext"
                  value={settings.upload.upload_allowed_ext}
                  onChange={(e) => updateSetting('upload', 'upload_allowed_ext', e.target.value)}
                  placeholder="用逗号分隔多个扩展名，如：jpg,jpeg,png,gif"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="image_quality">图片质量</Label>
                  <Input
                    id="image_quality"
                    type="number"
                    value={settings.upload.image_quality}
                    onChange={(e) => updateSetting('upload', 'image_quality', parseInt(e.target.value))}
                    min="1"
                    max="100"
                  />
                </div>
                <div>
                  <Label htmlFor="thumbnail_size">缩略图尺寸</Label>
                  <Input
                    id="thumbnail_size"
                    value={settings.upload.thumbnail_size}
                    onChange={(e) => updateSetting('upload', 'thumbnail_size', e.target.value)}
                    placeholder="如：300x300"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="create_thumbnail">创建缩略图</Label>
                <Switch
                  id="create_thumbnail"
                  checked={settings.upload.create_thumbnail}
                  onCheckedChange={(checked) => updateSetting('upload', 'create_thumbnail', checked)}
                />
              </div>

              <Button onClick={() => handleSaveSection('upload')} disabled={loading}>
                {loading ? '保存中...' : '保存设置'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}