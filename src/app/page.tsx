'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useFundLens } from '@/hooks/useFundLens'
import { UploadScreen } from '@/components/dashboard/UploadScreen'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import {
  PerformancePanel,
  FeePanel,
  CapitalPanel,
  ProfilePanel,
  LiquidityPanel,
  PartiesPanel,
  FlagsPanel,
} from '@/components/dashboard/Panels'
import { ChatInterface } from '@/components/chat/ChatInterface'

export default function Home() {
  const {
    appState,
    analysis,
    conversationHistory,
    isChatOpen,
    error,
    analyzeDocuments,
    sendChatMessage,
    overrideField,
    toggleChat,
    reset,
    clearError,
  } = useFundLens()

  const isReady = appState === 'ready' && analysis !== null

  return (
    <main className="relative min-h-screen">
      <AnimatePresence mode="wait">
        {/* ── Upload / idle state ────────────────────────────────────────── */}
        {!isReady && (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <UploadScreen
              onAnalyze={analyzeDocuments}
              isLoading={appState === 'uploading' || appState === 'analyzing'}
              appState={appState}
              error={error}
              onClearError={clearError}
            />
          </motion.div>
        )}

        {/* ── Dashboard state ────────────────────────────────────────────── */}
        {isReady && analysis && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="px-4 py-4 pb-24 max-w-screen-2xl mx-auto"
          >
            {/* Header */}
            <DashboardHeader
              analysis={analysis}
              onReset={reset}
            />

            {/* Main grid layout */}
            <div className="grid grid-cols-12 gap-4">

              {/* ── Left column: Performance + Capital ─────────────────── */}
              <div className="col-span-12 xl:col-span-7 space-y-4">
                <PerformancePanel
                  analysis={analysis}
                  onOverride={overrideField}
                />
                <CapitalPanel
                  analysis={analysis}
                  onOverride={overrideField}
                />
              </div>

              {/* ── Right column: Fees + Profile + Liquidity + Parties ──── */}
              <div className="col-span-12 xl:col-span-5 space-y-4">
                <FeePanel
                  analysis={analysis}
                  onOverride={overrideField}
                />
                <ProfilePanel
                  analysis={analysis}
                  onOverride={overrideField}
                />
                <LiquidityPanel
                  analysis={analysis}
                  onOverride={overrideField}
                />
                <PartiesPanel
                  analysis={analysis}
                  onOverride={overrideField}
                />
              </div>

              {/* ── Full-width: Flags and overrides ─────────────────────── */}
              <div className="col-span-12">
                <FlagsPanel analysis={analysis} />
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Chat — always rendered when analysis exists ──────────────────── */}
      <ChatInterface
        isOpen={isChatOpen}
        onToggle={toggleChat}
        onSendMessage={sendChatMessage}
        conversationHistory={conversationHistory}
        isAnalysisReady={isReady}
      />
    </main>
  )
}
