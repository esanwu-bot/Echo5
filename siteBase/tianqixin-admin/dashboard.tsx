import { StatsCards } from "./components/stats-cards"
import { OrderTable } from "./components/order-table"

export default function Dashboard() {
  return (
    <div className="p-6 space-y-5">
      <StatsCards />
      <OrderTable />
    </div>
  )
}
