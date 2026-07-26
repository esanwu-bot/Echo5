import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bell, ChevronDown } from "lucide-react"

export function Header() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-red-500 rounded flex items-center justify-center">
            <span className="text-white text-sm font-bold">🍷</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">天启芯控制台</h1>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="text-blue-500">
            <Bell className="w-4 h-4 mr-1" />
            消息(5)
          </Button>

          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8">
              <AvatarFallback>走长</AvatarFallback>
            </Avatar>
            <span className="text-sm text-gray-700">走长</span>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </div>
        </div>
      </div>
    </header>
  )
}
