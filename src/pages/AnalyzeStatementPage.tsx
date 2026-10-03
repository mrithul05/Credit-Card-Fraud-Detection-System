import { useMemo, useState } from 'react'
import { ArrowRight, FileCheck2, Filter, LockKeyhole, RotateCcw, Search, ShieldCheck, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { AnalysisWorkflow, ExtractedTransaction } from '../domain/types'
import { cloneDemoTransactions } from '../data/demoTransactions'
import { ExtractionProgress } from '../components/statements/ExtractionProgress'
import { ExtractedTransactionTable } from '../components/statements/ExtractedTransactionTable'
import { StatementUploader } from '../components/statements/StatementUploader'
import { AnalysisProgress } from '../components/statements/AnalysisProgress'
import { PageHeader } from '../components/ui/PageHeader'
import { StateMessage } from '../components/ui/StateMessage'
import { analyzeStatementTransactions } from '../services/statementAnalysis'
import { extractStatement, getStatementLabel } from '../services/pdfExtractor'
import { saveStatementAnalysis } from '../services/statementHistory'

export function AnalyzeStatementPage() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File>()
  const [rows, setRows] = useState<ExtractedTransaction[]>([])
  const [workflow, setWorkflow] = useState<AnalysisWorkflow>('upload')
  const [extractStep, setExtractStep] = useState(0)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')

  const categories = useMemo(() => ['all', ...new Set(rows.map((row) => row.merchant_category))], [rows])
  const visibleRows = useMemo(() => rows.filter((row) => {
    const term = search.trim().toLowerCase()
    const matchesSearch = !term || [row.description, row.merchant_category, row.location].some((value) => value.toLowerCase().includes(term))
    return matchesSearch && (category === 'all' || row.merchant_category === category)
  }), [rows, search, category])
  const selectedRows = rows.filter((row) => row.selected)
  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((row) => row.selected)

  async function handleFile(candidate: File) {
    setFile(candidate)
    setRows([])
    setError('')
    setNote('')
    setWorkflow('extracting')
    setExtractStep(0)
    try {
      await pause(250); setExtractStep(1)
      await pause(350); setExtractStep(2)
      const result = await extractStatement(candidate)
      await pause(350); setExtractStep(3)
      setRows(result.transactions)
      setNote(result.note || '')
      setWorkflow('review')
    } catch (extractionError) {
      setError(extractionError instanceof Error ? extractionError.message : 'The statement could not be processed.')
      setWorkflow('error')
    }
  }

  function removeFile() {
    setFile(undefined); setRows([]); setNote(''); setError(''); setWorkflow('upload'); setSearch(''); setCategory('all')
  }

  function toggleRow(id: string) {
    setRows((current) => current.map((row) => row.extraction_id === id ? { ...row, selected: !row.selected } : row))
  }

  function toggleAll() {
    const next = !allVisibleSelected
    const ids = new Set(visibleRows.map((row) => row.extraction_id))
    setRows((current) => current.map((row) => ids.has(row.extraction_id) ? { ...row, selected: next } : row))
  }

  async function analyzeSelected() {
    if (!selectedRows.length || !file) return
    setWorkflow('analyzing')
    setAnalysisProgress(0)
    try {
      const analysis = await analyzeStatementTransactions(getStatementLabel(file), selectedRows, (completed) => setAnalysisProgress(completed))
      saveStatementAnalysis(analysis)
      navigate(`/analysis-results?analysis=${analysis.analysis_id}`)
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : 'The statement analysis failed.')
      setWorkflow('error')
    }
  }

  function loadDemoRows() {
    setFile(new File(['Sentinel demo statement'], 'September_Statement.pdf', { type: 'application/pdf' }))
    setRows(cloneDemoTransactions())
    setNote('Sample transactions are ready for you to review.')
    setWorkflow('review')
    setError('')
  }

  return <div className="page-container"><PageHeader eyebrow="Workspace / statement analysis" title="Analyze your credit card statement" description="Upload a PDF statement, review the extracted transactions, and identify activity that may require attention." />
    {workflow === 'upload' && <div className="statement-intro-grid"><section className="panel upload-panel"><div className="panel__heading"><div><p className="eyebrow">Step 01 · Upload</p><h2>Start with a statement PDF</h2></div><span className="secure-chip"><LockKeyhole size={13} /> Secure upload</span></div><StatementUploader file={file} onFile={handleFile} onRemove={removeFile} /><div className="privacy-card"><ShieldCheck size={20} /><div><strong>Your financial information is sensitive</strong><p>For your security, do not include your card number, CVV, PIN, or banking password in uploaded documents.</p></div></div><button className="demo-link" type="button" onClick={loadDemoRows}><Sparkles size={15} />Try sample transactions</button></section><aside className="panel workflow-preview"><p className="eyebrow">What happens next</p><h2>From statement to review queue</h2><div className="mini-flow"><span>01</span><div><strong>Extract transactions</strong><p>We identify transaction records in your statement.</p></div><span>02</span><div><strong>Review every row</strong><p>Filter and choose what to analyze.</p></div><span>03</span><div><strong>Review results</strong><p>See transactions that may need your attention.</p></div></div></aside></div>}
    {workflow === 'extracting' && <section className="panel extraction-panel"><ExtractionProgress current={extractStep} /><div className="processing-copy"><span className="processing-icon"><FileCheck2 size={25} /></span><h2>Preparing your statement</h2><p>We’re identifying transaction records in your statement.</p></div></section>}
    {workflow === 'error' && <section className="panel"><StateMessage type="error" title="We couldn't process that statement" description={error} action={<><button className="button button--secondary" onClick={removeFile}>Choose another file</button><button className="button button--primary" onClick={loadDemoRows}>Try sample transactions</button></>} /></section>}
    {workflow === 'review' && <section className="review-workspace"><div className="review-banner"><div><p className="eyebrow">Step 02 · Review extracted rows</p><h2>{rows.length} transactions found</h2><p>{note || 'Review the extracted transactions before analysis.'}</p></div><button className="button button--secondary button--small" onClick={removeFile}><RotateCcw size={14} />Start over</button></div><div className="selection-summary"><div><strong>{selectedRows.length} selected for analysis</strong><span>of {rows.length} extracted transactions</span></div><div className="selection-summary__actions"><label className="search-field"><span className="sr-only">Search extracted transactions</span><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search merchant or location" /></label><label className="select-filter"><Filter size={14} /><select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category">{categories.map((item) => <option key={item} value={item}>{item === 'all' ? 'All categories' : item}</option>)}</select></label></div></div><div className="panel panel--flush"><div className="panel__heading panel__heading--table"><div><p className="eyebrow">Transaction preview</p><h2>Check the details</h2></div><span className="panel-note">{visibleRows.length} visible</span></div>{visibleRows.length ? <ExtractedTransactionTable transactions={visibleRows} onToggle={toggleRow} onToggleAll={toggleAll} allSelected={allVisibleSelected} /> : <StateMessage type="empty" title="No rows match your filters" description="Clear the search or category filter to see extracted transactions." />}</div><div className="review-actions"><span><ShieldCheck size={15} />Results highlight transactions that may need your attention.</span><div><button className="button button--ghost" onClick={() => setRows((current) => current.map((row) => ({ ...row, selected: false })))} disabled={!selectedRows.length}>Clear selection</button><button className="button button--primary" onClick={analyzeSelected} disabled={!selectedRows.length}>Analyze selected transactions <ArrowRight size={16} /></button></div></div></section>}
    {workflow === 'analyzing' && <section className="panel analysis-processing-panel"><AnalysisProgress completed={analysisProgress} total={selectedRows.length} /><p className="analysis-disclaimer">We’re reviewing the selected transactions and preparing your results.</p></section>}
  </div>
}

function pause(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds))
}
