import React, { useEffect, useState } from 'react'
import { Alert, LoadingState, EmptyState, StatusBadge } from '../../components/ui'
import { useToast } from '../../components/Toast'
import {
  fetchSubscriptions,
  issueKeys,
  updateSubscriptionStatus,
} from '../../services/api'
import type { Subscription } from '../../types'
import { CreditCard } from 'lucide-react'

const Subscriptions: React.FC = () => {
  const { push } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<Subscription[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [issuedKeys, setIssuedKeys] = useState<string[] | null>(null)

  useEffect(() => {
    void load()
  }, [])

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      setRows(await fetchSubscriptions())
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to load subscriptions'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const onIssueKeys = async (ownerId: string) => {
    const raw = window.prompt('How many activation keys to issue?', '1')
    if (!raw) return
    const count = Number(raw)
    if (!count || count < 1) return
    setBusyId(ownerId)
    try {
      const data = await issueKeys(ownerId, count)
      setIssuedKeys(data.keys)
      push(`Issued ${data.keys.length} key(s)`)
      await load()
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Could not issue keys'
      push(message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  const onStatus = async (id: string, status: string) => {
    setBusyId(id)
    try {
      await updateSubscriptionStatus(id, status)
      push(`Subscription set to ${status}`)
      await load()
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Update failed'
      push(message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <LoadingState label="Loading subscriptions…" />

  return (
    <div className="stack-gap">
      {error && <Alert variant="error" message={error} actionLabel="Retry" onAction={load} />}

      <div className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Subscriptions & seats</h2>
        </div>
        <div className="panel__body" style={{ padding: 0 }}>
          {rows.length === 0 ? (
            <EmptyState
              icon={<CreditCard size={24} />}
              title="No subscriptions"
              description="Approved site owners will appear here with their seat allocations."
            />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Owner</th>
                    <th>Plan</th>
                    <th>Seats</th>
                    <th>Keys</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.ownerName}</strong>
                        <div className="muted">{s.companyName}</div>
                        <div className="muted">{s.ownerEmail}</div>
                      </td>
                      <td>{s.planName}</td>
                      <td>{s.seats}</td>
                      <td>
                        {s.keysUsed ?? 0}/{s.keysIssued ?? 0} used
                      </td>
                      <td>
                        <StatusBadge status={s.status} />
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={busyId === s.ownerId || busyId === s.id}
                            onClick={() => void onIssueKeys(s.ownerId)}
                          >
                            Issue keys
                          </button>
                          {s.status === 'ACTIVE' ? (
                            <button
                              type="button"
                              className="btn btn-danger"
                              disabled={busyId === s.id}
                              onClick={() => void onStatus(s.id, 'SUSPENDED')}
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-primary"
                              disabled={busyId === s.id}
                              onClick={() => void onStatus(s.id, 'ACTIVE')}
                            >
                              Activate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {issuedKeys && (
        <div className="modal-backdrop" role="presentation" onClick={() => setIssuedKeys(null)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal__title">Keys issued</h3>
            <p className="modal__desc">New activation keys for this site owner:</p>
            {issuedKeys.map((k) => (
              <div key={k} className="copy-row key-mono" style={{ marginBottom: '0.4rem' }}>
                {k}
              </div>
            ))}
            <div className="modal__actions">
              <button type="button" className="btn btn-primary" onClick={() => setIssuedKeys(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Subscriptions
