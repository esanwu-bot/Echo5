import { SuccessState } from "../../components/Mall/SuccessState"
import { useNavigate } from "react-router-dom"

export function MallAddedSuccessPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white pt-20">
      <div className="container mx-auto px-4 py-8">
        <SuccessState type="added" onNavigate={navigate} />
      </div>
    </div>
  )
}