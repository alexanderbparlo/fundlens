import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

const filePath = process.argv[2]
if (!filePath) {
  console.error('Usage: node run_test.mjs <pdf-path>')
  process.exit(1)
}

const buf = readFileSync(filePath)
const body = {
  documents: [
    {
      name: basename(filePath),
      type: 'application/pdf',
      data: buf.toString('base64'),
    },
  ],
  userMessage: '',
}

const started = Date.now()
const res = await fetch('http://localhost:3000/api/analyze', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})
const elapsed = ((Date.now() - started) / 1000).toFixed(1)
const text = await res.text()
let json
try {
  json = JSON.parse(text)
} catch {
  console.log(`[${basename(filePath)}] HTTP ${res.status} (${elapsed}s) — non-JSON response:`)
  console.log(text.slice(0, 800))
  process.exit(res.ok ? 0 : 1)
}

console.log(`\n=== ${basename(filePath)} ===`)
console.log(`HTTP ${res.status} — ${elapsed}s`)
if (!json.success) {
  console.log(`error: ${json.error}`)
  process.exit(1)
}

const a = json.data
const pct = (v) => (v == null ? '(null)' : `${(v * 100).toFixed(2)}%`)
const num = (v) => (v == null ? '(null)' : String(v))
const str = (v) => (v == null || v === '' ? '(null)' : v)

console.log(`extraction_confidence: ${a.document_metadata?.extraction_confidence}`)
console.log(`name: ${str(a.fund_profile?.name)}`)
console.log(`type: ${str(a.fund_profile?.type)}`)
console.log(`vintage_year: ${num(a.fund_profile?.vintage_year)}`)
console.log(`strategy: ${str(a.fund_profile?.strategy)}`)
console.log(`management_fee_rate: ${pct(a.fee_structure?.management_fee_rate)}`)
console.log(`carried_interest_rate: ${pct(a.fee_structure?.carried_interest_rate)}`)
console.log(`IRR_net: ${pct(a.performance_metrics?.irr_net)}`)
console.log(`TVPI: ${num(a.performance_metrics?.tvpi)}`)
console.log(`flagged_items: ${(a.document_metadata?.flagged_items ?? []).length}`)
console.log(`chat_response: ${(a.chat_response ?? '').slice(0, 280)}${a.chat_response?.length > 280 ? '…' : ''}`)
