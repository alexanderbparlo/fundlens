import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, rateLimitHeaders } from '@/lib/rateLimit'
import type { LibraryTerm, APIResponse } from '@/types'

// In a production app this would be a database.
// For the MVP, we serve the built-in library from the JSON file.
// User-added terms are stored in localStorage client-side and merged at render time.
// This keeps the architecture simple while the library feature is in iteration 1.

export async function GET(request: NextRequest) {
  const rateResult = await checkRateLimit('library')
  const headers = rateLimitHeaders(rateResult)

  if (!rateResult.success) {
    return NextResponse.json<APIResponse<never>>(
      { success: false, error: 'Rate limit exceeded.' },
      { status: 429, headers }
    )
  }

  try {
    // Dynamic import to avoid bundling the JSON at build time
    const library = await import('@/lib/library.json')
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')?.toLowerCase()

    let terms: LibraryTerm[] = library.terms as LibraryTerm[]

    if (category) {
      terms = terms.filter((t) => t.category === category)
    }

    if (search) {
      terms = terms.filter(
        (t) =>
          t.term.toLowerCase().includes(search) ||
          t.definition.toLowerCase().includes(search)
      )
    }

    return NextResponse.json<APIResponse<LibraryTerm[]>>(
      { success: true, data: terms },
      { status: 200, headers }
    )
  } catch (err) {
    console.error('[/api/library GET] Error:', err)
    return NextResponse.json<APIResponse<never>>(
      { success: false, error: 'Failed to load library.' },
      { status: 500, headers }
    )
  }
}

// POST — validate and accept a new term (user-added)
// In iteration 1 the client stores user terms in localStorage.
// This endpoint exists for future server-side persistence.
export async function POST(request: NextRequest) {
  const rateResult = await checkRateLimit('library')
  const headers = rateLimitHeaders(rateResult)

  if (!rateResult.success) {
    return NextResponse.json<APIResponse<never>>(
      { success: false, error: 'Rate limit exceeded.' },
      { status: 429, headers }
    )
  }

  try {
    const body = await request.json()
    const { term, definition, category } = body

    if (!term?.trim() || !definition?.trim()) {
      return NextResponse.json<APIResponse<never>>(
        { success: false, error: 'Term and definition are required.' },
        { status: 400, headers }
      )
    }

    const validCategories = [
      'Core Metrics',
      'Fee Structure',
      'Capital Activity',
      'Fund Structure',
      'Liquidity',
      'Legal',
      'Other',
    ]

    const newTerm: LibraryTerm = {
      id: term.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
      term: term.trim(),
      definition: definition.trim(),
      category: validCategories.includes(category) ? category : 'Other',
      source: 'user-added',
      added_at: new Date().toISOString().split('T')[0],
    }

    // Return the validated term for client-side storage
    return NextResponse.json<APIResponse<LibraryTerm>>(
      { success: true, data: newTerm },
      { status: 201, headers }
    )
  } catch (err) {
    console.error('[/api/library POST] Error:', err)
    return NextResponse.json<APIResponse<never>>(
      { success: false, error: 'Failed to process term.' },
      { status: 500, headers }
    )
  }
}
