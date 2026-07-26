import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, FileText, Package } from "lucide-react"

export function SalesRanking() {
  const topProducts = [
    { rank: 1, name: "TLV1872", views: 1250, inquiries: 45, growth: "+18%" },
    { rank: 2, name: "PCM1841-Q1", views: 1180, inquiries: 38, growth: "+12%" },
    { rank: 3, name: "TPS613885", views: 980, inquiries: 32, growth: "+25%" },
    { rank: 4, name: "TLV1872-Q1", views: 850, inquiries: 28, growth: "+8%" },
    { rank: 5, name: "PCM1841", views: 720, inquiries: 22, growth: "+15%" },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-blue-500" />
          本周热门产品TOP5
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-600 pb-2 border-b">
            <span>排名</span>
            <span>产品型号</span>
            <span>浏览量</span>
            <span>询盘数</span>
          </div>
          {topProducts.map((product) => (
            <div key={product.rank} className="grid grid-cols-4 gap-4 items-center py-2">
              <div className="flex items-center">
                <span
                  className={`w-6 h-6 rounded text-xs flex items-center justify-center font-medium ${
                    product.rank <= 3 ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {product.rank}
                </span>
              </div>
              <span className="text-sm font-medium">{product.name}</span>
              <span className="text-sm">{product.views}</span>
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium">{product.inquiries}</span>
                <span className={`text-xs ${product.growth.startsWith("+") ? "text-green-500" : "text-red-500"}`}>
                  {product.growth}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
