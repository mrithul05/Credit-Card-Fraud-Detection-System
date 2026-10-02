import { Check, Circle, LoaderCircle } from 'lucide-react'

const steps = ['Reading transaction data', 'Validating transaction fields', 'Running fraud detection model', 'Calculating risk signals', 'Preparing results']

export function AnalysisProgress({ completed, total }: { completed: number; total: number }) {
  const stage = total ? Math.min(steps.length - 1, Math.floor((completed / total) * steps.length)) : 0
  return <div className="analysis-progress"><div className="analysis-progress__header"><div><p className="eyebrow">Live analysis</p><h2>Analyzing transactions</h2></div><strong>{completed}/{total}</strong></div><div className="progress-track"><span style={{ width: `${total ? (completed / total) * 100 : 0}%` }} /></div><div className="progress-steps">{steps.map((step, index) => <div className={`progress-step ${index < stage ? 'progress-step--complete' : ''} ${index === stage ? 'progress-step--active' : ''}`} key={step}><span className="progress-step__marker">{index < stage ? <Check size={14} /> : index === stage ? <LoaderCircle className="spin" size={14} /> : <Circle size={10} />}</span><span>{step}</span></div>)}</div></div>
}
