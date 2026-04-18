# FundLens

**Alternative Asset Intelligence, powered by Claude Opus 4.7**

FundLens analyzes fund documents — LPAs, PPMs, capital account statements, side letters — and extracts structured data into an interactive dashboard. Built as a portfolio project to demonstrate applied AI in alternative asset operations.

---

## What It Does

- Upload PDF or Word fund documents (up to 10MB each)
- Claude Opus 4.7 reads and analyzes the documents using vision + reasoning
- Structured data is extracted: performance metrics (IRR, DPI, RVPI, TVPI), fee structure, capital activity, fund profile, liquidity terms, key parties
- A chat interface lets you ask follow-up questions about the documents
- Manual field overrides are tracked with a visual indicator
- Flagged provisions (unusual terms, non-market-standard clauses) are surfaced automatically

---

## Tech Stack

| Layer         | Technology                               |
|---------------|------------------------------------------|
| Framework     | Next.js 14 (App Router)                  |
| Language      | TypeScript                               |
| AI Model      | Claude Opus 4.7 via Anthropic API        |
| Styling       | Tailwind CSS + custom design tokens      |
| Animation     | Framer Motion                            |
| Rate Limiting | Upstash Redis (in-memory fallback)       |
| Deployment    | Vercel                                   |

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/your-username/fundlens.git
cd fundlens
npm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and add your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Get your key at [console.anthropic.com](https://console.anthropic.com).

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Rate Limits

By default, FundLens uses an in-memory rate limiter (resets on server restart):

| Route           | Limit       | Reason                                   |
|-----------------|-------------|------------------------------------------|
| `/api/analyze`  | 10/hour     | Opus 4.7 document calls are expensive    |
| `/api/chat`     | 60/hour     | Chat calls are lighter                   |
| `/api/library`  | 30/hour     | Library reads/writes                     |

For production, configure Upstash Redis for persistent rate limiting:

```
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

Free tier at [upstash.com](https://upstash.com).

---

## Deployment (Vercel)

```bash
npx vercel
```

Add `ANTHROPIC_API_KEY` as an environment variable in your Vercel project settings.

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── analyze/route.ts   — Document analysis (Opus 4.7 call)
│   │   ├── chat/route.ts      — Follow-up conversation
│   │   └── library/route.ts   — Concept library CRUD
│   ├── page.tsx               — Main app page
│   ├── layout.tsx             — Root layout with fonts
│   └── globals.css            — Global styles + design tokens
├── components/
│   ├── dashboard/
│   │   ├── UploadScreen.tsx   — Document upload interface
│   │   ├── DashboardHeader.tsx — Fund identity + status bar
│   │   ├── Panels.tsx         — All dashboard panel components
│   │   └── DataField.tsx      — Reusable field with override support
│   └── chat/
│       └── ChatInterface.tsx  — Floating chat bubble + panel
├── hooks/
│   └── useFundLens.ts         — Central application state hook
├── lib/
│   ├── systemPrompt.ts        — Opus 4.7 system prompt (single source of truth)
│   ├── rateLimit.ts           — Rate limiting (Upstash + in-memory fallback)
│   ├── utils.ts               — Financial formatters + helpers
│   └── library.json           — Built-in alternative asset concept library
└── types/
    └── index.ts               — TypeScript types (mirrors JSON schema exactly)
```

---

## Supported Document Types

| Document                        | Data Available                                  |
|---------------------------------|-------------------------------------------------|
| LPA / Partnership Agreement     | Fees, carry, waterfall, recycling, fund terms   |
| PPM / Offering Memorandum       | Strategy, target size, risk factors             |
| Capital Account Statement       | IRR, DPI, RVPI, TVPI, capital activity          |
| Side Letter                     | LP-specific modifications (flagged prominently) |
| Financial Statements            | NAV, performance data, capital activity         |
| Subscription Agreement          | Commitment data (limited fund-level data)       |

---

## Concept Library

FundLens includes 27 built-in alternative asset terms across 6 categories. The library is used to improve extraction accuracy and can be expanded via the API.

Categories: Core Metrics · Fee Structure · Capital Activity · Fund Structure · Liquidity · Legal

---

## Security Notes

- API key is stored as a server-side environment variable — never exposed to the browser
- Documents are sent directly to Anthropic's API and are not stored server-side
- Rate limiting prevents API cost overruns
- File type and size validation occurs on both client and server
- `.gitignore` excludes `.env.local` — never commit API keys

---

## Pricing Estimate

Claude Opus 4.7 pricing: $5/M input tokens · $25/M output tokens

A typical LPA analysis (100 pages ≈ 40,000 tokens input):
- Input cost:  ~$0.20
- Output cost: ~$0.10
- **Total: ~$0.30 per analysis**

---

## License

MIT — see [LICENSE](./LICENSE)

---

*Built with Claude Opus 4.7 · [Anthropic](https://anthropic.com)*
