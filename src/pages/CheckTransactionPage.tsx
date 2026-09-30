import { FormEvent, useState } from 'react'
import { AlertCircle, CheckCircle2, Clock3, Send } from 'lucide-react'
import type { StoredTransaction, TransactionInput } from '../domain/types'
import { validateTransactionInput, type ValidationErrors } from '../domain/validation'
import { ApiError, BackendUnavailableError } from '../services/apiClient'
import { fraudApi } from '../services/fraudApi'
import { createStoredTransaction, savePrediction } from '../services/transactionHistory'
import { PageHeader } from '../components/ui/PageHeader'
import { StatusBadge } from '../components/ui/StatusBadge'
import { formatCurrency, formatDate, formatProbability, formatTime } from '../components/transactions/transactionFormatters'

function localDateTimeValue() {
  const date = new Date()
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

const initialForm: TransactionInput = {
  amount: 0,
  merchant_category: '',
  location: '',
  device_type: '',
  user_age: 18,
  account_age_days: 0,
  is_foreign_transaction: false,
  timestamp: localDateTimeValue(),
}

const merchantCategories = ['Grocery', 'Dining', 'Electronics', 'Travel', 'Pharmacy', 'Transport', 'Online Services', 'Entertainment', 'Jewelry', 'Other']
const deviceTypes = ['Mobile', 'Web', 'Tablet']

export function CheckTransactionPage() {
  const [form, setForm] = useState<TransactionInput>(initialForm)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [result, setResult] = useState<StoredTransaction>()
  const [submitError, setSubmitError] = useState<string>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField<K extends keyof TransactionInput>(field: K, value: TransactionInput[K]) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setSubmitError(undefined)
    setResult(undefined)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const nextErrors = validateTransactionInput(form)
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      setSubmitError('Please correct the highlighted fields before checking the transaction.')
      return
    }

    const input: TransactionInput = {
      ...form,
      merchant_category: form.merchant_category.trim(),
      location: form.location.trim(),
      device_type: form.device_type.trim(),
      timestamp: form.timestamp.trim(),
    }

    setIsSubmitting(true)
    setSubmitError(undefined)
    setResult(undefined)
    try {
      const response = await fraudApi.predict(input)
      const transaction = createStoredTransaction(input, response)
      savePrediction(transaction)
      setResult(transaction)
    } catch (error) {
      setSubmitError(getPredictionError(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return <div className="page-container page-container--narrow">
    <PageHeader eyebrow="Prediction workflow" title="Check a transaction" description="Provide the eight fields available at transaction time. FastAPI applies the saved model pipeline and returns the real prediction." />
    <div className="workflow-layout">
      <form className="panel transaction-form" onSubmit={handleSubmit} noValidate>
        <div className="panel__heading"><div><p className="eyebrow">New transaction</p><h2>Transaction details</h2></div><span className="required-note">* Required</span></div>
        <div className="form-grid">
          <Field label="Transaction amount" name="amount" error={errors.amount} required hint="Use the transaction currency in USD."><div className="input-with-prefix"><span>$</span><input id="amount" name="amount" type="number" min="0.01" step="0.01" value={form.amount || ''} onChange={(event) => updateField('amount', Number(event.target.value))} aria-invalid={Boolean(errors.amount)} /></div></Field>
          <Field label="Merchant category" name="merchant_category" error={errors.merchant_category} required><select id="merchant_category" value={form.merchant_category} onChange={(event) => updateField('merchant_category', event.target.value)} aria-invalid={Boolean(errors.merchant_category)}><option value="">Select category</option>{merchantCategories.map((category) => <option key={category}>{category}</option>)}</select></Field>
          <Field label="Location" name="location" error={errors.location} required hint="City and state or country."><input id="location" value={form.location} onChange={(event) => updateField('location', event.target.value)} placeholder="e.g. Boston, MA" aria-invalid={Boolean(errors.location)} /></Field>
          <Field label="Transaction date and time" name="timestamp" error={errors.timestamp} required><div className="input-with-prefix input-with-prefix--icon"><Clock3 size={16} aria-hidden="true" /><input id="timestamp" type="datetime-local" value={form.timestamp} onChange={(event) => updateField('timestamp', event.target.value)} aria-invalid={Boolean(errors.timestamp)} /></div></Field>
          <Field label="Device type" name="device_type" error={errors.device_type} required><select id="device_type" value={form.device_type} onChange={(event) => updateField('device_type', event.target.value)} aria-invalid={Boolean(errors.device_type)}><option value="">Select device</option>{deviceTypes.map((device) => <option key={device}>{device}</option>)}</select></Field>
          <Field label="User age" name="user_age" error={errors.user_age} required><input id="user_age" type="number" min="18" max="120" step="1" value={form.user_age} onChange={(event) => updateField('user_age', Number(event.target.value))} aria-invalid={Boolean(errors.user_age)} /></Field>
          <Field label="Account age" name="account_age_days" error={errors.account_age_days} required hint="Number of days since account creation."><div className="input-with-suffix"><input id="account_age_days" type="number" min="0" max="18250" step="1" value={form.account_age_days} onChange={(event) => updateField('account_age_days', Number(event.target.value))} aria-invalid={Boolean(errors.account_age_days)} /><span>days</span></div></Field>
          <div className="checkbox-field"><input id="is_foreign_transaction" type="checkbox" checked={form.is_foreign_transaction} onChange={(event) => updateField('is_foreign_transaction', event.target.checked)} /><label htmlFor="is_foreign_transaction"><strong>Foreign transaction</strong><span>Mark if the transaction is outside the account holder’s usual country.</span></label>{errors.is_foreign_transaction && <span className="field-error">{errors.is_foreign_transaction}</span>}</div>
        </div>
        {submitError && <div className="form-alert" role="alert"><AlertCircle size={18} /><span>{submitError}</span></div>}
        <div className="form-actions"><span className="form-footnote">No card number, CVV, PIN, or password is needed.</span><button className="button button--primary" type="submit" disabled={isSubmitting}>{isSubmitting ? <><span className="button-spinner" />Analyzing transaction…</> : <><Send size={16} />Check transaction</>}</button></div>
      </form>
      <PredictionResult result={result} />
    </div>
  </div>
}

function getPredictionError(error: unknown) {
  if (error instanceof BackendUnavailableError) return error.message
  if (error instanceof ApiError && error.status === 503) return 'The fraud detection model is unavailable. Start the backend with its saved model loaded.'
  if (error instanceof ApiError && error.status === 422) return error.message || 'The backend rejected the transaction fields. Please review the form.'
  if (error instanceof Error) return error.message
  return 'The transaction could not be checked.'
}

function Field({ label, name, error, required, hint, children }: { label: string; name: string; error?: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return <div className="field"><label htmlFor={name}>{label}{required && <span className="required"> *</span>}</label>{children}{hint && <span className="field-hint">{hint}</span>}{error && <span className="field-error">{error}</span>}</div>
}

function PredictionResult({ result }: { result?: StoredTransaction }) {
  if (!result) return <aside className="panel result-panel result-panel--empty"><div className="result-placeholder"><div className="result-placeholder__icon"><CheckCircle2 size={22} /></div><h2>Transaction result</h2><p>Submit the form to see a response from the saved Random Forest model.</p><span className="result-note"><AlertCircle size={14} />The model provides a signal, not proof of fraud.</span></div></aside>

  const isFraud = result.is_fraud === 1
  return <aside className={`panel result-panel ${isFraud ? 'result-panel--warning' : 'result-panel--positive'}`}>
    <div className="result-panel__top"><p className="eyebrow">Transaction result</p><StatusBadge prediction={isFraud ? 'potential_fraud' : 'genuine'} /></div>
    <h2>{isFraud ? 'Potential Fraud' : 'Genuine'}</h2>
    <p className="result-description">{isFraud ? 'The model signal crossed the decision threshold and may need review.' : 'The model classified this transaction as genuine at the selected threshold.'}</p>
    <div className="result-metrics"><div><span>Fraud probability</span><strong>{formatProbability(result.fraud_probability)}</strong></div><div><span>Decision threshold</span><strong>{formatProbability(result.threshold)}</strong></div></div>
    <div className="result-details"><span>Checked transaction</span><p>{formatCurrency(result.amount)} · {result.merchant_category}</p><p>{result.location} · {formatDate(result.timestamp)} at {formatTime(result.timestamp)}</p></div>
    <span className="result-note"><AlertCircle size={14} />A prediction is not confirmation of fraud.</span>
  </aside>
}
