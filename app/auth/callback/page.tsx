"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AuthCallbackPage() {
  const router = useRouter()
  const [message, setMessage] = useState("Finishing sign in...")

  useEffect(() => {
    async function finishSignIn() {
      const searchParams = new URLSearchParams(window.location.search)
      const next = getSafeNextPath(sessionStorage.getItem("autodeal-auth-next"))
      const errorDescription =
        searchParams.get("error_description") ||
        searchParams.get("error") ||
        readHashParam("error_description") ||
        readHashParam("error")

      if (errorDescription) {
        sessionStorage.removeItem("autodeal-auth-next")
        router.replace(`/login?error=${encodeURIComponent(errorDescription)}`)
        return
      }

      const code = searchParams.get("code")

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
          sessionStorage.removeItem("autodeal-auth-next")
          setMessage("Could not finish Google sign in. Returning to login...")
          router.replace(`/login?error=${encodeURIComponent(error.message)}`)
          return
        }
      } else {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          sessionStorage.removeItem("autodeal-auth-next")
          setMessage("Could not find a Google session. Returning to login...")
          router.replace("/login?error=Google%20sign%20in%20did%20not%20complete")
          return
        }
      }

      sessionStorage.removeItem("autodeal-auth-next")
      router.replace(next)
      router.refresh()
    }

    finishSignIn()
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-950">
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-center shadow-sm">
        <p className="text-sm font-bold text-slate-700">{message}</p>
      </div>
    </main>
  )
}

function getSafeNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/account"
  }

  return next
}

function readHashParam(key: string) {
  if (typeof window === "undefined" || !window.location.hash) return ""

  return new URLSearchParams(window.location.hash.slice(1)).get(key) || ""
}
