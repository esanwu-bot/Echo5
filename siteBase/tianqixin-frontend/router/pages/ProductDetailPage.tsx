import { useParams } from "react-router-dom"
import { ProductDetail } from "../../components/ProductDetail"
import { useNavigate } from "react-router-dom"

export function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white pt-20">
      <div className="container mx-auto px-4 py-8">
        <ProductDetail onNavigate={navigate} productId={id} />
      </div>
    </div>
  )
}