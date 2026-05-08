import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import mammoth from 'mammoth'
import { FUNDLENS_SYSTEM_BLOCKS, MODEL_CONFIG } from '@/lib/systemPrompt'
import { checkRateLimit, rateLimitHeaders, getClientIdentifier } from '@/lib/rateLimit'
import { LIMITS, checkContentLength } from '@/lib/requestGuards'
import { parseAnalysisResponse } from '@/lib/utils'
import type { AnalyzeRequest, FundAnalysis, APIResponse } from '@/types'

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const DOC_MIME = 'application/msword'
const PDF_MIME = 'application/pdf'

type DocumentContentBlock =
  | {
      type: 'document'
      source: { type: 'base64'; media_type: 'application/pdf'; data: string }
      title: string
    }
  | {
      type: 'document'
      source: { type: 'text'; media_type: 'text/plain'; data: string }
      title: string
    }

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  // ── Body-size guard (cheap reject before rate-limit or body parse) ─────────
  const sizeError = checkContentLength(request, LIMITS.MAX_ANALYZE_BODY_BYTES)
  if (sizeError) {
    return NextResponse.json<APIResponse<never>>(
      { success: false, error: sizeError },
      { status: 413 }
    )
  }

  // ── Rate limit check (per-client) ──────────────────────────────────────────
  const rateResult = await checkRateLimit('analyze', getClientIdentifier(request))
  const headers = rateLimitHeaders(rateResult)

  if (!rateResult.success) {
    return NextResponse.json<APIResponse<never>>(
      {
        success: false,
        error: `Rate limit exceeded. You can analyze up to 10 documents per hour. Resets at ${new Date(rateResult.reset).toLocaleTimeString()}.`,
      },
      { status: 429, headers }
    )
  }

  // ── Parse request body ─────────────────────────────────────────────────────
  let body: AnalyzeRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<APIResponse<never>>(
      { success: false, error: 'Invalid request body.' },
      { status: 400, headers }
    )
  }

  const { documents, userMessage } = body

  if (!documents || !Array.isArray(documents) || documents.length === 0) {
    return NextResponse.json<APIResponse<never>>(
      { success: false, error: 'At least one document is required.' },
      { status: 400, headers }
    )
  }

  if (documents.length > LIMITS.MAX_DOCUMENTS) {
    return NextResponse.json<APIResponse<never>>(
      {
        success: false,
        error: `At most ${LIMITS.MAX_DOCUMENTS} documents can be analyzed per request.`,
      },
      { status: 400, headers }
    )
  }

  if (userMessage != null && typeof userMessage !== 'string') {
    return NextResponse.json<APIResponse<never>>(
      { success: false, error: 'userMessage must be a string.' },
      { status: 400, headers }
    )
  }

  if (userMessage && userMessage.length > LIMITS.MAX_USER_MESSAGE_CHARS) {
    return NextResponse.json<APIResponse<never>>(
      {
        success: false,
        error: `Instruction too long (max ${LIMITS.MAX_USER_MESSAGE_CHARS} characters).`,
      },
      { status: 400, headers }
    )
  }

  // ── Security: validate document types server-side ──────────────────────────
  const allowedTypes = [PDF_MIME, DOCX_MIME, DOC_MIME]

  for (const doc of documents) {
    if (!allowedTypes.includes(doc.type)) {
      return NextResponse.json<APIResponse<never>>(
        {
          success: false,
          error: `Unsupported file type: ${doc.type}. Only PDF and Word documents are accepted.`,
        },
        { status: 400, headers }
      )
    }

    // Validate base64 data isn't empty
    if (!doc.data || doc.data.length < 100) {
      return NextResponse.json<APIResponse<never>>(
        { success: false, error: `Document "${doc.name}" appears to be empty or corrupt.` },
        { status: 400, headers }
      )
    }

    // Size guard: base64 string of 10MB binary ≈ 13.3M chars
    if (doc.data.length > 14_000_000) {
      return NextResponse.json<APIResponse<never>>(
        {
          success: false,
          error: `Document "${doc.name}" exceeds the 10MB size limit.`,
        },
        { status: 400, headers }
      )
    }
  }

  // ── Build the message content ──────────────────────────────────────────────
  // Anthropic's Base64 document source only accepts PDF. For Word documents we
  // extract the text server-side (mammoth for .docx) and send it as a plain-text
  // document source so the model still receives the document with a title.

  type ContentBlock = DocumentContentBlock | { type: 'text'; text: string }

  const content: ContentBlock[] = []

  for (const doc of documents) {
    if (doc.type === PDF_MIME) {
      content.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: doc.data },
        title: doc.name,
      })
    } else if (doc.type === DOCX_MIME) {
      try {
        const buffer = Buffer.from(doc.data, 'base64')
        const { value: extractedText } = await mammoth.extractRawText({ buffer })
        if (!extractedText.trim()) {
          return NextResponse.json<APIResponse<never>>(
            { success: false, error: `No readable text found in "${doc.name}".` },
            { status: 400, headers }
          )
        }
        content.push({
          type: 'document',
          source: { type: 'text', media_type: 'text/plain', data: extractedText },
          title: doc.name,
        })
      } catch (err) {
        return NextResponse.json<APIResponse<never>>(
          {
            success: false,
            error: `Failed to read Word document "${doc.name}": ${
              err instanceof Error ? err.message : 'unknown error'
            }`,
          },
          { status: 400, headers }
        )
      }
    } else {
      // Legacy .doc (binary Word 97-2003) has no reliable JS parser.
      return NextResponse.json<APIResponse<never>>(
        {
          success: false,
          error: `Legacy .doc files are not supported. Please save "${doc.name}" as .docx or PDF.`,
        },
        { status: 400, headers }
      )
    }
  }

  // Add the user's instruction
  const instruction = userMessage?.trim()
    ? userMessage
    : 'Please analyze the uploaded fund document(s) and extract all available data into the structured schema.'

  content.push({
    type: 'text',
    text: instruction,
  })

  // ── Call Opus 4.7 ──────────────────────────────────────────────────────────
  try {
    const response = await anthropic.messages.create({
      model: MODEL_CONFIG.model,
      max_tokens: MODEL_CONFIG.max_tokens,
      thinking: MODEL_CONFIG.thinking,
      output_config: MODEL_CONFIG.output_config,
      system: FUNDLENS_SYSTEM_BLOCKS,
      messages: [
        {
          role: 'user',
          content,
        },
      ],
    })

    // Extract the text content from the response
    const textBlock = response.content.find((block) => block.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text content in API response')
    }

    // Parse the JSON schema returned by the model
    const analysis = parseAnalysisResponse(textBlock.text) as FundAnalysis

    // Validate that the response has the expected top-level structure
    const requiredKeys = [
      'fund_profile',
      'fee_structure',
      'performance_metrics',
      'capital_activity',
      'liquidity_terms',
      'key_parties',
      'document_metadata',
      'chat_response',
    ]

    for (const key of requiredKeys) {
      if (!(key in analysis)) {
        throw new Error(`Missing required field in analysis response: ${key}`)
      }
    }

    return NextResponse.json<APIResponse<FundAnalysis>>(
      { success: true, data: analysis },
      { status: 200, headers }
    )
  } catch (err) {
    console.error('[/api/analyze] Error:', err)

    const message =
      err instanceof Error ? err.message : 'An unexpected error occurred.'

    // Distinguish API errors from parse errors for better debugging
    if (message.includes('JSON')) {
      return NextResponse.json<APIResponse<never>>(
        {
          success: false,
          error:
            'The model returned an unexpected response format. Please try again.',
        },
        { status: 502, headers }
      )
    }

    return NextResponse.json<APIResponse<never>>(
      { success: false, error: `Analysis failed: ${message}` },
      { status: 500, headers }
    )
  }
}

// Only POST is supported
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  )
}
