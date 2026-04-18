'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, X, Zap, AlertCircle } from 'lucide-react'
import { cn, validateDocumentFile } from '@/lib/utils'

interface UploadScreenProps {
  onAnalyze: (files: File[], message: string) => void
  isLoading: boolean
  appState: string
  error: string | null
  onClearError: () => void
}

export function UploadScreen({
  onAnalyze,
  isLoading,
  appState,
  error,
  onClearError,
}: UploadScreenProps) {
  const [files, setFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [message, setMessage] = useState('')
  const [fileErrors, setFileErrors] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((newFiles: File[]) => {
    const errors: string[] = []
    const valid: File[] = []

    for (const file of newFiles) {
      const result = validateDocumentFile(file)
      if (result.valid) {
        valid.push(file)
      } else {
        errors.push(`${file.name}: ${result.error}`)
      }
    }

    setFileErrors(errors)
    setFiles((prev) => {
      const combined = [...prev, ...valid]
      // Deduplicate by name
      return combined.filter(
        (f, i, arr) => arr.findIndex((x) => x.name === f.name) === i
      )
    })
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      addFiles(Array.from(e.dataTransfer.files))
    },
    [addFiles]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(Array.from(e.target.files))
        e.target.value = ''
      }
    },
    [addFiles]
  )

  const removeFile = useCallback((name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name))
  }, [])

  const handleAnalyze = useCallback(() => {
    if (files.length === 0 || isLoading) return
    onAnalyze(files, message)
  }, [files, message, isLoading, onAnalyze])

  const isAnalyzing = appState === 'analyzing' || appState === 'uploading'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="text-center mb-12"
      >
        {/* Logo mark */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="relative">
            <div className="w-10 h-10 border border-accent/40 rounded-sm flex items-center justify-center">
              <div className="w-5 h-5 border border-accent rounded-sm" />
            </div>
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full animate-pulse-slow" />
          </div>
          <span className="font-display text-2xl font-700 tracking-tight text-text-primary">
            Fund<span className="text-accent">Lens</span>
          </span>
        </div>

        <h1 className="font-display text-4xl font-800 text-text-primary mb-3 tracking-tight">
          Alternative Asset Intelligence
        </h1>
        <p className="text-text-secondary text-base max-w-md mx-auto leading-relaxed">
          Upload fund documents for instant structured analysis.
          Powered by Claude Opus 4.7.
        </p>
      </motion.div>

      {/* Upload card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
        className="w-full max-w-2xl"
      >
        <div className="panel p-6">
          {/* Drop zone */}
          <div
            className={cn(
              'drop-zone p-12 text-center cursor-pointer mb-4 transition-all duration-200',
              dragOver && 'drag-over',
              files.length > 0 && 'py-8'
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.doc"
              className="hidden"
              onChange={handleFileInput}
            />

            <AnimatePresence mode="wait">
              {files.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className={cn(
                    'w-16 h-16 border border-dashed border-accent/30 rounded-sm',
                    'flex items-center justify-center transition-colors',
                    dragOver && 'border-accent/60 bg-accent/5'
                  )}>
                    <Upload className="w-7 h-7 text-accent/60" />
                  </div>
                  <div>
                    <p className="text-text-primary font-500 mb-1">
                      Drop fund documents here
                    </p>
                    <p className="text-text-secondary text-sm">
                      PDF or Word · Up to 10MB per file · LPA, PPM, capital account statements
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="files"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 justify-center flex-wrap"
                >
                  <span className="text-text-secondary text-sm">
                    {files.length} document{files.length > 1 ? 's' : ''} ready
                  </span>
                  <span className="text-text-muted">·</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
                    className="text-accent text-sm hover:text-accent-dim transition-colors"
                  >
                    Add more
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* File list */}
          <AnimatePresence>
            {files.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 space-y-2 overflow-hidden"
              >
                {files.map((file) => (
                  <motion.div
                    key={file.name}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    className="card flex items-center gap-3 px-3 py-2.5"
                  >
                    <FileText className="w-4 h-4 text-accent/70 shrink-0" />
                    <span className="text-text-primary text-sm font-mono truncate flex-1">
                      {file.name}
                    </span>
                    <span className="text-text-muted text-xs font-mono shrink-0">
                      {(file.size / 1024 / 1024).toFixed(1)}MB
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(file.name) }}
                      className="text-text-muted hover:text-data-negative transition-colors shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* File errors */}
          <AnimatePresence>
            {fileErrors.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mb-4 space-y-1"
              >
                {fileErrors.map((err, i) => (
                  <p key={i} className="text-data-negative text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {err}
                  </p>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Optional message */}
          <div className="mb-5">
            <label className="block text-label uppercase tracking-widest text-text-label mb-2">
              Focus Area <span className="text-text-muted normal-case tracking-normal">(optional)</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Focus on fee structure and waterfall provisions, or 'Compare recycling terms across all documents'"
              rows={2}
              className={cn(
                'input-dark w-full px-3 py-2.5 text-sm resize-none',
                'placeholder:text-text-muted'
              )}
            />
          </div>

          {/* Error display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 flex items-start gap-2 text-data-negative text-sm"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
                <button
                  onClick={onClearError}
                  className="ml-auto text-text-muted hover:text-text-secondary"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Analyze button */}
          <button
            onClick={handleAnalyze}
            disabled={files.length === 0 || isAnalyzing}
            className={cn(
              'btn-primary w-full py-3 flex items-center justify-center gap-2.5',
              'font-display font-600 text-sm tracking-wide'
            )}
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-surface-950/30 border-t-surface-950 rounded-full animate-spin" />
                <span>
                  {appState === 'uploading' ? 'Encoding documents...' : 'Analyzing with Opus 4.7...'}
                </span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Analyze Document{files.length > 1 ? 's' : ''}</span>
              </>
            )}
          </button>

          {isAnalyzing && (
            <div className="mt-3 overflow-hidden">
              <div className="analyzing-bar" />
            </div>
          )}
        </div>

        {/* Supported document types */}
        <div className="mt-4 flex items-center justify-center gap-6">
          {['LPA / Partnership Agreement', 'PPM / Offering Memo', 'Capital Account Statement', 'Side Letters'].map((doc) => (
            <span key={doc} className="text-text-muted text-xs flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-accent/40 shrink-0" />
              {doc}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
