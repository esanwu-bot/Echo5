import { PaymentSuccess } from "../../components/Mall/PaymentSuccess"
import { useNavigate } from "react-router-dom"

export function PaymentSuccessPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white pt-20">
      <div className="container mx-auto px-4 py-8">
        <PaymentSuccess onNavigate={navigate} />
      </div>
    </div>
  )
}