import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

interface Expense {
  id: string
  category: string
  description: string | null
  amount: string
  date: string
  createdBy: { name: string }
}

const CATEGORIES = ['GROCERIES', 'PACKAGING', 'DELIVERY', 'MARKETING', 'EQUIPMENT', 'OTHER']

function OwnerExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [category, setCategory] = useState('GROCERIES')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')

  async function loadExpenses() {
    setLoading(true)
    try {
      const data = await apiFetch('/expenses')
      setExpenses(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load expenses.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExpenses()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!amount || !date) {
      setError('Amount and date are required.')
      return
    }

    try {
      await apiFetch('/expenses', {
        method: 'POST',
        body: JSON.stringify({ category, description, amount: Number(amount), date }),
      })
      setDescription('')
      setAmount('')
      setDate('')
      loadExpenses()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record expense.')
    }
  }

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Expenses</h1>

      <form onSubmit={handleSubmit} className="border rounded-lg p-4 mb-6 space-y-3">
        <h2 className="font-semibold">Record an Expense</h2>

        <div className="flex gap-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="border rounded px-3 py-2 text-sm w-28"
          />

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          />
        </div>

        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="w-full border rounded px-3 py-2 text-sm"
        />

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium">
          Add Expense
        </button>
      </form>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <p className="font-semibold mb-3">Total: ₱{total}</p>
          <div className="space-y-2">
            {expenses.map((expense) => (
              <div key={expense.id} className="border rounded px-4 py-2 flex justify-between text-sm">
                <div>
                  <p className="font-medium">{expense.category}</p>
                  {expense.description && <p className="text-gray-600">{expense.description}</p>}
                  <p className="text-xs text-gray-500">
                    {new Date(expense.date).toLocaleDateString()} — by {expense.createdBy.name}
                  </p>
                </div>
                <p className="font-medium">₱{expense.amount}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default OwnerExpenses