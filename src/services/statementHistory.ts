import type { StatementAnalysis, StatementHistoryRecord } from '../domain/types'

const STORAGE_KEY = 'sentinel.statement-history.v1'
const DETAILS_PREFIX = 'sentinel.statement-analysis.'
const UPDATE_EVENT = 'sentinel:statement-history-updated'

function validRecord(value: unknown): value is StatementHistoryRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return typeof record.analysis_id === 'string' && typeof record.statement_name === 'string' && typeof record.uploaded_at === 'string' && typeof record.status === 'string' && typeof record.extraction_mode === 'string' && typeof record.summary === 'object'
}

export function getStatementHistory(): StatementHistoryRecord[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.filter(validRecord) : []
  } catch {
    return []
  }
}

export function getStatementAnalysis(id: string): StatementAnalysis | undefined {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(`${DETAILS_PREFIX}${id}`) || 'null')
    return parsed && typeof parsed === 'object' ? parsed as StatementAnalysis : undefined
  } catch {
    return undefined
  }
}

export function saveStatementAnalysis(analysis: StatementAnalysis) {
  try {
    const record: StatementHistoryRecord = {
      analysis_id: analysis.analysis_id,
      statement_name: analysis.statement_name,
      uploaded_at: analysis.uploaded_at,
      extraction_mode: analysis.extraction_mode,
      status: analysis.status,
      summary: analysis.summary,
    }
    const history = [record, ...getStatementHistory().filter((item) => item.analysis_id !== analysis.analysis_id)].slice(0, 25)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
    window.localStorage.setItem(`${DETAILS_PREFIX}${analysis.analysis_id}`, JSON.stringify(analysis))
    window.dispatchEvent(new Event(UPDATE_EVENT))
  } catch {
    // The completed analysis remains available in the current route even if storage is unavailable.
  }
}

export function subscribeToStatementHistory(listener: () => void) {
  const handleUpdate = () => listener()
  window.addEventListener(UPDATE_EVENT, handleUpdate)
  window.addEventListener('storage', handleUpdate)
  return () => {
    window.removeEventListener(UPDATE_EVENT, handleUpdate)
    window.removeEventListener('storage', handleUpdate)
  }
}
