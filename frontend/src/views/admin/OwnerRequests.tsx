import React, { useEffect, useState } from 'react'
import { Alert, LoadingState, EmptyState, StatusBadge } from '../../components/ui'
import { useToast } from '../../components/Toast'
import {
  fetchOwnerRequests,
  approveRequest,
  rejectRequest,
} from '../../services/api'
import type { OwnerRequest } from '../../types'
import { Inbox } from 'lucide-react'

const OwnerRequests: React.FC = () => {
  const { push } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requests, setRequests] = useState<OwnerRequest[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [resultModal, setResultModal] = useState<{
    password: string
    keys: string[]
  } | null>(null)

  useEffect(() => {
    void load()
  }, [])

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      setRequests(await fetchOwnerRequests())
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to load requests'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const onApprove = async (id: string) => {
    setBusyId(id)
    try {
      const data = await approveRequest(id, 3)
      push(data.message)
      setResultModal({ password: data.temporaryPassword, keys: data.activationKeys })
      await load()
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Approve failed'
      push(message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  const onReject = async (id: string) => {
    const reason = window.prompt('Rejection reason (optional):') ?? undefined
    setBusyId(id)
    try {
      await rejectRequest(id, reason)
      push('Request rejected')
      await load()
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Reject failed'
      push(message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <LoadingState label="Loading requests…" />

  return (
    <div className="stack-gap">
      {error && <Alert variant="error" message={error} actionLabel="Retry" onAction={load} />}

      <div className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Site owner requests</h2>
        </div>
        <div className="panel__body" style={{ padding: 0 }}>
          {requests.length === 0 ? (
            <EmptyState
              icon={<Inbox size={24} />}
              title="No requests yet"
              description="When companies request access, they will appear here for approval."
            />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Applicant</th>
                    <th>Company</th>
                    <th>Contact</th>
                    <th>Message</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.fullName}</strong>
                        <div className="muted">{new Date(r.createdAt).toLocaleString()}</div>
                      </td>
                      <td>{r.companyName}</td>
                      <td>
                        {r.email}
                        <div className="muted">{r.phone}</div>
                      </td>
                      <td>{r.message || '—'}</td>
                      <td>
                        <StatusBadge status={r.status} />
                      </td>
                      <td>
                        {r.status === 'PENDING' ? (
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="btn btn-primary"
                              disabled={busyId === r.id}
                              onClick={() => void onApprove(r.id)}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger"
                              disabled={busyId === r.id}
                              onClick={() => void onReject(r.id)}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {resultModal && (
        <div className="modal-backdrop" role="presentation" onClick={() => setResultModal(null)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="modal__title">Owner approved</h3>
            <p className="modal__desc">
              Share these credentials with the site owner. They can sign in and assign keys to Field
              Engineers.
            </p>
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label>Temporary password</label>
              <div className="copy-row key-mono">{resultModal.password}</div>
            </div>
            <div className="form-group">
              <label>Activation keys issued</label>
              {resultModal.keys.map((k) => (
                <div key={k} className="copy-row key-mono" style={{ marginBottom: '0.4rem' }}>
                  {k}
                </div>
              ))}
            </div>
            <div className="modal__actions">
              <button type="button" className="btn btn-primary" onClick={() => setResultModal(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OwnerRequests
