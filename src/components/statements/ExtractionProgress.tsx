import { Check, Circle, LoaderCircle } from 'lucide-react'

const steps = ['Statement uploaded', 'Reading PDF', 'Extracting transaction rows', 'Preparing review']

export function ExtractionProgress({ current }: { current: number }) {
  return <div className="progress-steps" aria-label="Statement extraction progress">{steps.map((step, index) => { const complete = index < current; const active = index === current; return <div className={`progress-step ${complete ? 'progress-step--complete' : ''} ${active ? 'progress-step--active' : ''}`} key={step}><span className="progress-step__marker">{complete ? <Check size={14} /> : active ? <LoaderCircle className="spin" size={14} /> : <Circle size={10} />}</span><span>{step}</span></div> })}</div>
}
