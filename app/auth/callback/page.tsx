"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { finishAuthFromCurrentUrl } from "@/lib/auth-url"

export default function AuthCallbackPage() {
  const router = useRouter()
  const [message, setMessage] = useState("Finishing sign in...")

  useEffect(() => {
    async function finishSignIn() {
      const next = getSafeNextPath(sessionStorage.getItem("autodeal-auth-next"))
      const authResult = await finishAuthFromCurrentUrl(supabase)

      if (!authResult.ok) {
        sessionStorage.removeItem("autodeal-auth-next")
        router.replace(`/login?error=${encodeURIComponent(authResult.error)}`)
        return
      }

      if (!authResult.completed) {
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
