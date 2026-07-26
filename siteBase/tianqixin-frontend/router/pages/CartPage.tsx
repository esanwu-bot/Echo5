import { Cart } from "../../components/Mall/Cart"
import { useNavigate } from "react-router-dom"

export function CartPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white pt-20">
      <div className="container mx-auto px-4 py-8">
        <Cart onNavigate={navigate} />
      </div>
    </div>
  )
}