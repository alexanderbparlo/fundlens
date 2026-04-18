import type { Metadata } from 'next'
import { DM_Mono, DM_Sans, Syne } from 'next/font/google'
import './globals.css'

// Display font — Syne: sharp, geometric, premium fintech feel
const fontDisplay = Syne({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700', '800'],
})

// Body font — DM Sans: clean, readable, modern
const fontBody = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['300', '400', '500', '600'],
})

// Mono font — DM Mono: crisp, technical, data-forward
const fontMono = DM_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['300', '400', '500'],
})

export const metadata: Metadata = {
  title: 'FundLens — Alternative Asset Intelligence',
  description:
    'AI-powered fund document analysis for alternative asset professionals. Powered by Claude Opus 4.7.',
  keywords: ['fund analysis', 'alternative assets', 'hedge fund', 'private equity', 'AI'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`
          ${fontDisplay.variable}
          ${fontBody.variable}
          ${fontMono.variable}
          font-body
          bg-surface-950
          text-text-primary
          antialiased
          min-h-screen
        `}
      >
        {children}
      </body>
    </html>
  )
}
