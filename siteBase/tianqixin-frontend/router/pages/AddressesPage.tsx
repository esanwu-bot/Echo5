import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { userApi, getAuthToken } from "../../lib/api-client"
import { Home, Plus, Edit2, Trash2, MapPin, ArrowLeft, Check } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog"
import { toast } from "sonner"

interface Address {
  id: number
  name: string
  phone: string
  province: string
  city: string
  district: string
  address: string
  is_default: boolean
}

export function AddressesPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentAddress, setCurrentAddress] = useState<Address | null>(null)
  const [isDefault, setIsDefault] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    province: '',
    city: '',
    district: '',
    address: ''
  })

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
          // 加载地址列表
          await loadAddresses()
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

  const loadAddresses = async () => {
    try {
      const response = await userApi.getAddresses()
      if (response.code === 200) {
        setAddresses(response.data || [])
      }
    } catch (error) {
      console.error('Failed to load addresses:', error)
      // 使用模拟数据作为备用
      setAddresses([
        {
          id: 1,
          name: '张三',
          phone: '13912345678',
          province: '北京',
          city: '北京市',
          district: '海淀区',
          address: '清河街道',
          is_default: true
        }
      ])
    }
  }

  const handleAddNew = () => {
    setCurrentAddress(null)
    setFormData({
      name: '',
      phone: '',
      province: '',
      city: '',
      district: '',
      address: ''
    })
    setIsDefault(false)
    setIsEditDialogOpen(true)
  }

  const handleEdit = (address: Address) => {
    setCurrentAddress(address)
    setFormData({
      name: address.name,
      phone: address.phone,
      province: address.province,
      city: address.city,
      district: address.district,
      address: address.address
    })
    setIsDefault(address.is_default)
    setIsEditDialogOpen(true)
  }

  const handleDelete = (address: Address) => {
    setCurrentAddress(address)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!currentAddress) return
    
    try {
      const response = await userApi.deleteAddress(currentAddress.id)
      if (response.code === 200) {
        toast.success(t('删除成功'))
        await loadAddresses()
      } else {
        toast.error(response.message || t('删除失败'))
      }
    } catch (error) {
      console.error('Failed to delete address:', error)
      toast.error(t('删除失败'))
    } finally {
      setIsDeleteDialogOpen(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone || !formData.address) {
      toast.error(t('请填写完整信息'))
      return
    }

    try {
      let response
      if (currentAddress) {
        // 更新地址
        response = await userApi.updateAddress(currentAddress.id, {
          ...formData,
          is_default: isDefault
        })
      } else {
        // 添加新地址
        response = await userApi.addAddress({
          ...formData,
          is_default: isDefault
        })
      }

      if (response.code === 200) {
        toast.success(currentAddress ? t('更新成功') : t('添加成功'))
        setIsEditDialogOpen(false)
        await loadAddresses()
      } else {
        toast.error(response.message || t('操作失败'))
      }
    } catch (error) {
      console.error('Failed to save address:', error)
      toast.error(t('操作失败'))
    }
  }

  const handleSetDefault = async (addressId: number) => {
    try {
      const response = await userApi.setDefaultAddress(addressId)
      if (response.code === 200) {
        toast.success(t('设置成功'))
        await loadAddresses()
      } else {
        toast.error(response.message || t('设置失败'))
      }
    } catch (error) {
      console.error('Failed to set default address:', error)
      toast.error(t('设置失败'))
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
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/member')}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">{t('收货地址管理')}</h1>
            </div>
            <Button
              onClick={handleAddNew}
              className="bg-[#e60012] hover:bg-[#cc0010] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('添加新地址')}
            </Button>
          </div>

          {/* Address List */}
          {addresses.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">{t('暂无收货地址')}</p>
              <Button
                onClick={handleAddNew}
                className="bg-[#e60012] hover:bg-[#cc0010] text-white"
              >
                {t('添加新地址')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className={`bg-white rounded-lg shadow p-6 border-2 transition-all ${
                    address.is_default ? 'border-[#e60012]' : 'border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <span className="font-semibold text-gray-900">{address.name}</span>
                        <span className="text-gray-600">{address.phone}</span>
                        {address.is_default && (
                          <span className="bg-[#e60012] text-white text-xs px-2 py-1 rounded">
                            {t('默认地址')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-gray-600 mb-4">
                        <Home className="w-4 h-4" />
                        <span>{address.province} {address.city} {address.district} {address.address}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        {!address.is_default && (
                          <button
                            onClick={() => handleSetDefault(address.id)}
                            className="text-sm text-gray-500 hover:text-[#e60012] transition-colors flex items-center gap-1"
                          >
                            <Check className="w-4 h-4" />
                            {t('设为默认')}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(address)}
                        className="p-2 text-gray-500 hover:text-[#e60012] hover:bg-gray-50 rounded transition-colors"
                        title={t('编辑')}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(address)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-50 rounded transition-colors"
                        title={t('删除')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit/Add Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md backdrop-blur-md bg-white/95">
          <DialogHeader>
            <DialogTitle>{currentAddress ? t('编辑地址') : t('添加新地址')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('收货人姓名')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('请输入收货人姓名')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t('手机号码')}</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder={t('请输入手机号码')}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label htmlFor="province">{t('省份')}</Label>
                <Input
                  id="province"
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  placeholder={t('省份')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">{t('城市')}</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder={t('城市')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="district">{t('区县')}</Label>
                <Input
                  id="district"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  placeholder={t('区县')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">{t('详细地址')}</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder={t('请输入详细地址')}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <Label htmlFor="isDefault" className="cursor-pointer">{t('设为默认地址')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t('取消')}
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-[#e60012] hover:bg-[#cc0010] text-white"
            >
              {t('保存')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-sm backdrop-blur-md bg-white/95">
          <DialogHeader>
            <DialogTitle>{t('确认删除')}</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600 py-4">
            {t('确定要删除该收货地址吗？此操作无法撤销。')}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              {t('取消')}
            </Button>
            <Button
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {t('删除')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
