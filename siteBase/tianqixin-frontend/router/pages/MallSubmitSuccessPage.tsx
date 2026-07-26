import { SuccessState } from "../../components/Mall/SuccessState"
import { useNavigate, useSearchParams } from "react-router-dom"

export function MallSubmitSuccessPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get("order_id") || undefined
  const amount = searchParams.get("amount") || undefined

  return (
    <div className="min-h-screen bg-white pt-20">
      <div className="container mx-auto px-4 py-8">
        <SuccessState type="submitted" onNavigate={navigate} orderId={orderId} amount={amount} />
      </div>
    </div>
  )
}