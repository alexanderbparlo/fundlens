'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Edit2, Check, X, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DataFieldProps {
  label: string
  value: string              // Already formatted for display
  fieldPath: string          // Dot-notation path for override tracking
  isMissing?: boolean        // True if in fields_not_found
  isOverridden?: boolean     // True if manually overridden
  tooltip?: string           // Definition from concept library
  onOverride?: (fieldPath: string, rawValue: string) => void
  unit?: string              // e.g. "%" or "x" — shown after value
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function DataField({
  label,
  value,
  fieldPath,
  isMissing = false,
  isOverridden = false,
  tooltip,
  onOverride,
  unit,
  className,
  size = 'md',
}: DataFieldProps) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [showTooltip, setShowTooltip] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const handleStartEdit = () => {
    if (!onOverride) return
    setEditValue(value === '—' ? '' : value)
    setEditing(true)
  }

  const handleConfirmEdit = () => {
    if (!onOverride) return
    onOverride(fieldPath, editValue)
    setEditing(false)
  }

  const handleCancelEdit = () => {
    setEditValue(value)
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirmEdit()
    if (e.key === 'Escape') handleCancelEdit()
  }

  const valueSizeClass = {
    sm: 'text-sm font-mono',
    md: 'text-data-lg font-mono data-value',
    lg: 'text-data-xl font-display font-600',
  }[size]

  return (
    <div
      className={cn(
        'group relative',
        isOverridden && 'field-override',
        className
      )}
    >
      {/* Label row */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span
          className="text-label uppercase tracking-widest text-text-label cursor-default"
          onMouseEnter={() => tooltip && setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {label}
        </span>

        {tooltip && (
          <div className="relative">
            <button
              className="w-3.5 h-3.5 rounded-full border border-text-muted/30 text-text-muted text-[9px] flex items-center justify-center hover:border-accent/40 hover:text-accent transition-colors"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              ?
            </button>
            <AnimatePresence>
              {showTooltip && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="tooltip-content absolute left-0 top-5 w-56 z-50"
                >
                  {tooltip}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {isMissing && (
          <span className="text-[9px] uppercase tracking-widest text-data-neutral/60 ml-auto">
            not found
          </span>
        )}

        {isOverridden && (
          <span className="text-[9px] uppercase tracking-widest text-data-override ml-auto flex items-center gap-1">
            <Edit2 className="w-2.5 h-2.5" />
            override
          </span>
        )}
      </div>

      {/* Value row */}
      <div className="flex items-baseline gap-1.5">
        {editing ? (
          <div className="flex items-center gap-1.5 w-full">
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="input-dark px-2 py-1 text-sm font-mono flex-1 min-w-0"
            />
            <button
              onClick={handleConfirmEdit}
              className="text-data-positive hover:text-data-positive/80 transition-colors"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancelEdit}
              className="text-text-muted hover:text-data-negative transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <span
              className={cn(
                valueSizeClass,
                isMissing && 'field-unavailable text-text-muted',
                !isMissing && !isOverridden && 'text-text-primary',
                isOverridden && 'text-data-override'
              )}
            >
              {value}
            </span>
            {unit && !isMissing && value !== '—' && (
              <span className="text-text-secondary text-sm font-mono">{unit}</span>
            )}
            {onOverride && (
              <button
                onClick={handleStartEdit}
                className={cn(
                  'ml-1 text-text-muted opacity-0 group-hover:opacity-100',
                  'hover:text-accent transition-all duration-150'
                )}
                title="Override this field"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Metric tile — larger prominent display for key performance metrics ────────

interface MetricTileProps {
  label: string
  value: string
  fieldPath: string
  isMissing?: boolean
  isOverridden?: boolean
  tooltip?: string
  onOverride?: (fieldPath: string, rawValue: string) => void
  trend?: 'positive' | 'negative' | 'neutral'
  benchmark?: string  // e.g. "Market avg: 1.8x"
}

export function MetricTile({
  label,
  value,
  fieldPath,
  isMissing = false,
  isOverridden = false,
  tooltip,
  onOverride,
  trend = 'neutral',
  benchmark,
}: MetricTileProps) {
  const trendColor = {
    positive: 'text-data-positive',
    negative: 'text-data-negative',
    neutral:  'text-text-primary',
  }[trend]

  return (
    <div className={cn(
      'card p-4 relative group',
      isOverridden && 'border-data-override/20'
    )}>
      {/* Accent top line */}
      <div className={cn(
        'absolute top-0 left-0 right-0 h-px',
        trend === 'positive' && 'bg-data-positive/30',
        trend === 'negative' && 'bg-data-negative/30',
        trend === 'neutral'  && 'bg-accent/20',
      )} />

      <DataField
        label={label}
        value={value}
        fieldPath={fieldPath}
        isMissing={isMissing}
        isOverridden={isOverridden}
        tooltip={tooltip}
        onOverride={onOverride}
        size="lg"
        className={isMissing ? '' : trendColor}
      />

      {benchmark && !isMissing && (
        <p className="text-text-muted text-xs font-mono mt-2">{benchmark}</p>
      )}

      {isMissing && (
        <div className="flex items-center gap-1 mt-2">
          <AlertTriangle className="w-3 h-3 text-data-neutral/40" />
          <span className="text-xs text-text-muted">
            Upload capital account statement
          </span>
        </div>
      )}
    </div>
  )
}
