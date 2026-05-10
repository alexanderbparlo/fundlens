// ─────────────────────────────────────────────────────────────────────────────
// Request validation guards
//
// Shared limits and shape validators used by the API routes to reject
// oversized, malformed, or adversarial payloads before they reach the model.
// ─────────────────────────────────────────────────────────────────────────────

import type { FundAnalysis, ChatMessage } from '@/types'

// ── Limits ──────────────────────────────────────────────────────────────────

export const LIMITS = {
  // analyze
  MAX_DOCUMENTS: 5,
  MAX_USER_MESSAGE_CHARS: 5_000,
  MAX_ANALYZE_BODY_BYTES: 75 * 1024 * 1024, // ~75MB — headroom for 5 × 10MB PDFs base64-encoded
  // DOCX text extraction: cap decompressed output to prevent zip-bomb expansion.
  MAX_EXTRACTED_TEXT_CHARS: 2_000_000,
  // chat
  MAX_CHAT_MESSAGE_CHARS: 5_000,
  MAX_HISTORY_ITEMS: 100,
  MAX_CHAT_BODY_BYTES: 2 * 1024 * 1024, // 2MB — chat payloads are small
} as const

// ── Body-size guard ─────────────────────────────────────────────────────────

/**
 * Reject requests whose Content-Length exceeds `maxBytes`. Returns null if the
 * request is acceptable, or an error message if it should be rejected.
 * Note: Content-Length is advisory — the actual body may be streamed larger —
 * but Vercel and most proxies populate it for JSON requests.
 */
export function checkContentLength(
  request: Request,
  maxBytes: number
): string | null {
  const header = request.headers.get('content-length')
  if (!header) return null
  const length = Number.parseInt(header, 10)
  if (Number.isFinite(length) && length > maxBytes) {
    return `Request body exceeds ${Math.round(maxBytes / 1024 / 1024)}MB limit.`
  }
  return null
}

// ── Shape validators (no dep on Zod) ────────────────────────────────────────

/**
 * Defensive shape check on FundAnalysis received from the client. Validates
 * top-level key presence and types we rely on — not a full recursive schema
 * check, but enough to reject adversarial payloads before they're serialized
 * back into the Claude prompt.
 */
export function isValidAnalysisShape(x: unknown): x is FundAnalysis {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  const objectKeys = [
    'fund_profile',
    'fee_structure',
    'performance_metrics',
    'capital_activity',
    'liquidity_terms',
    'key_parties',
    'document_metadata',
  ]
  for (const k of objectKeys) {
    if (!o[k] || typeof o[k] !== 'object') return false
  }
  if (typeof o.chat_response !== 'string') return false
  const dm = o.document_metadata as Record<string, unknown>
  if (!Array.isArray(dm.manual_overrides)) return false
  if (!Array.isArray(dm.flagged_items)) return false
  if (!Array.isArray(dm.fields_not_found)) return false
  if (!Array.isArray(dm.documents_analyzed)) return false
  return true
}

/**
 * Validate a single chat-history item. Role must be 'user' or 'assistant' —
 * never 'system' (that would let a client inject system instructions).
 */
export function isValidChatMessage(x: unknown): x is ChatMessage {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  if (o.role !== 'user' && o.role !== 'assistant') return false
  if (typeof o.content !== 'string') return false
  return true
}
