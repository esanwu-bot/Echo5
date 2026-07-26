import { useParams } from "react-router-dom"
import { NewsDetail } from "../../components/NewsDetail"
import { useNavigate } from "react-router-dom"

export function NewsDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white pt-20">
      <div className="container mx-auto px-4 py-8">
        <NewsDetail newsId={id} />
      </div>
    </div>
  )
}