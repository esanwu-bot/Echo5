import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Seo } from "../../components/Seo"
import { userApi, getAuthToken, authApi } from "../../lib/api-client"
import { User, Package, LogOut, Settings, MapPin, ShoppingBag } from "lucide-react"

export function MemberPage() {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadUserInfo = async () => {
            const token = getAuthToken()
            if (!token) {
                navigate('/login')
                return
            }

            try {
                const response = await userApi.getProfile()
                if (response.code === 200) {
                    setUser(response.data)
                } else {
                    navigate('/login')
                }
            } catch (error) {
                console.error('Failed to load user info:', error)
                navigate('/login')
            } finally {
                setLoading(false)
            }
        }

        loadUserInfo()
    }, [navigate])

    const handleLogout = async () => {
        try {
            await authApi.logout()
            navigate('/')
        } catch (error) {
            console.error('Logout failed:', error)
            // Still navigate to home even if logout API fails
            navigate('/')
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 pt-20">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex justify-center items-center h-64">
                        <div className="text-gray-600">{t('加载中...')}</div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-20">
            <Seo title="会员中心" url="/member" noindex />
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('会员中心')}</h1>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* User Info Card */}
                        <div className="md:col-span-1">
                            <div className="bg-white rounded-lg shadow p-6">
                                <div className="flex items-center space-x-4 mb-6">
                                    <div className="w-16 h-16 bg-[#e60012] rounded-full flex items-center justify-center">
                                        <User className="w-8 h-8 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-gray-900">
                                            {user?.nickname || user?.username || t('用户')}
                                        </h2>
                                        <p className="text-sm text-gray-500">{user?.email || user?.phone || ''}</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => navigate('/member/sample-application')}
                                        className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                                    >
                                        <Package className="w-5 h-5 text-gray-600" />
                                        <span className="text-gray-700">{t('样品申请')}</span>
                                    </button>
                                    <button
                                        onClick={() => navigate('/member/addresses')}
                                        className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                                    >
                                        <MapPin className="w-5 h-5 text-gray-600" />
                                        <span className="text-gray-700">{t('收货地址')}</span>
                                    </button>
                                    <button 
                                        onClick={() => navigate('/member/orders')}
                                        className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                                    >
                                        <ShoppingBag className="w-5 h-5 text-gray-600" />
                                        <span className="text-gray-700">{t('我的订单')}</span>
                                    </button>
                                    <button className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
                                        <Settings className="w-5 h-5 text-gray-600" />
                                        <span className="text-gray-700">{t('账户设置')}</span>
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors text-red-600"
                                    >
                                        <LogOut className="w-5 h-5" />
                                        <span>{t('退出登录')}</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="md:col-span-2">
                            <div className="bg-white rounded-lg shadow p-6 mb-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                    <Package className="w-5 h-5 mr-2 text-[#e60012]" />
                                    {t('我的订单')}
                                </h3>
                                <div className="text-center py-12 text-gray-500">
                                    {t('暂无订单记录')}
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('账户信息')}</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between py-2 border-b">
                                        <span className="text-gray-600">{t('用户名')}</span>
                                        <span className="text-gray-900">{user?.username || '-'}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b">
                                        <span className="text-gray-600">{t('昵称')}</span>
                                        <span className="text-gray-900">{user?.nickname || '-'}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b">
                                        <span className="text-gray-600">{t('邮箱')}</span>
                                        <span className="text-gray-900">{user?.email || '-'}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b">
                                        <span className="text-gray-600">{t('手机号')}</span>
                                        <span className="text-gray-900">{user?.phone || '-'}</span>
                                    </div>
                                    <div className="flex justify-between py-2">
                                        <span className="text-gray-600">{t('注册时间')}</span>
                                        <span className="text-gray-900">
                                            {user?.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : '-'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
