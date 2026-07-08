/**
 * ai.ts — 9Router Local Gateway AI Client
 *
 * Every AI request in JanVoice AI goes through this module.
 * Connects exclusively to http://localhost:20128/v1 (or VITE_9ROUTER_BASE_URL).
 *
 *  - Model auto-detection via GET /v1/models (first available model)
 *  - No hardcoded model names
 *  - Authorization header only when VITE_9ROUTER_API_KEY is set
 *  - 15-second timeout with one automatic retry
 *  - Global connection status (🟢/🔴)
 */

import type { AIAnalysis, ComplaintCategory } from '../types'
import { COMPLAINT_CATEGORIES } from '../types'

// ==========================================
// Configuration
// ==========================================

const BASE_URL = (
  import.meta.env.VITE_9ROUTER_BASE_URL || 'http://localhost:20128/v1'
).replace(/\/+$/, '')

const API_KEY = import.meta.env.VITE_9ROUTER_API_KEY || ''
const ENV_MODEL = import.meta.env.VITE_9ROUTER_MODEL || ''

const shouldSendAuth = Boolean(API_KEY && API_KEY !== 'your_9router_api_key')

// ==========================================
// Types
// ==========================================

export type ConnectionStatus = 'connected' | 'disconnected'

export interface AIStatus {
  status: ConnectionStatus
  model: string | null
  error: string | null
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIOptions {
  signal?: AbortSignal
}

interface ModelInfo {
  id: string
  object?: string
  created?: number
  owned_by?: string
}

interface ModelsResponse {
  object: string
  data: ModelInfo[]
}

interface ChatCompletionsResponse {
  choices: Array<{ message: { content: string } }>
  model?: string
}

// ==========================================
// Global Connection Status
// ==========================================

let _status: ConnectionStatus = 'disconnected'
let _statusError: string | null = null
let _model: string | null = null
let _statusListeners: Array<(s: ConnectionStatus) => void> = []
let _connectionCheckPromise: Promise<AIStatus> | null = null

export function getStatus(): AIStatus {
  return { status: _status, model: _model, error: _statusError }
}

export function onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
  _statusListeners.push(listener)
  return () => {
    _statusListeners = _statusListeners.filter((l) => l !== listener)
  }
}

function setStatus(status: ConnectionStatus, model?: string | null, error?: string | null): void {
  _status = status
  if (model !== undefined) _model = model
  if (error !== undefined) _statusError = error
  for (const listener of _statusListeners) {
    try {
      listener(status)
    } catch {
      // silently ignore listener errors
    }
  }
}

/**
 * Check if the local 9Router Gateway is reachable.
 * On success: 🟢 Connected
 * On failure: 🔴 Disconnected with error message
 * Results are cached (one concurrent check at a time).
 */
export async function checkConnection(): Promise<AIStatus> {
  if (_connectionCheckPromise) return _connectionCheckPromise

  _connectionCheckPromise = (async (): Promise<AIStatus> => {
    try {
      const start = Date.now()
      const data = await fetchModels()
      const elapsed = Date.now() - start

      if (data && data.length > 0) {
        // Pick the first model
        const firstModel = data[0].id
        _model = firstModel
        setStatus('connected', firstModel, null)
        console.log(`[9Router] Connected (${elapsed}ms) — model: ${firstModel}`)
      } else {
        // No models returned but gateway responded
        _model = null
        setStatus('connected', null, null)
        console.warn('[9Router] Gateway responded but returned no models')
      }
    } catch (err) {
      _model = null
      const message =
        err instanceof DOMException && err.name === 'AbortError'
          ? 'Gateway request timed out (5s)'
          : err instanceof Error
            ? err.message
            : String(err)
      setStatus('disconnected', null, `Local AI Gateway is not running. (${message})`)
      console.warn('[9Router] Connection check failed:', message)
    } finally {
      _connectionCheckPromise = null
    }

    return { status: _status, model: _model, error: _statusError }
  })()

  return _connectionCheckPromise
}

