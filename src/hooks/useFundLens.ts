'use client'

import { useState, useCallback } from 'react'
import { fileToBase64, validateDocumentFile } from '@/lib/utils'
import type {
  FundAnalysis,
  UIState,
  ChatMessage,
  UploadedDocument,
  ManualOverride,
} from '@/types'

const initialState: UIState = {
  appState:            'idle',
  analysis:            null,
  conversationHistory: [],
  isChatOpen:          false,
  error:               null,
}

// Client-side timeouts. Analysis involves Claude reading large documents with
// extended thinking — allow up to 2 minutes. Chat is lighter — cap at 60s.
const ANALYZE_TIMEOUT_MS = 120_000
const CHAT_TIMEOUT_MS = 60_000

export function useFundLens() {
  const [state, setState] = useState<UIState>(initialState)

  // ── Document analysis ────────────────────────────────────────────────────

  const analyzeDocuments = useCallback(
    async (files: File[], userMessage = '') => {
      // Validate files client-side before upload
      for (const file of files) {
        const validation = validateDocumentFile(file)
        if (!validation.valid) {
          setState((prev) => ({
            ...prev,
            appState: 'error',
            error: validation.error ?? 'Invalid file.',
          }))
          return
        }
      }

      setState((prev) => ({ ...prev, appState: 'uploading', error: null }))

      // Convert files to base64
      let documents: UploadedDocument[]
      try {
        documents = await Promise.all(
          files.map(async (file) => ({
            name: file.name,
            type: file.type,
            data: await fileToBase64(file),
          }))
        )
      } catch {
        setState((prev) => ({
          ...prev,
          appState: 'error',
          error: 'Failed to read file(s). Please try again.',
        }))
        return
      }

      setState((prev) => ({ ...prev, appState: 'analyzing' }))

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS)

      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documents, userMessage }),
          signal: controller.signal,
        })

        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error ?? `HTTP ${response.status}`)
        }

        const analysis: FundAnalysis = result.data

        // Add the initial analysis exchange to conversation history
        const initialMessages: ChatMessage[] = [
          {
            role: 'user',
            content:
              userMessage || 'Please analyze this fund document.',
            timestamp: new Date().toISOString(),
          },
          {
            role: 'assistant',
            content: analysis.chat_response,
            timestamp: new Date().toISOString(),
          },
        ]

        setState((prev) => ({
          ...prev,
          appState:            'ready',
          analysis,
          conversationHistory: initialMessages,
          isChatOpen:          true,  // Auto-open chat after first analysis
          error:               null,
        }))
      } catch (err) {
        const isAbort =
          err instanceof DOMException && err.name === 'AbortError'
        const message = isAbort
          ? 'Analysis timed out after 2 minutes. Please try again with a smaller or simpler document.'
          : err instanceof Error
            ? err.message
            : 'Analysis failed.'
        setState((prev) => ({
          ...prev,
          appState: 'error',
          error:    message,
        }))
      } finally {
        clearTimeout(timeoutId)
      }
    },
    []
  )

  // ── Chat ─────────────────────────────────────────────────────────────────

  const sendChatMessage = useCallback(
    async (message: string) => {
      if (!state.analysis || !message.trim()) return

      const userMessage: ChatMessage = {
        role:      'user',
        content:   message.trim(),
        timestamp: new Date().toISOString(),
      }

      // Optimistically add user message
      setState((prev) => ({
        ...prev,
        conversationHistory: [...prev.conversationHistory, userMessage],
      }))

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS)

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            currentAnalysis:     state.analysis,
            conversationHistory: state.conversationHistory,
          }),
          signal: controller.signal,
        })

        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error ?? `HTTP ${response.status}`)
        }

        const updatedAnalysis: FundAnalysis = result.data

        const assistantMessage: ChatMessage = {
          role:      'assistant',
          content:   updatedAnalysis.chat_response,
          timestamp: new Date().toISOString(),
        }

        setState((prev) => ({
          ...prev,
          analysis: updatedAnalysis,
          conversationHistory: [
            ...prev.conversationHistory,
            assistantMessage,
          ],
        }))
      } catch (err) {
        const isAbort =
          err instanceof DOMException && err.name === 'AbortError'
        const errorMessage = isAbort
          ? 'Request timed out after 60 seconds. Please try again.'
          : err instanceof Error
            ? err.message
            : 'Chat failed.'
        const errorChatMessage: ChatMessage = {
          role:      'assistant',
          content:   `Error: ${errorMessage}`,
          timestamp: new Date().toISOString(),
        }
        setState((prev) => ({
          ...prev,
          conversationHistory: [
            ...prev.conversationHistory,
            errorChatMessage,
          ],
        }))
      } finally {
        clearTimeout(timeoutId)
      }
    },
    [state.analysis, state.conversationHistory]
  )

  // ── Manual field overrides ───────────────────────────────────────────────

  const overrideField = useCallback(
    (fieldPath: string, newValue: unknown) => {
      if (!state.analysis) return

      const override: ManualOverride = {
        field:          fieldPath,
        original_value: state.analysis,  // stored for reference
        override_value: newValue,
        overridden_at:  new Date().toISOString(),
      }

      // Apply the override to the analysis object
      const keys = fieldPath.split('.')
      const updatedAnalysis = JSON.parse(
        JSON.stringify(state.analysis)
      ) as FundAnalysis

      // Navigate to the parent object and set the value
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let current: any = updatedAnalysis
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]]
      }
      current[keys[keys.length - 1]] = newValue

      // Record the override in document_metadata
      const existingOverrides =
        updatedAnalysis.document_metadata.manual_overrides.filter(
          (o) => o.field !== fieldPath
        )
      updatedAnalysis.document_metadata.manual_overrides = [
        ...existingOverrides,
        override,
      ]

      setState((prev) => ({ ...prev, analysis: updatedAnalysis }))
    },
    [state.analysis]
  )

  // ── UI controls ──────────────────────────────────────────────────────────

  const toggleChat = useCallback(() => {
    setState((prev) => ({ ...prev, isChatOpen: !prev.isChatOpen }))
  }, [])

  const reset = useCallback(() => {
    setState(initialState)
  }, [])

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null, appState: 'idle' }))
  }, [])

  return {
    // State
    appState:            state.appState,
    analysis:            state.analysis,
    conversationHistory: state.conversationHistory,
    isChatOpen:          state.isChatOpen,
    error:               state.error,

    // Actions
    analyzeDocuments,
    sendChatMessage,
    overrideField,
    toggleChat,
    reset,
    clearError,
  }
}
