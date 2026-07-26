import Dashboard from "../dashboard"
import ProtectedRoute from "../components/ProtectedRoute"

export default function Page() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  )
}
