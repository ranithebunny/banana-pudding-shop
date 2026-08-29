import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

interface StaffUser {
  id: string
  email: string
  name: string
  phone: string | null
  role: string
  createdAt: string
}

const inputClass =
  'w-full border border-caramel-light rounded-xl px-3 py-2 text-sm bg-cream text-espresso focus:outline-none focus:ring-2 focus:ring-caramel/40'

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let pwd = ''
  for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)]
  return pwd
}

function ManageStaff() {
  const [staff, setStaff] = useState<StaffUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [creating, setCreating] = useState(false)

  const [newCredentials, setNewCredentials] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const [resettingId, setResettingId] = useState<string | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetting, setResetting] = useState(false)

  async function loadStaff() {
    setLoading(true)
    try {
      const data = await apiFetch('/auth/staff')
      setStaff(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load staff accounts.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStaff()
  }, [])

  function resetForm() {
    setName('')
    setEmail('')
    setPhone('')
    setPassword('')
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name || !email || !password) {
      setError('Name, email, and password are required.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setCreating(true)
    try {
      await apiFetch('/auth/staff', {
        method: 'POST',
        body: JSON.stringify({ name, email, phone: phone || undefined, password }),
      })
      setNewCredentials({ email, password })
      setCopied(false)
      resetForm()
      setShowForm(false)
      loadStaff()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create staff account.')
    } finally {
      setCreating(false)
    }
  }

  async function handleRevoke(user: StaffUser) {
    if (!confirm(`Revoke staff access for ${user.name}? They'll no longer be able to access staff pages.`)) return
    try {
      await apiFetch(`/auth/staff/${user.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: 'CUSTOMER' }),
      })
      loadStaff()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke access.')
    }
  }

  function startReset(user: StaffUser) {
    setResettingId(user.id)
    setResetPassword(generatePassword())
    setError('')
  }

  function cancelReset() {
    setResettingId(null)
    setResetPassword('')
  }

  async function confirmReset(user: StaffUser) {
    if (resetPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setResetting(true)
    try {
      await apiFetch(`/auth/staff/${user.id}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ password: resetPassword }),
      })
      setNewCredentials({ email: user.email, password: resetPassword })
      setCopied(false)
      setResettingId(null)
      setResetPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password.')
    } finally {
      setResetting(false)
    }
  }

  async function copyCredentials() {
    if (!newCredentials) return
    try {
      await navigator.clipboard.writeText(`Email: ${newCredentials.email}\nPassword: ${newCredentials.password}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard access denied — credentials are still visible on screen to copy manually
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="h-8 w-40 bg-cream-deep rounded animate-pulse mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-card border border-caramel-light/60 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl font-semibold text-espresso">Manage Staff</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-caramel hover:bg-caramel-dark text-white rounded-full px-4 py-2 text-sm font-semibold shadow-sm hover:shadow-md transition-all"
          >
            Add Staff
          </button>
        )}
      </div>

      {newCredentials && (
        <div className="bg-leaf-light border border-leaf/30 rounded-2xl p-5 mb-6">
          <p className="font-semibold text-leaf mb-2">✓ Password ready to share</p>
          <p className="text-sm text-espresso-soft mb-3">
            Send these credentials to them directly — this is the only time the password is shown.
          </p>
          <div className="bg-card rounded-xl p-3 text-sm font-mono text-espresso mb-3 space-y-0.5">
            <p>Email: {newCredentials.email}</p>
            <p>Password: {newCredentials.password}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={copyCredentials}
              className="text-sm font-semibold text-caramel-dark hover:text-caramel"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={() => setNewCredentials(null)}
              className="text-sm font-semibold text-espresso-soft/70 hover:text-espresso"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800 mb-4">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-card border border-caramel-light/60 rounded-2xl p-5 mb-6 space-y-3 shadow-sm">
          <h2 className="font-display font-semibold text-lg text-espresso mb-1">New Staff Account</h2>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className={inputClass}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className={inputClass}
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone (optional)"
            className={inputClass}
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Temporary password"
              className={`${inputClass} flex-1`}
            />
            <button
              type="button"
              onClick={() => setPassword(generatePassword())}
              className="text-sm font-semibold text-caramel-dark hover:text-caramel border border-caramel-light rounded-xl px-3 whitespace-nowrap"
            >
              Generate
            </button>
          </div>
          <p className="text-xs text-espresso-soft">At least 8 characters. You'll be shown these credentials once after creating the account.</p>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={creating}
              className="bg-caramel hover:bg-caramel-dark text-white rounded-full px-5 py-2 text-sm font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Staff Account'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                resetForm()
              }}
              className="text-sm text-espresso-soft hover:text-espresso font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {staff.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">👥</p>
          <p className="font-display text-xl text-espresso mb-1">No staff accounts yet</p>
          <p className="text-sm text-espresso-soft">Add your first staff member to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {staff.map((member) => {
            const isResetting = resettingId === member.id
            return (
              <div key={member.id} className="bg-card border border-caramel-light/60 rounded-2xl px-4 py-3.5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="font-display font-semibold text-espresso">{member.name}</p>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          member.role === 'OWNER' ? 'bg-leaf text-white' : 'bg-caramel-light text-caramel-dark'
                        }`}
                      >
                        {member.role === 'OWNER' ? 'Owner' : 'Staff'}
                      </span>
                    </div>
                    <p className="text-sm text-espresso-soft">{member.email}</p>
                    {member.phone && <p className="text-xs text-espresso-soft/70">{member.phone}</p>}
                    <p className="text-xs text-espresso-soft/60 mt-0.5">
                      Added {new Date(member.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {member.role === 'STAFF' && (
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <button
                        onClick={() => (isResetting ? cancelReset() : startReset(member))}
                        className="text-xs font-semibold text-caramel-dark hover:text-caramel underline underline-offset-2"
                      >
                        {isResetting ? 'Cancel' : 'Reset Password'}
                      </button>
                      <button
                        onClick={() => handleRevoke(member)}
                        className="text-xs font-semibold text-espresso-soft/70 hover:text-red-600 underline underline-offset-2"
                      >
                        Revoke Access
                      </button>
                    </div>
                  )}
                </div>

                {isResetting && (
                  <div className="mt-3 pt-3 border-t border-caramel-light/60 flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      placeholder="New password"
                      className={`${inputClass} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => setResetPassword(generatePassword())}
                      className="text-sm font-semibold text-caramel-dark hover:text-caramel border border-caramel-light rounded-xl px-3 whitespace-nowrap"
                    >
                      Generate
                    </button>
                    <button
                      onClick={() => confirmReset(member)}
                      disabled={resetting}
                      className="bg-caramel hover:bg-caramel-dark text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      {resetting ? 'Saving...' : 'Confirm'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ManageStaff