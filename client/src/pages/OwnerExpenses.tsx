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
  const [successMessage, setSuccessMessage] = useState('')

  const [category, setCategory] = useState('GROCERIES')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')

  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [editCategory, setEditCategory] = useState('GROCERIES')
  const [editDescription, setEditDescription] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editError, setEditError] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null)

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

  function startEdit(expense: Expense) {
    setEditingExpense(expense)
    setEditCategory(expense.category)
    setEditDescription(expense.description || '')
    setEditAmount(expense.amount)
    setEditDate(expense.date.slice(0, 10))
    setEditError('')
  }

  function cancelEdit() {
    setEditingExpense(null)
  }

  async function saveEdit() {
    if (!editingExpense) return
    setEditError('')

    if (!editAmount || !editDate) {
      setEditError('Amount and date are required.')
      return
    }

    setSavingEdit(true)
    try {
      await apiFetch(`/expenses/${editingExpense.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          category: editCategory,
          description: editDescription,
          amount: Number(editAmount),
          date: editDate,
        }),
      })
      setEditingExpense(null)
      await loadExpenses()
      setSuccessMessage('Expense updated successfully.')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update expense.')
    } finally {
      setSavingEdit(false)
    }
  }

 const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

async function confirmDelete() {
  if (!deletingExpense) return
  try {
    const token = localStorage.getItem('token')
    const response = await fetch(`${API_URL}/expenses/${deletingExpense.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to delete expense.')
    }
    setDeletingExpense(null)
    loadExpenses()
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to delete expense.')
    setDeletingExpense(null)
  }
}

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-amber-900">Expenses</h1>

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 mb-4 text-sm text-green-800">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-amber-200 rounded-lg p-4 mb-6 space-y-3">
        <h2 className="font-semibold text-amber-900">Record an Expense</h2>

        <div className="flex gap-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border border-amber-300 rounded px-3 py-2 text-sm bg-white"
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
            className="border border-amber-300 rounded px-3 py-2 text-sm w-28"
          />

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-amber-300 rounded px-3 py-2 text-sm"
          />
        </div>

        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="w-full border border-amber-300 rounded px-3 py-2 text-sm"
        />

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white rounded px-4 py-2 text-sm font-medium transition-colors">
          Add Expense
        </button>
      </form>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <p className="font-semibold mb-3 text-amber-900">Total: ₱{total}</p>
          <div className="space-y-2">
            {expenses.map((expense) => (
              <div key={expense.id} className="bg-white border border-amber-200 rounded-lg px-4 py-3 text-sm">
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium text-amber-900">{expense.category} ₱{expense.amount}</p>
                    {expense.description && <p className="text-gray-600">{expense.description}</p>}
                    <p className="text-xs text-gray-500">
                      {new Date(expense.date).toLocaleDateString()} — by {expense.createdBy.name}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 mt-2">
                  <button onClick={() => startEdit(expense)} className="text-amber-600 font-medium">
                    Edit
                  </button>
                  <button onClick={() => setDeletingExpense(expense)} className="text-red-600 font-medium">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {editingExpense && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h2 className="font-semibold text-amber-900 mb-4">Edit Expense</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-amber-900">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full border border-amber-300 rounded px-3 py-2 text-sm bg-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-amber-900">Amount</label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full border border-amber-300 rounded px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-amber-900">Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full border border-amber-300 rounded px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-amber-900">Description</label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full border border-amber-300 rounded px-3 py-2 text-sm"
                />
              </div>

              {editError && <p className="text-red-600 text-sm">{editError}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={cancelEdit}
                  className="flex-1 border border-amber-300 text-amber-900 rounded py-2 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={savingEdit}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded py-2 text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deletingExpense && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <p className="font-medium text-amber-900 mb-1">Delete this expense?</p>
            <p className="text-sm text-gray-600 mb-1">
              ₱{deletingExpense.amount} — {deletingExpense.description || deletingExpense.category}
            </p>
            <p className="text-xs text-gray-500 mb-4">This action cannot be undone.</p>

            <div className="flex gap-2">
              <button
                onClick={() => setDeletingExpense(null)}
                className="flex-1 border border-amber-300 text-amber-900 rounded py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded py-2 text-sm font-medium transition-colors"
              >
                Delete Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OwnerExpenses