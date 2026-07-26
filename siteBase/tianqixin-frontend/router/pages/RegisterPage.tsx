import { Register } from "../../components/Register"
import { Seo } from "../../components/Seo"
import { useNavigate } from "react-router-dom"

export function RegisterPage() {
  const navigate = useNavigate()

  // 确保导航到绝对路径，而不是相对路径
  const handleNavigate = (page: string) => {
    if (page === 'register-success') {
      navigate('/register/success');
    } else if (page === 'login') {
      navigate('/login');
    } else {
      navigate(`/${page}`);
    }
  };

  return (
    <div className="min-h-screen bg-white pt-20">
      <Seo title="注册" url="/register" noindex />
      <div className="container mx-auto px-4 py-8">
        <Register onNavigate={handleNavigate} />
      </div>
    </div>
  )
}