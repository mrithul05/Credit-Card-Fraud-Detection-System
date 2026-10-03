import { ArrowDown, ClipboardCheck, FileCheck2, FileUp, SearchCheck, ShieldCheck } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'

const journey = [
  { icon: FileUp, title: 'Upload your statement', text: 'Upload your credit-card statement as a PDF.' },
  { icon: FileCheck2, title: 'Extract transactions', text: 'Sentinel identifies transaction records from the statement.' },
  { icon: ClipboardCheck, title: 'Review transactions', text: 'Review the extracted transactions before analysis.' },
  { icon: SearchCheck, title: 'Analyze', text: 'The transactions are processed for potential fraud signals.' },
  { icon: ShieldCheck, title: 'Review results', text: 'Transactions requiring attention are highlighted for review.' },
]

const flow = ['Statement', 'Transaction Extraction', 'Transaction Review', 'Fraud Analysis', 'Results']

export function HowItWorksPage() {
  return <div className="page-container page-container--narrow"><PageHeader eyebrow="Guidance" title="How It Works" description="Upload a statement, review its transactions, and see which activity may need your attention." /><section className="panel journey-panel"><div className="panel__heading"><div><p className="eyebrow">Your statement review</p><h2>From statement to results</h2></div></div><section className="workflow-steps">{journey.map((step, index) => <div className="workflow-step" key={step.title}><div className="workflow-step__marker"><step.icon size={19} /></div><div className="workflow-step__body"><span>{String(index + 1).padStart(2, '0')}</span><h2>{step.title}</h2><p>{step.text}</p></div>{index < journey.length - 1 && <ArrowDown className="workflow-step__arrow" size={18} aria-hidden="true" />}</div>)}</section></section><section className="panel flow-summary"><p className="eyebrow">The process</p><h2>One clear path to review</h2><div className="flow-summary__items">{flow.map((step, index) => <span key={step}>{index + 1}. {step}</span>)}</div></section><section className="panel guide-note"><p className="eyebrow">Your review</p><h2>Signals are a starting point</h2><p>Potential fraud results are intended to help you decide which transactions deserve a closer look. Review each transaction in context.</p></section></div>
}
