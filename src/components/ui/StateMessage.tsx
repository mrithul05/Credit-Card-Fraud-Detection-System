import { AlertCircle, Inbox, LoaderCircle } from 'lucide-react'

type StateMessageProps = {
  type: 'loading' | 'error' | 'empty'
  title: string
  description?: string
  action?: React.ReactNode
}

export function StateMessage({ type, title, description, action }: StateMessageProps) {
  const Icon = type === 'loading' ? LoaderCircle : type === 'error' ? AlertCircle : Inbox
  return (
    <div className={`state-message state-message--${type}`} role={type === 'error' ? 'alert' : undefined}>
      <Icon className={type === 'loading' ? 'spin' : undefined} size={22} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        {description && <p>{description}</p>}
        {action && <div className="state-message__action">{action}</div>}
      </div>
    </div>
  )
}
