import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

interface DashboardData {
  todaysSales: number
  monthlyRevenue: number
  pendingPayments: number
  pendingOrders: number
}

const CARD_STYLES = [
  { icon: '🍮', accent: 'bg-caramel-light text-caramel-dark' },
  { icon: '📈', accent: 'bg-leaf-light text-leaf' },
  { icon: '⏳', accent: 'bg-banana-light text-espresso' },
  { icon: '📦', accent: 'bg-caramel-light text-caramel-dark' },
]

function CardSkeleton() {
  return (
    <div className="bg-card border border-caramel-light/60 rounded-2xl p-5 animate-pulse">
      <div className="w-9 h-9 rounded-xl bg-cream-deep mb-3" />
      <div className="h-3 w-24 bg-cream-deep rounded mb-2" />
      <div className="h-7 w-20 bg-cream-deep rounded" />
    </div>
  )
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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="h-8 w-40 bg-cream-deep rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="font-display text-lg text-espresso mb-1">Couldn't load the dashboard.</p>
        <p className="text-sm text-espresso-soft">{error}</p>
      </div>
    )
  }

  if (!data) return null

  const cards = [
    { label: "Today's Sales", value: `₱${data.todaysSales}` },
    { label: 'Monthly Revenue', value: `₱${data.monthlyRevenue}` },
    { label: 'Pending Payments', value: data.pendingPayments },
    { label: 'Pending Orders', value: data.pendingOrders },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display text-3xl font-semibold text-espresso mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((card, i) => {
          const style = CARD_STYLES[i % CARD_STYLES.length]
          return (
            <div
              key={card.label}
              className="bg-card border border-caramel-light/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base mb-3 ${style.accent}`}>
                {style.icon}
              </div>
              <p className="text-sm text-espresso-soft font-medium">{card.label}</p>
              <p className="font-display text-2xl font-bold text-espresso mt-0.5">{card.value}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Dashboard