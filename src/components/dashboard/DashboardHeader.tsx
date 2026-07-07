'use client'

import { motion } from 'framer-motion'
import { FileText, RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FundAnalysis } from '@/types'

interface DashboardHeaderProps {
  analysis: FundAnalysis
  onReset: () => void
}

const FUND_TYPE_COLORS: Record<string, string> = {
  'Hedge Fund':       'border-cyan-400/40 text-cyan-400 bg-cyan-400/8',
  'Private Equity':   'border-violet-400/40 text-violet-400 bg-violet-400/8',
  'Venture Capital':  'border-emerald-400/40 text-emerald-400 bg-emerald-400/8',
  'Real Estate':      'border-amber-400/40 text-amber-400 bg-amber-400/8',
  'Credit':           'border-rose-400/40 text-rose-400 bg-rose-400/8',
  'Infrastructure':   'border-sky-400/40 text-sky-400 bg-sky-400/8',
  'Fund of Funds':    'border-purple-400/40 text-purple-400 bg-purple-400/8',
  'Other':            'border-text-muted/30 text-text-secondary',
}

export function DashboardHeader({ analysis, onReset }: DashboardHeaderProps) {
  const { fund_profile, document_metadata } = analysis
  const confidence = document_metadata.extraction_confidence
  const hasFlaggedItems = document_metadata.flagged_items.length > 0
  const typeColor = FUND_TYPE_COLORS[fund_profile.type] ?? FUND_TYPE_COLORS['Other']

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="panel px-6 py-4 mb-4"
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: Fund identity */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1.5 flex-wrap">
            {/* Fund name */}
            <h1 className="font-display text-xl font-700 text-text-primary tracking-tight truncate">
              {fund_profile.name || 'Unnamed Fund'}
            </h1>

            {/* Fund type badge */}
            {fund_profile.type && (
              <span className={cn(
                'text-[10px] uppercase tracking-widest font-600 px-2 py-0.5',
                'border rounded-chip shrink-0',
                typeColor
              )}>
                {fund_profile.type}
              </span>
            )}

            {/* Vintage year */}
            {fund_profile.vintage_year && (
              <span className="text-text-muted text-xs font-mono shrink-0">
                {fund_profile.vintage_year}
              </span>
            )}
          </div>

          {/* GP and strategy */}
          <div className="flex items-center gap-4 flex-wrap">
            {fund_profile.general_partner && (
              <span className="text-text-secondary text-sm">
                {fund_profile.general_partner}
              </span>
            )}
            {fund_profile.general_partner && fund_profile.strategy && (
              <span className="text-text-muted">·</span>
            )}
            {fund_profile.strategy && (
              <span className="text-text-muted text-sm line-clamp-1 max-w-md">
                {fund_profile.strategy}
              </span>
            )}
          </div>
        </div>

        {/* Right: Status indicators and controls */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Confidence badge */}
          <div className={cn(
            'flex items-center gap-1.5 text-xs border rounded-chip px-2 py-1',
            confidence === 'High'   && 'confidence-high',
            confidence === 'Medium' && 'confidence-medium',
            confidence === 'Low'    && 'confidence-low',
            !confidence             && 'border-text-muted/20 text-text-muted',
          )}>
            {confidence === 'High'   && <CheckCircle className="w-3 h-3" />}
            {confidence === 'Medium' && <Clock className="w-3 h-3" />}
            {confidence === 'Low'    && <AlertTriangle className="w-3 h-3" />}
            <span className="font-600 uppercase tracking-wide text-[10px]">
              {confidence || '—'} Confidence
            </span>
          </div>

          {/* Flagged items indicator */}
          {hasFlaggedItems && (
            <div className="flex items-center gap-1.5 text-data-flag text-xs border border-data-flag/30 rounded-chip px-2 py-1">
              <AlertTriangle className="w-3 h-3" />
              <span className="font-600 uppercase tracking-wide text-[10px]">
                {document_metadata.flagged_items.length} Flag{document_metadata.flagged_items.length > 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Reset */}
          <button
            onClick={onReset}
            className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs"
            title="Upload new documents"
          >
            <RefreshCw className="w-3 h-3" />
            <span>New Analysis</span>
          </button>
        </div>
      </div>

      {/* Documents analyzed */}
      {document_metadata.documents_analyzed.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2 flex-wrap">
          <span className="text-text-muted text-xs uppercase tracking-widest">
            Source{document_metadata.documents_analyzed.length > 1 ? 's' : ''}:
          </span>
          {document_metadata.documents_analyzed.map((doc) => (
            <span
              key={doc}
              className="flex items-center gap-1.5 text-xs text-text-secondary font-mono"
            >
              <FileText className="w-3 h-3 text-accent/50 shrink-0" />
              {doc}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  )
}
