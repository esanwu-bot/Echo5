import { Payment } from "../../components/Mall/Payment"
import { useNavigate } from "react-router-dom"

export function PaymentPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white pt-20">
      <div className="container mx-auto px-4 py-8">
        <Payment onNavigate={navigate} />
      </div>
    </div>
  )
}