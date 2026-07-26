import { useParams } from "react-router-dom"
import { MallProductDetail } from "../../components/Mall/mallProductDetail"

export function MallProductDetailPage() {
    const { id } = useParams()

    return (
        <div className="min-h-screen bg-white pt-20">
            <MallProductDetail productId={id} />
        </div>
    )
}
