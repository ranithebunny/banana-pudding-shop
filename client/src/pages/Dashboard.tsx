import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

interface DashboardData {
  todaysSales: number
  monthlyRevenue: number
  pendingPayments: number
  pendingOrders: number
}

function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const result = await apiFetch('/reports/dashboard')
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="p-8">Loading dashboard...</div>
  if (error) return <div className="p-8 text-red-600">{error}</div>
  if (!data) return null

  const cards = [
    { label: "Today's Sales", value: `₱${data.todaysSales}` },
    { label: 'Monthly Revenue', value: `₱${data.monthlyRevenue}` },
    { label: 'Pending Payments', value: data.pendingPayments },
    { label: 'Pending Orders', value: data.pendingOrders },
  ]

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="border rounded-lg p-4">
            <p className="text-sm text-gray-600">{card.label}</p>
            <p className="text-2xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Dashboard