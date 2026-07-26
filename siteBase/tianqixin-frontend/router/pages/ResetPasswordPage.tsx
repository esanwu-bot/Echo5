import { ResetPassword } from "../../components/ResetPassword"
import { useNavigate } from "react-router-dom"

export function ResetPasswordPage() {
    const navigate = useNavigate()

    const handleNavigate = (page: string) => {
        if (page === 'login') {
            navigate('/login');
        } else {
            navigate(`/${page}`);
        }
    };

    return (
        <div className="min-h-screen bg-white pt-20">
            <div className="container mx-auto px-4 py-8">
                <ResetPassword onNavigate={handleNavigate} />
            </div>
        </div>
    )
}
