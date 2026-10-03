import { FormEvent, useEffect, useState } from 'react'
import { ArrowRight, CheckCircle2, LockKeyhole, Mail, Shield } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { DEMO_EMAIL, DEMO_PASSWORD, isAuthenticated, signIn } from '../services/demoAuth'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState(DEMO_EMAIL)
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isAuthenticated()) navigate('/dashboard', { replace: true })
  }, [navigate])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!email.trim() || !password) {
      setError('Enter your email address and password to continue.')
      return
    }
    setIsSubmitting(true)
    window.setTimeout(() => {
      if (!signIn(email, password, remember)) {
        setError('Those sign-in details could not be verified. Check them and try again.')
        setIsSubmitting(false)
        return
      }
      navigate((location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/dashboard', { replace: true })
    }, 280)
  }

  return <main className="login-page">
    <section className="login-visual" aria-label="Sentinel product introduction">
      <div className="login-brand"><span className="brand__mark"><Shield size={22} /></span><strong>Sentinel</strong></div>
      <div className="login-visual__content"><span className="eyebrow">Credit Card Fraud Detection</span><h1>See the signals before they become surprises.</h1><p>Analyze credit-card statements, review extracted transactions, and identify activity that may require attention.</p><div className="login-promise"><CheckCircle2 size={18} /><span>Review your credit-card statements and identify activity that may need attention.</span></div></div>
      <p className="login-visual__footer">Sentinel · Credit Card Fraud Detection</p>
    </section>
    <section className="login-panel"><div className="login-form-wrap"><div className="login-mobile-brand"><span className="brand__mark"><Shield size={20} /></span><strong>Sentinel</strong></div><div className="login-heading"><span className="eyebrow">Welcome back</span><h2>Sign in to Sentinel</h2><p>Sign in to analyze credit-card statements and review transactions that may require attention.</p></div><form className="login-form" onSubmit={handleSubmit} noValidate><label className="field"><span>Email address</span><div className="input-with-prefix input-with-prefix--icon"><Mail size={16} aria-hidden="true" /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" aria-label="Email address" /></div></label><label className="field"><span>Password</span><div className="input-with-prefix input-with-prefix--icon"><LockKeyhole size={16} aria-hidden="true" /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" aria-label="Password" /></div></label><label className="login-remember"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /><span>Remember me</span></label>{error && <div className="form-alert" role="alert">{error}</div>}<button className="button button--primary login-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? <><span className="button-spinner" />Signing in…</> : <>Sign in to workspace <ArrowRight size={16} /></>}</button></form><p className="login-disclaimer"><LockKeyhole size={13} />Never enter your card number, CVV, PIN, or banking password here.</p></div><footer className="login-footer">Sentinel · Credit Card Fraud Detection</footer></section>
  </main>
}
