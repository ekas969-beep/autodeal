"use client"

import { useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"

type ErrorPayload = {
  level: "error"
  message: string
  stack?: string
  source?: string
  pathname?: string
  userAgent?: string
  metadata?: Record<string, unknown>
}

function limitText(value: unknown, limit: number) {
  if (value === null || value === undefined) return ""
  return String(value).slice(0, limit)
}

export default function ClientErrorReporter() {
  const tokenRef = useRef("")
  const recentRef = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    let mounted = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) tokenRef.current = data.session?.access_token || ""
      })
      .catch(() => {})

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    function shouldSend(payload: ErrorPayload) {
      const key = `${payload.message}|${payload.pathname || ""}`
      const now = Date.now()
      const last = recentRef.current.get(key) || 0

      if (now - last < 10000) return false

      recentRef.current.set(key, now)

      for (const [storedKey, timestamp] of recentRef.current) {
        if (now - timestamp > 60000) recentRef.current.delete(storedKey)
      }

      return true
    }

    function send(payload: ErrorPayload) {
      const finalPayload: ErrorPayload = {
        ...payload,
        pathname: payload.pathname || `${window.location.pathname}${window.location.search}`,
        userAgent: navigator.userAgent,
      }

      if (!finalPayload.message || !shouldSend(finalPayload)) return

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }

      if (tokenRef.current) {
        headers.Authorization = `Bearer ${tokenRef.current}`
      }

      fetch("/api/client-error", {
        method: "POST",
        headers,
        body: JSON.stringify(finalPayload),
        keepalive: true,
      }).catch(() => {})
    }

    function handleError(event: ErrorEvent) {
      send({
        level: "error",
        message: limitText(event.message || "Client error", 2000),
        stack: limitText(event.error?.stack, 8000),
        source: limitText(`${event.filename || ""}:${event.lineno || ""}:${event.colno || ""}`, 500),
        metadata: { type: "window.error" },
      })
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      const reason = event.reason

      send({
        level: "error",
        message: limitText(reason?.message || reason || "Unhandled promise rejection", 2000),
        stack: limitText(reason?.stack, 8000),
        metadata: { type: "unhandledrejection" },
      })
    }

    window.addEventListener("error", handleError)
    window.addEventListener("unhandledrejection", handleUnhandledRejection)

    return () => {
      window.removeEventListener("error", handleError)
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
    }
  }, [])

  return null
}
