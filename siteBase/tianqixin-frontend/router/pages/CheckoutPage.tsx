import { Checkout } from "../../components/Mall/Checkout"
import { useNavigate } from "react-router-dom"

export function CheckoutPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white pt-20">
      <div className="container mx-auto px-4 py-8">
        <Checkout onNavigate={navigate} />
      </div>
    </div>
  )
}