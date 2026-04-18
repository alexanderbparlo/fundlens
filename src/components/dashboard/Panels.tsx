'use client'

import { motion } from 'framer-motion'
import { TrendingUp, DollarSign, Droplets, Building2, AlertTriangle, Users } from 'lucide-react'
import { cn, formatPercent, formatMultiple, formatCurrency, formatString, formatBoolean, formatDate } from '@/lib/utils'
import { DataField, MetricTile } from './DataField'
import type { FundAnalysis } from '@/types'

// Concept library tooltips for common fields
const TOOLTIPS: Record<string, string> = {
  irr_net:               'Time-weighted annualized return after fees and carried interest.',
  irr_gross:             'Time-weighted annualized return before fees and carried interest.',
  dpi:                   'Distributed to Paid-In. Total distributions ÷ paid-in capital. DPI > 1.0 = full capital return.',
  rvpi:                  'Residual Value to Paid-In. Current NAV ÷ paid-in capital. Unrealized value remaining.',
  tvpi:                  'Total Value to Paid-In. DPI + RVPI. The primary performance multiple used by LPs.',
  moic:                  'Multiple on Invested Capital. Total value ÷ invested capital.',
  management_fee:        'Annual fee paid to the GP, typically 1.5–2.0% of committed or invested capital.',
  carried_interest:      "GP's share of profits above the preferred return, typically 20%.",
  preferred_return:      'Minimum annualized return LPs must receive before carry is paid. Typically 8%.',
  catch_up:              'Provision allowing the GP to receive a higher share of profits until caught up to carry entitlement.',
  clawback:              'Obligation for the GP to return carry if total distributions exceeded entitlement at wind-down.',
  recycling:             'Provision allowing the GP to reinvest returned capital into new investments.',
  waterfall:             'Deal-by-deal (American) = carry per deal. Whole-fund (European) = carry only after full capital return.',
  lock_up:               'Period during which hedge fund investors cannot redeem capital.',
  gate:                  'Limit on total redemptions in any given period, typically 10–25% of NAV.',
  side_pocket:           'Segregated account for illiquid investments, not subject to normal redemption.',
}

interface PanelProps {
  analysis: FundAnalysis
  onOverride: (fieldPath: string, rawValue: string) => void
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  iconColor = 'text-accent',
  children,
  delay = 0,
}: {
  title: string
  icon: React.ElementType
  iconColor?: string
  children: React.ReactNode
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="panel p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon className={cn('w-4 h-4', iconColor)} />
        <h2 className="font-display text-sm font-600 text-text-primary uppercase tracking-widest">
          {title}
        </h2>
      </div>
      <div className="accent-line mb-4" />
      {children}
    </motion.div>
  )
}

// ── Performance Metrics ───────────────────────────────────────────────────────

