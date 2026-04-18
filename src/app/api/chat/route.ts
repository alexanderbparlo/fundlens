import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { FUNDLENS_SYSTEM_PROMPT, MODEL_CONFIG } from '@/lib/systemPrompt'
import { checkRateLimit, rateLimitHeaders, getClientIdentifier } from '@/lib/rateLimit'
import {
  LIMITS,
  checkContentLength,
  isValidAnalysisShape,
  isValidChatMessage,
} from '@/lib/requestGuards'
import { parseAnalysisResponse } from '@/lib/utils'
import type { ChatRequest, FundAnalysis, APIResponse } from '@/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  // ── Body-size guard ────────────────────────────────────────────────────────
  const sizeError = checkContentLength(request, LIMITS.MAX_CHAT_BODY_BYTES)
  if (sizeError) {
    return NextResponse.json<APIResponse<never>>(
      { success: false, error: sizeError },
      { status: 413 }
    )
  }

  // ── Rate limit check (per-client) ──────────────────────────────────────────
  const rateResult = await checkRateLimit('chat', getClientIdentifier(request))
  const headers = rateLimitHeaders(rateResult)

  if (!rateResult.success) {
    return NextResponse.json<APIResponse<never>>(
      {
        success: false,
        error: `Rate limit exceeded. You can send up to 60 messages per hour.`,
      },
      { status: 429, headers }
    )
  }

  // ── Parse request ──────────────────────────────────────────────────────────
  let body: ChatRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<APIResponse<never>>(
      { success: false, error: 'Invalid request body.' },
      { status: 400, headers }
    )
  }

  const { message, currentAnalysis, conversationHistory } = body

  if (typeof message !== 'string' || !message.trim()) {
    return NextResponse.json<APIResponse<never>>(
      { success: false, error: 'Message is required.' },
      { status: 400, headers }
    )
  }

  if (message.length > LIMITS.MAX_CHAT_MESSAGE_CHARS) {
    return NextResponse.json<APIResponse<never>>(
      {
        success: false,
        error: `Message too long (max ${LIMITS.MAX_CHAT_MESSAGE_CHARS} characters).`,
      },
      { status: 400, headers }
    )
  }

  if (!isValidAnalysisShape(currentAnalysis)) {
    return NextResponse.json<APIResponse<never>>(
      {
        success: false,
        error:
          'No analysis loaded or analysis payload is malformed. Please upload and analyze a document first.',
      },
      { status: 400, headers }
    )
  }

  if (!Array.isArray(conversationHistory)) {
    return NextResponse.json<APIResponse<never>>(
      { success: false, error: 'conversationHistory must be an array.' },
      { status: 400, headers }
    )
  }

  if (conversationHistory.length > LIMITS.MAX_HISTORY_ITEMS) {
    return NextResponse.json<APIResponse<never>>(
      {
        success: false,
        error: `Conversation history too long (max ${LIMITS.MAX_HISTORY_ITEMS} items).`,
      },
      { status: 400, headers }
    )
  }

  for (const msg of conversationHistory) {
    if (!isValidChatMessage(msg)) {
      return NextResponse.json<APIResponse<never>>(
        {
          success: false,
          error:
            'Invalid conversation history item: each item must have role "user" or "assistant" and string content.',
        },
        { status: 400, headers }
      )
    }
  }

  // ── Build conversation history for the API ─────────────────────────────────
  // We inject the current analysis state into the conversation so the model
  // always has the latest schema (including any manual overrides) as context.
  // Cap history at last 10 exchanges to manage token costs.

  const MAX_HISTORY_PAIRS = 10
  const recentHistory = conversationHistory.slice(-(MAX_HISTORY_PAIRS * 2))

  // Build the messages array
  // The first message always includes the current analysis state as context
  type ApiMessage = { role: 'user' | 'assistant'; content: string }
  const messages: ApiMessage[] = []

  // Inject current analysis state as the opening context
  const contextMessage = `Here is the current state of the fund analysis (including any manual overrides the user has made):

${JSON.stringify(currentAnalysis, null, 2)}

Please use this as your reference for all follow-up questions. When responding, return the complete schema with any updates in your JSON response, and put your natural language answer in the chat_response field.`

  messages.push({ role: 'user', content: contextMessage })
  messages.push({
    role: 'assistant',
    content:
      'Understood. I have the current analysis loaded and will use it as context for your follow-up questions.',
  })

  // Add conversation history (already shape-validated above)
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content })
  }

  // Add the new user message
  messages.push({ role: 'user', content: message.trim() })

  // ── Call Opus 4.7 ──────────────────────────────────────────────────────────
  try {
    const response = await anthropic.messages.create({
      model: MODEL_CONFIG.model,
      max_tokens: MODEL_CONFIG.max_tokens,
      thinking: MODEL_CONFIG.thinking,
      output_config: MODEL_CONFIG.output_config,
      system: FUNDLENS_SYSTEM_PROMPT,
      messages,
    })

    const textBlock = response.content.find((block) => block.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text content in API response')
    }

    const updatedAnalysis = parseAnalysisResponse(textBlock.text) as FundAnalysis

    // Preserve manual overrides — the model is instructed to return an empty array
    // for manual_overrides, but we always restore the application-managed overrides
    updatedAnalysis.document_metadata.manual_overrides =
      currentAnalysis.document_metadata.manual_overrides

    return NextResponse.json<APIResponse<FundAnalysis>>(
      { success: true, data: updatedAnalysis },
      { status: 200, headers }
    )
  } catch (err) {
    console.error('[/api/chat] Error:', err)
    const message = err instanceof Error ? err.message : 'An unexpected error occurred.'

    return NextResponse.json<APIResponse<never>>(
      { success: false, error: `Chat failed: ${message}` },
      { status: 500, headers }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  )
}
