import { useRef, useState } from 'react'
import { FileText, LockKeyhole, UploadCloud, X } from 'lucide-react'
import { formatFileSize, getStatementLabel, validateStatementFile } from '../../services/pdfExtractor'

export type StatementUploaderProps = {
  file?: File
  onFile: (file: File) => void
  onRemove: () => void
  disabled?: boolean
}

export function StatementUploader({ file, onFile, onRemove, disabled }: StatementUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')

  function acceptFile(candidate?: File) {
    if (!candidate) return
    try {
      validateStatementFile(candidate)
      setError('')
      onFile(candidate)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'This file could not be uploaded.')
    }
  }

  return <div className="upload-stack">
    <div className={`upload-dropzone ${dragging ? 'upload-dropzone--dragging' : ''} ${file ? 'upload-dropzone--selected' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); acceptFile(event.dataTransfer.files[0]) }}>
      {file ? <div className="selected-file"><span className="selected-file__icon"><FileText size={25} /></span><div className="selected-file__copy"><strong>{getStatementLabel(file)}</strong><span>{formatFileSize(file.size)} · PDF statement ready to process</span></div><button className="icon-button" type="button" onClick={onRemove} disabled={disabled} aria-label="Remove statement"><X size={17} /></button></div> : <><span className="upload-icon"><UploadCloud size={28} /></span><strong>Drop your PDF statement here</strong><span>or <button type="button" className="inline-button" onClick={() => inputRef.current?.click()} disabled={disabled}>browse PDF statement</button></span><small>PDF files only · maximum 15 MB · processed locally in this demo</small></>}
      <input ref={inputRef} className="sr-only" type="file" accept="application/pdf,.pdf" onChange={(event) => acceptFile(event.target.files?.[0])} disabled={disabled} />
    </div>
    {file && <div className="upload-actions"><button className="button button--secondary button--small" type="button" onClick={() => inputRef.current?.click()} disabled={disabled}>Upload a different PDF</button><span><LockKeyhole size={13} />Your statement stays in this browser during the demonstration.</span></div>}
    {error && <p className="upload-error" role="alert"><strong>Upload error:</strong> {error}</p>}
  </div>
}
