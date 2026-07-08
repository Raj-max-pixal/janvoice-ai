/**
 * useAIHealthCheck.ts — Automatic AI Gateway Health Check
 *
 * - Pings GET /v1/models every 30 seconds
 * - Displays 🟢 AI Connected or 🔴 AI Offline
 * - Never spams requests (cancels previous check if not resolved)
 * - Provides reconnection capability
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { checkConnection, getStatus, onStatusChange, type AIStatus } from '../services/ai'
import { logger } from '../lib/logger'

const HEALTH_CHECK_INTERVAL = 30_000 // 30 seconds

interface HealthCheckState {
  status: AIStatus
  isChecking: boolean
  lastChecked: Date | null
}

export function useAIHealthCheck() {
  const [state, setState] = useState<HealthCheckState>(() => ({
    status: getStatus(),
    isChecking: false,
    lastChecked: null,
  }))

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  const performCheck = useCallback(async () => {
    if (state.isChecking) return
    setState((prev) => ({ ...prev, isChecking: true }))
    try {
      const result = await checkConnection()
      if (mountedRef.current) {
        setState({
          status: result,
          isChecking: false,
          lastChecked: new Date(),
        })
      }
    } catch (error) {
      logger.error('useAIHealthCheck', 'Health check failed', error)
      if (mountedRef.current) {
      setState(() => ({
          status: { status: 'disconnected', model: null, error: 'Health check error' },
          isChecking: false,
          lastChecked: new Date(),
        }))
      }
    }
  }, [state.isChecking])

  // Subscribe to status changes from the service
  useEffect(() => {
    const unsub = onStatusChange((status) => {
      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          status: { status, model: prev.status.model, error: status === 'connected' ? null : prev.status.error },
        }))
      }
    })
    return unsub
  }, [])

  // Initial check and periodic polling
  useEffect(() => {
    mountedRef.current = true
    performCheck()

    intervalRef.current = setInterval(() => {
      performCheck()
    }, HEALTH_CHECK_INTERVAL)

    return () => {
      mountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const forceReconnect = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    await performCheck()
    intervalRef.current = setInterval(() => {
      performCheck()
    }, HEALTH_CHECK_INTERVAL)
  }, [performCheck])

  const isConnected = state.status.status === 'connected'

  return {
    isConnected,
    model: state.status.model,
    error: state.status.error,
    isChecking: state.isChecking,
    lastChecked: state.lastChecked,
    forceReconnect,
    statusIndicator: isConnected ? '🟢' : '🔴',
    statusText: isConnected ? 'AI Connected' : 'AI Offline',
  } as const
}