// ==========================================
// Model auto-detection
// ==========================================

let resolvedModel: string | null = null
let modelResolvePromise: Promise<string> | null = null

/**
 * Resolves the model name for API requests.
 *
 * Priority:
 *  1. VITE_9ROUTER_MODEL (if set)
 *  2. Auto-detection via GET /v1/models (first available)
 *  3. Throws if no model can be determined (never hardcodes)
 */
async function resolveModel(): Promise<string> {
  if (resolvedModel) return resolvedModel
  if (modelResolvePromise) return modelResolvePromise

  modelResolvePromise = (async (): Promise<string> => {
    // 1. Env override
    if (ENV_MODEL) {
      resolvedModel = ENV_MODEL
      _model = ENV_MODEL
      return ENV_MODEL
    }

    // 2. Auto-detect from gateway
    const detected = await fetchModels()
    if (detected && detected.length > 0) {
      const first = detected[0].id
      resolvedModel = first
      _model = first
      console.log(`[9Router] Auto-detected model: ${first}`)
      return first
    }

    // 3. Nothing available — throw (never hardcode)
    throw new Error(
      'No model available. Ensure the local 9Router Gateway is running at ' +
        `${BASE_URL}. Set VITE_9ROUTER_MODEL to pin a model.`,
    )
  })()

  return modelResolvePromise
}

/**
 * Fetches available models from the gateway.
 * Returns null on failure (connection or parse error).
 */
async function fetchModels(): Promise<ModelInfo[] | null> {
  const url = `${BASE_URL}/models`
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (shouldSendAuth) {
    headers['Authorization'] = `Bearer ${API_KEY}`
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5_000)

  try {
    const response = await fetch(url, { headers, signal: controller.signal })
    clearTimeout(timeoutId)

    if (!response.ok) {
      console.warn(`[9Router] GET /v1/models returned ${response.status}`)
      return null
    }

    const data = (await response.json()) as ModelsResponse
    if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
      return data.data
    }
    return null
  } catch (err) {
    clearTimeout(timeoutId)
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.warn('[9Router] GET /v1/models timed out')
    }
    return null
  }
}

// ==========================================
// Core API client
// ==========================================

/**
 * Sends a chat completion request to the local 9Router Gateway.
 *
 *  - 15-second timeout
 *  - One automatic retry on transient failures (network, 5xx, 429)
 *  - Authorization sent only when API key is configured
 */
async function callChatCompletion(
  messages: ChatMessage[],
  options?: AIOptions,
): Promise<string> {
  const model = await resolveModel()

  const url = `${BASE_URL}/chat/completions`

  const body = JSON.stringify({
    model,
    messages,
    temperature: 0.7,
  })

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15_000)

  const signal = options?.signal
    ? combineAbortSignals(controller.signal, options.signal)
    : controller.signal

  try {
    const response = await attemptFetch(url, body, signal, 1)
    clearTimeout(timeoutId)
    const data = response as ChatCompletionsResponse
    const content = data.choices?.[0]?.message?.content ?? ''
    if (!content) {
      throw new Error('Gateway returned an empty response.')
    }
    return content
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * Fetch with one retry on transient failures.
 */
async function attemptFetch(
  url: string,
  body: string,
  signal: AbortSignal,
  retriesLeft: number,
): Promise<unknown> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (shouldSendAuth) {
    headers['Authorization'] = `Bearer ${API_KEY}`
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      const isTransient = response.status >= 500 || response.status === 429

      if (isTransient && retriesLeft > 0) {
        console.warn(
          `[9Router] Gateway returned ${response.status}, retrying... (${retriesLeft} left)`,
        )
        await sleep(1000)
        return attemptFetch(url, body, signal, retriesLeft - 1)
      }

      throw new Error(`9Router Gateway error ${response.status}: ${errorText}`)
    }

    return response.json() as Promise<unknown>
  } catch (error) {
    if (retriesLeft > 0 && isRetryableError(error)) {
      console.warn('[9Router] Network error, retrying...', error)
      await sleep(1000)
      return attemptFetch(url, body, signal, retriesLeft - 1)
    }
    throw error
  }
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return false
  }
  return true
}

function combineAbortSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController()
  for (const sig of signals) {
    if (sig.aborted) {
      controller.abort(sig.reason)
      return controller.signal
    }
    sig.addEventListener('abort', () => controller.abort(sig.reason), { once: true })
  }
  return controller.signal
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ==========================================
// Public AI Functions
// ==========================================

const ANALYSIS_PROMPT = `You are an AI assistant for constituency development planning in India.
Analyze the following citizen complaint and respond with ONLY valid JSON (no markdown) in this exact format:
{
  "language": "detected language name",
  "summary": "brief summary of the complaint",
  "category": "one of: ${COMPLAINT_CATEGORIES.join(', ')}",
  "priority": "High or Medium or Low",
  "sentiment": "Positive or Neutral or Negative",
  "recommendedAction": "specific actionable recommendation for authorities"
}

Complaint:
`

function parseAnalysis(text: string): AIAnalysis {
  const cleaned = text.replace(/```json\n?|```/g, '').trim()
  const parsed = JSON.parse(cleaned) as AIAnalysis

  if (!COMPLAINT_CATEGORIES.includes(parsed.category)) {
    parsed.category = 'Others'
  }

  return parsed
}

/**
 * Analyzes a complaint to extract category, priority, sentiment, and recommendations.
 */
export async function analyzeComplaint(
  title: string,
  description: string,
  location: string,
): Promise<AIAnalysis> {
  const prompt = `${ANALYSIS_PROMPT}Title: ${title}\nLocation: ${location}\nDescription: ${description}`
  const text = await callChatCompletion([{ role: 'user', content: prompt }])
  return parseAnalysis(text)
}

/**
 * Generates development recommendations based on complaint summaries.
 */
export async function generateRecommendations(
  complaintsSummary: string,
): Promise<string> {
  const prompt = `Based on the following constituency complaints data, provide 5 prioritized development recommendations for the MP. Format as a numbered list with clear action items:\n\n${complaintsSummary}`
  return await callChatCompletion([{ role: 'user', content: prompt }])
}

/**
 * Improves the grammar and professionalism of complaint text.
 */
export async function improveComplaintText(text: string): Promise<string> {
  const prompt = `You are a civic grievance writer. Rewrite this complaint to make it highly professional, grammatically correct, formal, and clear for government officials. Keep all original facts:\n\n${text}`
  return await callChatCompletion([{ role: 'user', content: prompt }])
}

/**
 * Translates complaint text into the specified language.
 */
export async function translateComplaintText(
  text: string,
  targetLang: string,
): Promise<string> {
  const prompt = `Translate this complaint text into ${targetLang}. Respond with ONLY the translated text:\n\n${text}`
  return await callChatCompletion([{ role: 'user', content: prompt }])
}

/**
 * Chat-specific function: sends a conversation history and returns the assistant reply.
 */
export async function generateChatResponse(
  messages: Array<{ sender: 'user' | 'ai'; text: string }>,
  options?: AIOptions,
): Promise<string> {
  const chatMessages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You are JanVoice AI, an assistant for constituency development planning in India. ' +
        'You analyze citizen complaints, provide insights on ward priorities, and help the MP ' +
        'make data-driven decisions. Keep responses concise and actionable.',
    },
    ...messages.map((m) => ({
      role: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.text,
    })),
  ]

  return await callChatCompletion(chatMessages, options)
}

// ==========================================
// Fallback analysis (kept for backward compatibility
// when the gateway is unreachable and the caller
// needs a graceful degradation)
// ==========================================

export function getFallbackAnalysis(
  description: string,
  category: ComplaintCategory,
): AIAnalysis {
  return {
    language: 'English',
    summary: description.slice(0, 150),
    category,
    priority: 'Medium',
    sentiment: 'Neutral',
    recommendedAction: 'Review and assign to the relevant department for assessment.',
  }
}