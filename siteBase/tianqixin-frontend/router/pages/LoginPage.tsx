import { Login } from "../../components/Login"
import { Seo } from "../../components/Seo"
import { useNavigate } from "react-router-dom"

export function LoginPage() {
  const navigate = useNavigate()

  // 确保导航到绝对路径，而不是相对路径
  const handleNavigate = (page: string) => {
    if (page === 'register') {
      navigate('/register');
    } else if (page === 'register-success') {
      navigate('/register/success');
    } else {
      navigate(`/${page}`);
    }
  };

  return (
    <div className="min-h-screen bg-white pt-20">
      <Seo title="登录" url="/login" noindex />
      <div className="container mx-auto px-4 py-8">
        <Login onNavigate={handleNavigate} />
      </div>
    </div>
  )
}