export function PerformancePanel({ analysis, onOverride }: PanelProps) {
  const { performance_metrics: pm, document_metadata: dm } = analysis
  const missing = dm.fields_not_found
  const overridden = dm.manual_overrides.map((o) => o.field)
  const currency = analysis.fund_profile.currency || 'USD'

  const isMissing = (field: string) => missing.includes(`performance_metrics.${field}`)
  const isOverridden = (field: string) => overridden.includes(`performance_metrics.${field}`)

  // Determine metric trends based on typical benchmarks
  const getTvpiTrend = (v: number | null) => {
    if (!v) return 'neutral'
    return v >= 1.5 ? 'positive' : v < 1.0 ? 'negative' : 'neutral'
  }
  const getIrrTrend = (v: number | null) => {
    if (!v) return 'neutral'
    return v >= 0.12 ? 'positive' : v < 0.06 ? 'negative' : 'neutral'
  }

  return (
    <Section title="Performance" icon={TrendingUp} delay={0.1}>
      {/* Top metrics grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <MetricTile
          label="IRR (Net)"
          value={formatPercent(pm.irr_net)}
          fieldPath="performance_metrics.irr_net"
          isMissing={isMissing('irr_net')}
          isOverridden={isOverridden('irr_net')}
          tooltip={TOOLTIPS.irr_net}
          onOverride={onOverride}
          trend={getIrrTrend(pm.irr_net)}
        />
        <MetricTile
          label="IRR (Gross)"
          value={formatPercent(pm.irr_gross)}
          fieldPath="performance_metrics.irr_gross"
          isMissing={isMissing('irr_gross')}
          isOverridden={isOverridden('irr_gross')}
          tooltip={TOOLTIPS.irr_gross}
          onOverride={onOverride}
          trend={getIrrTrend(pm.irr_gross)}
        />
      </div>

      {/* Multiples row */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: 'DPI',  value: formatMultiple(pm.dpi),  field: 'dpi',  tip: TOOLTIPS.dpi  },
          { label: 'RVPI', value: formatMultiple(pm.rvpi), field: 'rvpi', tip: TOOLTIPS.rvpi },
          { label: 'TVPI', value: formatMultiple(pm.tvpi), field: 'tvpi', tip: TOOLTIPS.tvpi },
          { label: 'MOIC', value: formatMultiple(pm.moic), field: 'moic', tip: TOOLTIPS.moic },
        ].map(({ label, value, field, tip }) => (
          <MetricTile
            key={field}
            label={label}
            value={value}
            fieldPath={`performance_metrics.${field}`}
            isMissing={isMissing(field)}
            isOverridden={isOverridden(field)}
            tooltip={tip}
            onOverride={onOverride}
            trend={field === 'tvpi' ? getTvpiTrend(pm.tvpi) : 'neutral'}
          />
        ))}
      </div>

      {/* As-of date and note */}
      {pm.as_of_date && (
        <p className="text-text-muted text-xs font-mono mb-2">
          As of {formatDate(pm.as_of_date)}
        </p>
      )}
      {pm.note && (
        <p className="text-text-secondary text-xs leading-relaxed border-l border-accent/20 pl-3">
          {pm.note}
        </p>
      )}
    </Section>
  )
}

// ── Fee Structure ─────────────────────────────────────────────────────────────

export function FeePanel({ analysis, onOverride }: PanelProps) {
  const { fee_structure: fs, document_metadata: dm } = analysis
  const missing = dm.fields_not_found
  const overridden = dm.manual_overrides.map((o) => o.field)

  const isMissing = (f: string) => missing.includes(`fee_structure.${f}`)
  const isOver    = (f: string) => overridden.includes(`fee_structure.${f}`)

  return (
    <Section title="Fee Structure" icon={DollarSign} iconColor="text-violet-400" delay={0.15}>
      <div className="grid grid-cols-3 gap-4 mb-5">
        <DataField
          label="Mgmt Fee"
          value={formatPercent(fs.management_fee_rate)}
          fieldPath="fee_structure.management_fee_rate"
          isMissing={isMissing('management_fee_rate')}
          isOverridden={isOver('management_fee_rate')}
          tooltip={TOOLTIPS.management_fee}
          onOverride={onOverride}
          size="md"
        />
        <DataField
          label="Carry"
          value={formatPercent(fs.carried_interest_rate)}
          fieldPath="fee_structure.carried_interest_rate"
          isMissing={isMissing('carried_interest_rate')}
          isOverridden={isOver('carried_interest_rate')}
          tooltip={TOOLTIPS.carried_interest}
          onOverride={onOverride}
          size="md"
        />
        <DataField
          label="Preferred Return"
          value={formatPercent(fs.preferred_return)}
          fieldPath="fee_structure.preferred_return"
          isMissing={isMissing('preferred_return')}
          isOverridden={isOver('preferred_return')}
          tooltip={TOOLTIPS.preferred_return}
          onOverride={onOverride}
          size="md"
        />
      </div>

      <div className="space-y-3">
        <DataField
          label="Fee Basis"
          value={formatString(fs.management_fee_basis)}
          fieldPath="fee_structure.management_fee_basis"
          isMissing={isMissing('management_fee_basis')}
          isOverridden={isOver('management_fee_basis')}
          onOverride={onOverride}
          size="sm"
        />
        <DataField
          label="Step-Down"
          value={formatString(fs.management_fee_step_down)}
          fieldPath="fee_structure.management_fee_step_down"
          isMissing={isMissing('management_fee_step_down')}
          isOverridden={isOver('management_fee_step_down')}
          onOverride={onOverride}
          size="sm"
        />
        <DataField
          label="Catch-Up"
          value={formatString(fs.catch_up_structure)}
          fieldPath="fee_structure.catch_up_structure"
          isMissing={isMissing('catch_up_structure')}
          isOverridden={isOver('catch_up_structure')}
          tooltip={TOOLTIPS.catch_up}
          onOverride={onOverride}
          size="sm"
        />
        <DataField
          label="Clawback"
          value={formatString(fs.clawback_provisions)}
          fieldPath="fee_structure.clawback_provisions"
          isMissing={isMissing('clawback_provisions')}
          isOverridden={isOver('clawback_provisions')}
          tooltip={TOOLTIPS.clawback}
          onOverride={onOverride}
          size="sm"
        />
      </div>
    </Section>
  )
}

