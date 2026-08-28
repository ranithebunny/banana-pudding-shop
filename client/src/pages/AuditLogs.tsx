import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

interface LogEntry {
  id: string
  action: string
  entity: string
  entityId: string
  createdAt: string
  user: { name: string; email: string }
}

function AuditLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch('/audit-logs')
        setLogs(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load audit logs.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="h-8 w-40 bg-cream-deep rounded animate-pulse mb-6" />
        <div className="space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 bg-card border border-caramel-light/60 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="font-display text-lg text-espresso mb-1">Couldn't load the audit log.</p>
        <p className="text-sm text-espresso-soft">{error}</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display text-3xl font-semibold text-espresso mb-6">Audit Log</h1>

      {logs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-display text-xl text-espresso mb-1">No actions recorded yet</p>
          <p className="text-sm text-espresso-soft">Staff and owner activity will show up here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="bg-card border border-caramel-light/60 rounded-xl px-4 py-3 flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm text-espresso">
                  <span className="font-semibold">{log.user.name}</span>
                  <span className="text-espresso-soft"> — {log.action}</span>
                </p>
                <p className="text-xs text-espresso-soft/70 mt-0.5">{log.entity}</p>
              </div>
              <span className="text-xs text-espresso-soft/60 shrink-0 whitespace-nowrap">
                {new Date(log.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AuditLogs