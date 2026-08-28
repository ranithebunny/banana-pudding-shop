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

const inputClass =
  'border border-caramel-light rounded-xl px-3 py-2 text-sm bg-cream text-espresso focus:outline-none focus:ring-2 focus:ring-caramel/40'

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
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display text-3xl font-semibold text-espresso mb-6">Expenses</h1>

      {successMessage && (
        <div className="bg-leaf-light border border-leaf/30 rounded-xl px-4 py-2.5 mb-4 text-sm text-leaf font-semibold">
          ✓ {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-card border border-caramel-light/60 rounded-2xl p-5 mb-6 space-y-3 shadow-sm">
        <h2 className="font-display font-semibold text-lg text-espresso">Record an Expense</h2>

        <div className="flex flex-wrap gap-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClass}
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
            className={`${inputClass} w-28`}
          />

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </div>

        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className={`${inputClass} w-full`}
        />

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          className="bg-caramel hover:bg-caramel-dark text-white rounded-full px-5 py-2 text-sm font-semibold shadow-sm hover:shadow-md transition-all"
        >
          Add Expense
        </button>
      </form>

      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-card border border-caramel-light/60 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="bg-cream-deep rounded-2xl px-5 py-4 mb-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-espresso-soft">Total</span>
            <span className="font-display text-2xl font-bold text-espresso">₱{total}</span>
          </div>

          <div className="space-y-2.5">
            {expenses.map((expense) => (
              <div key={expense.id} className="bg-card border border-caramel-light/60 rounded-2xl px-4 py-3.5 shadow-sm">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-semibold bg-caramel-light text-caramel-dark px-2 py-0.5 rounded-full">
                        {expense.category}
                      </span>
                      <span className="font-display font-bold text-espresso">₱{expense.amount}</span>
                    </div>
                    {expense.description && <p className="text-sm text-espresso-soft">{expense.description}</p>}
                    <p className="text-xs text-espresso-soft/70 mt-0.5">
                      {new Date(expense.date).toLocaleDateString()} — by {expense.createdBy.name}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 mt-2.5">
                  <button
                    onClick={() => startEdit(expense)}
                    className="text-sm font-semibold text-caramel-dark hover:text-caramel"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeletingExpense(expense)}
                    className="text-sm font-semibold text-espresso-soft/70 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {editingExpense && (
        <div className="fixed inset-0 bg-espresso/40 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-3xl p-6 max-w-sm w-full shadow-xl">
            <h2 className="font-display font-semibold text-lg text-espresso mb-4">Edit Expense</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-espresso">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className={`${inputClass} w-full`}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5 text-espresso">Amount</label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className={`${inputClass} w-full`}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5 text-espresso">Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className={`${inputClass} w-full`}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5 text-espresso">Description</label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className={`${inputClass} w-full`}
                />
              </div>

              {editError && <p className="text-red-600 text-sm">{editError}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={cancelEdit}
                  className="flex-1 border border-caramel-light text-espresso rounded-full py-2.5 text-sm font-semibold hover:bg-cream-deep transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={savingEdit}
                  className="flex-1 bg-caramel hover:bg-caramel-dark text-white rounded-full py-2.5 text-sm font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deletingExpense && (
        <div className="fixed inset-0 bg-espresso/40 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-3xl p-6 max-w-sm w-full shadow-xl">
            <p className="font-display font-semibold text-lg text-espresso mb-1">Delete this expense?</p>
            <p className="text-sm text-espresso-soft mb-1">
              ₱{deletingExpense.amount} — {deletingExpense.description || deletingExpense.category}
            </p>
            <p className="text-xs text-espresso-soft/70 mb-4">This action cannot be undone.</p>

            <div className="flex gap-2">
              <button
                onClick={() => setDeletingExpense(null)}
                className="flex-1 border border-caramel-light text-espresso rounded-full py-2.5 text-sm font-semibold hover:bg-cream-deep transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-full py-2.5 text-sm font-semibold transition-colors"
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