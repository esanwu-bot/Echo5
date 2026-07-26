import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Plus, Package, Users, FileText, Settings, Tags } from "lucide-react"

export function Sidebar() {
  const warnings = [
    { name: "茅台407", status: "红酒 | 库存仅剩6瓶", action: "补货" },
    { name: "科罗娜", status: "啤酒 | 3个月后过期 (90天后过期)", action: "补货" },
    { name: "山崎12年", status: "威士忌 | 库存仅剩2瓶", action: "补货" },
    { name: "马爹利蓝带", status: "干邑 | 6个月后过期 (180天后过期)", action: "补货" },
  ]

  const quickActions = [
    { icon: Plus, label: "新增商品" },
    { icon: Package, label: "库存盘点" },
    { icon: Users, label: "大客户" },
    { icon: FileText, label: "保修活动" },
    { icon: Settings, label: "导出报表" },
    { icon: Tags, label: "标签打印" },
  ]

  return (
    <div className="space-y-6">
      {/* 库存预警 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            库存预警
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {warnings.map((warning, index) => (
            <div key={index} className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span className="font-medium text-sm">{warning.name}</span>
                </div>
                <p className="text-xs text-gray-600">{warning.status}</p>
              </div>
              <Button size="sm" variant="outline" className="text-xs">
                {warning.action}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 快捷操作 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Settings className="w-4 h-4 text-blue-500" />
            快捷操作
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((action, index) => (
              <Button key={index} variant="outline" className="flex flex-col items-center gap-2 h-16 text-xs">
                <action.icon className="w-4 h-4" />
                {action.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 客户类型分布 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-blue-500" />
            客户类型分布
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-center">
              <div className="w-32 h-32 rounded-full border-8 border-red-500 flex items-center justify-center relative">
                <div className="w-16 h-16 bg-white rounded-full"></div>
                <div className="absolute top-0 right-8 w-4 h-4 bg-red-300 rounded-full"></div>
                <div className="absolute bottom-4 left-2 w-6 h-6 bg-red-400 rounded-full"></div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <Badge variant="outline" className="text-xs">
                企业采购
              </Badge>
              <Badge variant="outline" className="text-xs">
                婚庆定制
              </Badge>
              <Badge variant="outline" className="text-xs">
                个人收藏
              </Badge>
              <Badge variant="outline" className="text-xs">
                礼品定制
              </Badge>
              <Badge variant="outline" className="text-xs">
                其他
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
