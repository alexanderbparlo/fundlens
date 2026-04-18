// ─────────────────────────────────────────────────────────────────────────────
// FundLens Core Types
// These types mirror the JSON schema returned by Opus 4.7 exactly.
// Any change to the system prompt schema must be reflected here.
// ─────────────────────────────────────────────────────────────────────────────

export interface FundProfile {
  name: string
  type: FundType | ''
  vintage_year: number | null
  domicile: string
  general_partner: string
  investment_manager: string
  target_size: number | null
  hard_cap: number | null
  currency: string
  strategy: string
  investment_period: string
  fund_term: string
}

export type FundType =
  | 'Hedge Fund'
  | 'Private Equity'
  | 'Venture Capital'
  | 'Real Estate'
  | 'Credit'
  | 'Infrastructure'
  | 'Fund of Funds'
  | 'Other'

export type ExtractionConfidence = 'High' | 'Medium' | 'Low' | ''

export type WaterfallType =
  | 'Deal-by-deal (American)'
  | 'Whole-fund (European)'
  | 'Hybrid'
  | 'Not specified'
  | ''

export interface FeeStructure {
  management_fee_rate: number | null      // as decimal e.g. 0.02 = 2%
  management_fee_basis: string
  management_fee_step_down: string
  carried_interest_rate: number | null    // as decimal e.g. 0.20 = 20%
  preferred_return: number | null         // as decimal e.g. 0.08 = 8%
  catch_up_rate: number | null
  catch_up_structure: string
  clawback_provisions: string
}

export interface PerformanceMetrics {
  irr_net: number | null      // as decimal e.g. 0.15 = 15%
  irr_gross: number | null
  dpi: number | null          // multiple e.g. 1.2
  rvpi: number | null
  tvpi: number | null
  moic: number | null
  as_of_date: string | null   // ISO date string
  note: string
}

export interface CapitalActivity {
  total_commitments: number | null
  called_capital: number | null
  uncalled_capital: number | null
  total_distributions: number | null
  recycling_permitted: boolean | null
  recycling_provisions: string
  distribution_waterfall_type: WaterfallType
}

export interface LiquidityTerms {
  lock_up_period: string
  redemption_frequency: string
  notice_period: string
  gates: string
  side_pockets: string
}

export interface KeyParties {
  auditor: string
  administrator: string
  prime_broker: string
  legal_counsel: string
}

export interface DocumentMetadata {
  documents_analyzed: string[]
  extraction_confidence: ExtractionConfidence
  fields_not_found: string[]
  flagged_items: string[]
  manual_overrides: ManualOverride[]
}

export interface ManualOverride {
  field: string         // dot notation: e.g. "fee_structure.carried_interest_rate"
  original_value: unknown
  override_value: unknown
  overridden_at: string // ISO timestamp
}

// ─────────────────────────────────────────────────────────────────────────────
// The complete schema returned by every Opus 4.7 call
// ─────────────────────────────────────────────────────────────────────────────

export interface FundAnalysis {
  fund_profile: FundProfile
  fee_structure: FeeStructure
  performance_metrics: PerformanceMetrics
  capital_activity: CapitalActivity
  liquidity_terms: LiquidityTerms
  key_parties: KeyParties
  document_metadata: DocumentMetadata
  chat_response: string
}

// ─────────────────────────────────────────────────────────────────────────────
// API request / response types
// ─────────────────────────────────────────────────────────────────────────────

export interface AnalyzeRequest {
  documents: UploadedDocument[]
  userMessage: string
}

export interface UploadedDocument {
  name: string
  type: string          // MIME type
  data: string          // base64 encoded
}

export interface ChatRequest {
  message: string
  currentAnalysis: FundAnalysis
  conversationHistory: ChatMessage[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Library types
// ─────────────────────────────────────────────────────────────────────────────

export interface LibraryTerm {
  id: string
  term: string
  definition: string
  category: LibraryCategory
  source: 'built-in' | 'user-added'
  added_at: string
}

export type LibraryCategory =
  | 'Core Metrics'
  | 'Fee Structure'
  | 'Capital Activity'
  | 'Fund Structure'
  | 'Liquidity'
  | 'Legal'
  | 'Other'

// ─────────────────────────────────────────────────────────────────────────────
// UI state types
// ─────────────────────────────────────────────────────────────────────────────

export type AppState =
  | 'idle'          // No document uploaded
  | 'uploading'     // File being processed client-side
  | 'analyzing'     // API call in progress
  | 'ready'         // Analysis complete, dashboard visible
  | 'error'         // Something went wrong

export interface UIState {
  appState: AppState
  analysis: FundAnalysis | null
  conversationHistory: ChatMessage[]
  isChatOpen: boolean
  error: string | null
}
