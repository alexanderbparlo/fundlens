import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ── Tailwind class merger ────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Financial formatters ─────────────────────────────────────────────────────

/**
 * Format a decimal as a percentage string
 * e.g. 0.08 → "8.0%"  |  null → "—"
 */
export function formatPercent(value: number | null, decimals = 1): string {
  if (value === null || value === undefined) return '—'
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * Format a multiple (DPI, RVPI, TVPI, MOIC)
 * e.g. 1.75 → "1.75x"  |  null → "—"
 */
export function formatMultiple(value: number | null, decimals = 2): string {
  if (value === null || value === undefined) return '—'
  return `${value.toFixed(decimals)}x`
}

/**
 * Format a large currency value with abbreviation
 * e.g. 500000000 → "$500M"  |  1200000000 → "$1.2B"  |  null → "—"
 */
export function formatCurrency(
  value: number | null,
  currency = 'USD'
): string {
  if (value === null || value === undefined) return '—'

  const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$'

  if (value >= 1_000_000_000) {
    return `${symbol}${(value / 1_000_000_000).toFixed(1)}B`
  }
  if (value >= 1_000_000) {
    return `${symbol}${(value / 1_000_000).toFixed(0)}M`
  }
  if (value >= 1_000) {
    return `${symbol}${(value / 1_000).toFixed(0)}K`
  }
  return `${symbol}${value.toFixed(0)}`
}

/**
 * Format a date string for display
 * e.g. "2024-09-30" → "Sep 30, 2024"  |  null → "—"
 */
export function formatDate(value: string | null): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return value
  }
}

/**
 * Format a string field — return em dash if empty
 */
export function formatString(value: string | null | undefined): string {
  if (!value || value.trim() === '') return '—'
  return value
}

/**
 * Format a boolean field
 */
export function formatBoolean(value: boolean | null): string {
  if (value === null || value === undefined) return '—'
  return value ? 'Yes' : 'No'
}

// ── Document helpers ─────────────────────────────────────────────────────────

/**
 * Convert a File object to base64 string
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip the data URL prefix (e.g. "data:application/pdf;base64,")
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Validate that a file is an acceptable document type
 */
export function validateDocumentFile(file: File): {
  valid: boolean
  error?: string
} {
  const acceptedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ]
  const maxSizeMB = 10

  if (!acceptedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Only PDF and Word documents are supported.',
    }
  }

  if (file.size > maxSizeMB * 1024 * 1024) {
    return {
      valid: false,
      error: `File size must be under ${maxSizeMB}MB.`,
    }
  }

  return { valid: true }
}

// ── Schema helpers ───────────────────────────────────────────────────────────

/**
 * Safely parse JSON from Opus 4.7 response
 * Strips any accidental markdown fences before parsing
 */
export function parseAnalysisResponse(raw: string): unknown {
  // Strip markdown code fences if model accidentally included them
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  return JSON.parse(cleaned)
}

/**
 * Get a nested value from the analysis object using dot notation
 * e.g. getNestedValue(analysis, "fee_structure.carried_interest_rate")
 */
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key: string) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

/**
 * Set a nested value in the analysis object using dot notation (immutable)
 */
export function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  const keys = path.split('.')
  const result = { ...obj }
  let current = result

  for (let i = 0; i < keys.length - 1; i++) {
    current[keys[i]] = { ...(current[keys[i]] as Record<string, unknown>) }
    current = current[keys[i]] as Record<string, unknown>
  }

  current[keys[keys.length - 1]] = value
  return result
}

// ── Confidence color helper ──────────────────────────────────────────────────

export function confidenceColor(
  confidence: 'High' | 'Medium' | 'Low' | ''
): string {
  switch (confidence) {
    case 'High':   return 'text-data-positive'
    case 'Medium': return 'text-data-flag'
    case 'Low':    return 'text-data-negative'
    default:       return 'text-text-secondary'
  }
}
