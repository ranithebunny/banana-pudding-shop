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

  if (loading) return <div className="p-8">Loading audit logs...</div>
  if (error) return <div className="p-8 text-red-600">{error}</div>

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Audit Log</h1>

      {logs.length === 0 && <p className="text-gray-600">No actions recorded yet.</p>}

      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="border-b pb-2 text-sm">
            <p>
              <span className="font-medium">{log.user.name}</span> — {log.action}
            </p>
            <p className="text-xs text-gray-500">
              {log.entity} · {new Date(log.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AuditLogs