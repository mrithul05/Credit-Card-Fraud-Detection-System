import type { ExtractedTransaction } from '../domain/types'
import { cloneDemoTransactions } from '../data/demoTransactions'

const MAX_FILE_SIZE = 15 * 1024 * 1024

export type ExtractionResult = {
  mode: 'pdf' | 'demo'
  transactions: ExtractedTransaction[]
  note?: string
  rawText?: string
}

export function validateStatementFile(file: File) {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Please choose a PDF statement. Other file formats are not supported in this demo.')
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('That PDF is larger than 15 MB. Choose a smaller statement to continue.')
  }
}

/**
 * Lightweight browser-only extraction. Most bank PDFs use compressed or scanned text,
 * so this intentionally reports low confidence rather than pretending to parse every format.
 */
export async function extractStatement(file: File): Promise<ExtractionResult> {
  validateStatementFile(file)
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const pdfHeader = new TextDecoder().decode(bytes.slice(0, 5))
  if (pdfHeader !== '%PDF-') throw new Error('This file does not contain a readable PDF header.')

  const rawText = new TextDecoder('latin1').decode(bytes)
  const rows = parsePlainTextRows(rawText)
  if (rows.length >= 2) {
    return { mode: 'pdf', transactions: rows, rawText, note: 'Rows were identified from selectable PDF text. Please review them before analysis.' }
  }

  return {
    mode: 'demo',
    transactions: cloneDemoTransactions(),
    rawText,
    note: 'PDF read successfully, but transaction rows could not be confidently identified from this statement format. Demo transactions are shown so the review can continue.',
  }
}

function parsePlainTextRows(text: string): ExtractedTransaction[] {
  const lines = text.split(/[\r\n]+/).map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean)
  const rows: ExtractedTransaction[] = []
  const dateAmountPattern = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}).*?([₹$]?\s*[\d,]+(?:\.\d{1,2})?)(?:\s*(?:DR|DEBIT|CR|CREDIT))?$/i
  lines.forEach((line, index) => {
    const match = line.match(dateAmountPattern)
    if (!match) return
    const amount = Number(match[2].replace(/[^\d.]/g, '').replace(/,(?=\d{3})/g, ''))
    if (!Number.isFinite(amount) || amount <= 0) return
    const date = parseDate(match[1])
    if (!date) return
    const description = line.replace(match[1], '').replace(match[2], '').replace(/\b(?:DR|DEBIT|CR|CREDIT)\b/i, '').trim() || `Statement transaction ${index + 1}`
    rows.push({
      extraction_id: `pdf-${index + 1}`,
      description,
      statement_date: date.slice(0, 10),
      amount,
      merchant_category: inferCategory(description),
      location: 'India',
      device_type: 'Web',
      user_age: 29,
      account_age_days: 980,
      is_foreign_transaction: false,
      timestamp: date,
      extraction_confidence: 'medium',
      selected: true,
      source: 'pdf',
    })
  })
  return rows.slice(0, 100)
}

function parseDate(value: string) {
  const normalized = value.replace(/-/g, '/')
  const parts = normalized.split('/').map(Number)
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return undefined
  const [first, second, third] = parts
  const year = first > 31 ? first : third < 100 ? 2000 + third : third
  const month = first > 31 ? second : second
  const day = first > 31 ? third : first
  const date = new Date(year, month - 1, day, 12)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function inferCategory(description: string) {
  const text = description.toLowerCase()
  if (/food|swiggy|zomato|restaurant/.test(text)) return 'Dining'
  if (/uber|ola|metro|transport/.test(text)) return 'Transport'
  if (/amazon|flipkart|myntra|online/.test(text)) return 'Online Services'
  if (/travel|irctc|air|hotel/.test(text)) return 'Travel'
  if (/pharmacy|apollo|medical/.test(text)) return 'Pharmacy'
  if (/digital|electronics/.test(text)) return 'Electronics'
  return 'Other'
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getStatementLabel(file: File) {
  return file.name || 'Credit-card statement.pdf'
}
