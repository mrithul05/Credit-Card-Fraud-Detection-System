import { ArrowDown, CheckCircle2, Database, Gauge, Save, Send, SlidersHorizontal, UserRound } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'

const steps = [
  { icon: UserRound, title: 'Enter transaction details', text: 'The user provides the eight fields available at transaction time: amount, merchant category, location, device, age, account age, foreign status, and timestamp.' },
  { icon: CheckCircle2, title: 'Validate the form', text: 'React checks required values, numeric ranges, and timestamp validity before making a request.' },
  { icon: Send, title: 'Send the exact API payload', text: 'React sends only those eight fields to the FastAPI POST /predict endpoint. It does not recreate ML preprocessing.' },
  { icon: SlidersHorizontal, title: 'Preprocess in FastAPI', text: 'The saved pipeline parses the timestamp and derives its deterministic calendar features on the backend.' },
  { icon: Database, title: 'Run the saved Random Forest', text: 'FastAPI loads the persisted trained pipeline and obtains a fraud probability for the transaction.' },
  { icon: Gauge, title: 'Apply the decision threshold', text: 'The saved threshold of 0.65 is applied to the probability to produce Genuine or Potential Fraud.' },
  { icon: Save, title: 'Display and save the result', text: 'React displays the returned flag, probability, and threshold, then stores successful predictions in browser-local history.' },
]

export function HowItWorksPage() {
  return <div className="page-container page-container--narrow"><PageHeader eyebrow="Project guide" title="How it works" description="Follow a real transaction from the Sentinel form through FastAPI and the saved machine learning pipeline." /><section className="workflow-steps">{steps.map((step, index) => <div className="workflow-step" key={step.title}><div className="workflow-step__marker"><step.icon size={19} /></div><div className="workflow-step__body"><span>Step {String(index + 1).padStart(2, '0')}</span><h2>{step.title}</h2><p>{step.text}</p></div>{index < steps.length - 1 && <ArrowDown className="workflow-step__arrow" size={18} aria-hidden="true" />}</div>)}</section><section className="panel guide-note"><p className="eyebrow">Responsible use</p><h2>Potential Fraud is a probabilistic review signal</h2><p>Machine learning performs classification from patterns in the selected dataset; it does not establish intent or confirm a crime. This is an academic prototype. Real banking systems require much larger and continuously updated datasets, strong security, monitoring, human review, and regulatory controls. Sentinel’s local history is a browser convenience, not a bank transaction database.</p></section><section className="panel flow-summary"><p className="eyebrow">End-to-end flow</p><h2>React → FastAPI → saved model → React</h2><div className="flow-summary__items"><span>1. Form</span><span>2. POST /predict</span><span>3. Preprocessing</span><span>4. Random Forest</span><span>5. Probability + threshold</span><span>6. Result + local history</span></div></section></div>
}