// ── Capital Activity ──────────────────────────────────────────────────────────

export function CapitalPanel({ analysis, onOverride }: PanelProps) {
  const { capital_activity: ca, fund_profile: fp, document_metadata: dm } = analysis
  const currency = fp.currency || 'USD'
  const missing = dm.fields_not_found
  const overridden = dm.manual_overrides.map((o) => o.field)

  const isMissing = (f: string) => missing.includes(`capital_activity.${f}`)
  const isOver    = (f: string) => overridden.includes(`capital_activity.${f}`)

  // Calculate call percentage
  const callPct = ca.total_commitments && ca.called_capital
    ? (ca.called_capital / ca.total_commitments) * 100
    : null

  return (
    <Section title="Capital Activity" icon={Droplets} iconColor="text-sky-400" delay={0.2}>
      {/* Capital bar */}
      {callPct !== null && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-label uppercase tracking-widest text-text-label text-[10px]">
              Capital Called
            </span>
            <span className="text-xs font-mono text-text-secondary">
              {callPct.toFixed(1)}%
            </span>
          </div>
          <div className="h-1.5 bg-surface-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(callPct, 100)}%` }}
              transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
              className="h-full bg-accent rounded-full"
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-text-muted font-mono">
              {formatCurrency(ca.called_capital, currency)} called
            </span>
            <span className="text-[10px] text-text-muted font-mono">
              {formatCurrency(ca.total_commitments, currency)} committed
            </span>
          </div>
        </div>
      )}

      {/* Capital fields grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <DataField
          label="Total Commitments"
          value={formatCurrency(ca.total_commitments, currency)}
          fieldPath="capital_activity.total_commitments"
          isMissing={isMissing('total_commitments')}
          isOverridden={isOver('total_commitments')}
          onOverride={onOverride}
          size="sm"
        />
        <DataField
          label="Called Capital"
          value={formatCurrency(ca.called_capital, currency)}
          fieldPath="capital_activity.called_capital"
          isMissing={isMissing('called_capital')}
          isOverridden={isOver('called_capital')}
          onOverride={onOverride}
          size="sm"
        />
        <DataField
          label="Uncalled (Dry Powder)"
          value={formatCurrency(ca.uncalled_capital, currency)}
          fieldPath="capital_activity.uncalled_capital"
          isMissing={isMissing('uncalled_capital')}
          isOverridden={isOver('uncalled_capital')}
          onOverride={onOverride}
          size="sm"
        />
        <DataField
          label="Total Distributions"
          value={formatCurrency(ca.total_distributions, currency)}
          fieldPath="capital_activity.total_distributions"
          isMissing={isMissing('total_distributions')}
          isOverridden={isOver('total_distributions')}
          onOverride={onOverride}
          size="sm"
        />
      </div>

      <div className="space-y-3 pt-3 border-t border-white/5">
        <DataField
          label="Waterfall Type"
          value={formatString(ca.distribution_waterfall_type)}
          fieldPath="capital_activity.distribution_waterfall_type"
          isMissing={isMissing('distribution_waterfall_type')}
          isOverridden={isOver('distribution_waterfall_type')}
          tooltip={TOOLTIPS.waterfall}
          onOverride={onOverride}
          size="sm"
        />
        <DataField
          label="Recycling Permitted"
          value={formatBoolean(ca.recycling_permitted)}
          fieldPath="capital_activity.recycling_permitted"
          isMissing={isMissing('recycling_permitted')}
          isOverridden={isOver('recycling_permitted')}
          tooltip={TOOLTIPS.recycling}
          onOverride={onOverride}
          size="sm"
        />
        {ca.recycling_provisions && ca.recycling_provisions !== '' && (
          <DataField
            label="Recycling Provisions"
            value={formatString(ca.recycling_provisions)}
            fieldPath="capital_activity.recycling_provisions"
            isMissing={isMissing('recycling_provisions')}
            isOverridden={isOver('recycling_provisions')}
            onOverride={onOverride}
            size="sm"
          />
        )}
      </div>
    </Section>
  )
}

// ── Fund Profile ──────────────────────────────────────────────────────────────

export function ProfilePanel({ analysis, onOverride }: PanelProps) {
  const { fund_profile: fp, document_metadata: dm } = analysis
  const missing = dm.fields_not_found
  const overridden = dm.manual_overrides.map((o) => o.field)

  const isMissing = (f: string) => missing.includes(`fund_profile.${f}`)
  const isOver    = (f: string) => overridden.includes(`fund_profile.${f}`)
  const currency = fp.currency || 'USD'

  return (
    <Section title="Fund Profile" icon={Building2} iconColor="text-emerald-400" delay={0.1}>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <DataField label="Domicile"         value={formatString(fp.domicile)}              fieldPath="fund_profile.domicile"          isMissing={isMissing('domicile')}          isOverridden={isOver('domicile')}          onOverride={onOverride} size="sm" />
        <DataField label="Currency"         value={formatString(fp.currency)}              fieldPath="fund_profile.currency"          isMissing={isMissing('currency')}          isOverridden={isOver('currency')}          onOverride={onOverride} size="sm" />
        <DataField label="Investment Period" value={formatString(fp.investment_period)}    fieldPath="fund_profile.investment_period" isMissing={isMissing('investment_period')} isOverridden={isOver('investment_period')} onOverride={onOverride} size="sm" />
        <DataField label="Fund Term"         value={formatString(fp.fund_term)}            fieldPath="fund_profile.fund_term"         isMissing={isMissing('fund_term')}         isOverridden={isOver('fund_term')}         onOverride={onOverride} size="sm" />
        <DataField label="Target Size"       value={formatCurrency(fp.target_size, currency)} fieldPath="fund_profile.target_size"    isMissing={isMissing('target_size')}       isOverridden={isOver('target_size')}       onOverride={onOverride} size="sm" />
        <DataField label="Hard Cap"          value={formatCurrency(fp.hard_cap, currency)} fieldPath="fund_profile.hard_cap"          isMissing={isMissing('hard_cap')}          isOverridden={isOver('hard_cap')}          onOverride={onOverride} size="sm" />
        <DataField label="General Partner"   value={formatString(fp.general_partner)}      fieldPath="fund_profile.general_partner"   isMissing={isMissing('general_partner')}   isOverridden={isOver('general_partner')}   onOverride={onOverride} size="sm" className="col-span-2" />
        <DataField label="Investment Manager" value={formatString(fp.investment_manager)}  fieldPath="fund_profile.investment_manager" isMissing={isMissing('investment_manager')} isOverridden={isOver('investment_manager')} onOverride={onOverride} size="sm" className="col-span-2" />
      </div>
    </Section>
  )
}

// ── Liquidity Terms ───────────────────────────────────────────────────────────

export function LiquidityPanel({ analysis, onOverride }: PanelProps) {
  const { liquidity_terms: lt, document_metadata: dm } = analysis
  const missing = dm.fields_not_found
  const overridden = dm.manual_overrides.map((o) => o.field)

  const isMissing = (f: string) => missing.includes(`liquidity_terms.${f}`)
  const isOver    = (f: string) => overridden.includes(`liquidity_terms.${f}`)

  // If all liquidity fields are missing, this is likely a closed-end fund
  const allMissing = ['lock_up_period', 'redemption_frequency', 'notice_period', 'gates', 'side_pockets']
    .every((f) => isMissing(f) || !lt[f as keyof typeof lt])

  return (
    <Section title="Liquidity Terms" icon={Droplets} iconColor="text-cyan-300" delay={0.25}>
      {allMissing && (
        <p className="text-text-muted text-xs mb-3 border-l border-text-muted/20 pl-3">
          No liquidity terms found. Closed-end funds (PE/VC) typically do not have redemption provisions.
        </p>
      )}
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <DataField label="Lock-Up Period"       value={formatString(lt.lock_up_period)}       fieldPath="liquidity_terms.lock_up_period"       isMissing={isMissing('lock_up_period')}       isOverridden={isOver('lock_up_period')}       tooltip={TOOLTIPS.lock_up}    onOverride={onOverride} size="sm" />
        <DataField label="Redemption Frequency" value={formatString(lt.redemption_frequency)} fieldPath="liquidity_terms.redemption_frequency" isMissing={isMissing('redemption_frequency')} isOverridden={isOver('redemption_frequency')}                               onOverride={onOverride} size="sm" />
        <DataField label="Notice Period"        value={formatString(lt.notice_period)}        fieldPath="liquidity_terms.notice_period"        isMissing={isMissing('notice_period')}        isOverridden={isOver('notice_period')}                                        onOverride={onOverride} size="sm" />
        <DataField label="Gates"                value={formatString(lt.gates)}                fieldPath="liquidity_terms.gates"                isMissing={isMissing('gates')}                isOverridden={isOver('gates')}                tooltip={TOOLTIPS.gate}       onOverride={onOverride} size="sm" />
        <DataField label="Side Pockets"         value={formatString(lt.side_pockets)}         fieldPath="liquidity_terms.side_pockets"         isMissing={isMissing('side_pockets')}         isOverridden={isOver('side_pockets')}         tooltip={TOOLTIPS.side_pocket} onOverride={onOverride} size="sm" className="col-span-2" />
      </div>
    </Section>
  )
}

// ── Key Parties ───────────────────────────────────────────────────────────────

export function PartiesPanel({ analysis, onOverride }: PanelProps) {
  const { key_parties: kp, document_metadata: dm } = analysis
  const missing = dm.fields_not_found
  const overridden = dm.manual_overrides.map((o) => o.field)

  const isMissing = (f: string) => missing.includes(`key_parties.${f}`)
  const isOver    = (f: string) => overridden.includes(`key_parties.${f}`)

  return (
    <Section title="Key Parties" icon={Users} iconColor="text-amber-400" delay={0.3}>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <DataField label="Auditor"         value={formatString(kp.auditor)}         fieldPath="key_parties.auditor"         isMissing={isMissing('auditor')}         isOverridden={isOver('auditor')}         onOverride={onOverride} size="sm" />
        <DataField label="Administrator"   value={formatString(kp.administrator)}   fieldPath="key_parties.administrator"   isMissing={isMissing('administrator')}   isOverridden={isOver('administrator')}   onOverride={onOverride} size="sm" />
        <DataField label="Prime Broker"    value={formatString(kp.prime_broker)}    fieldPath="key_parties.prime_broker"    isMissing={isMissing('prime_broker')}    isOverridden={isOver('prime_broker')}    onOverride={onOverride} size="sm" />
        <DataField label="Legal Counsel"   value={formatString(kp.legal_counsel)}   fieldPath="key_parties.legal_counsel"   isMissing={isMissing('legal_counsel')}   isOverridden={isOver('legal_counsel')}   onOverride={onOverride} size="sm" />
      </div>
    </Section>
  )
}

// ── Flagged Items ─────────────────────────────────────────────────────────────

export function FlagsPanel({ analysis }: { analysis: FundAnalysis }) {
  const { flagged_items, manual_overrides } = analysis.document_metadata

  if (flagged_items.length === 0 && manual_overrides.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35 }}
      className="panel p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-data-flag" />
        <h2 className="font-display text-sm font-600 text-text-primary uppercase tracking-widest">
          Analyst Notes
        </h2>
      </div>
      <div className="accent-line mb-4" style={{ background: 'linear-gradient(90deg, transparent, rgba(245,166,35,0.4) 20%, rgba(245,166,35,0.4) 80%, transparent)' }} />

      {flagged_items.length > 0 && (
        <div className="space-y-2.5 mb-4">
          <p className="text-label text-text-label uppercase tracking-widest text-[10px] mb-2">
            Flagged Provisions
          </p>
          {flagged_items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flag-item"
            >
              {item}
            </motion.div>
          ))}
        </div>
      )}

      {manual_overrides.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-label text-text-label uppercase tracking-widest text-[10px] mb-2">
            Manual Overrides ({manual_overrides.length})
          </p>
          {manual_overrides.map((override, i) => (
            <div key={i} className="flex items-center gap-2 text-xs font-mono text-text-secondary">
              <span className="w-2 h-2 rounded-full bg-data-override/60 shrink-0" />
              <span className="text-data-override">{override.field}</span>
              <span className="text-text-muted">→</span>
              <span>{String(override.override_value)}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
