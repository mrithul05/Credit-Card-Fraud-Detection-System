import { useCallback, useEffect, useState } from 'react'
import { CircleCheck, CircleOff, LoaderCircle, TriangleAlert } from 'lucide-react'
import { fraudApi } from '../../services/fraudApi'

type Status = 'checking' | 'connected' | 'model-unavailable' | 'offline'

export function BackendStatus() {
  const [status, setStatus] = useState<Status>('checking')

  const checkHealth = useCallback(() => {
    setStatus('checking')
    fraudApi.health()
      .then((health) => setStatus(health.status === 'ok' && health.model_loaded !== false ? 'connected' : 'model-unavailable'))
      .catch(() => setStatus('offline'))
  }, [])

  useEffect(() => {
    checkHealth()
  }, [checkHealth])

  const content = {
    checking: { icon: LoaderCircle, label: 'Checking backend', detail: 'Connecting to FastAPI', className: 'backend-status--checking' },
    connected: { icon: CircleCheck, label: 'Backend connected', detail: 'Model loaded', className: 'backend-status--connected' },
    'model-unavailable': { icon: TriangleAlert, label: 'Model unavailable', detail: 'FastAPI is reachable', className: 'backend-status--warning' },
    offline: { icon: CircleOff, label: 'Backend offline', detail: 'Start FastAPI to run checks', className: 'backend-status--offline' },
  }[status]
  const Icon = content.icon

  return (
    <button className={`backend-status ${content.className}`} type="button" onClick={checkHealth} title="Check backend connection" aria-label={`${content.label}. ${content.detail}. Click to retry.`}>
      <Icon className={status === 'checking' ? 'spin' : undefined} size={15} aria-hidden="true" />
      <span><strong>{content.label}</strong><small>{content.detail}</small></span>
    </button>
  )
}
