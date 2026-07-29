"use client"

import { useEffect } from "react"
import { PREMIUM_BOOST } from "@/config/plans"
import { supabase } from "@/lib/supabase"

export default function PremiumCheckoutGuard() {
  useEffect(() => {
    async function handlePremiumClick(event: MouseEvent) {
      const target = event.target
      if (!(target instanceof Element)) return

      const action = target.closest("a,button")
      if (!(action instanceof HTMLElement)) return
      if ((action.textContent || "").trim() !== "Create Premium") return

      event.preventDefault()
      event.stopPropagation()

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        window.location.assign("/login")
        return
      }

      action.setAttribute("aria-disabled", "true")
      action.textContent = "Opening checkout..."

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: "dealer_credit_pack",
          plan_key: PREMIUM_BOOST.key,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.url) {
        alert(data?.error || "Could not start checkout.")
        action.removeAttribute("aria-disabled")
        action.textContent = "Create Premium"
        return
      }

      window.location.assign(data.url)
    }

    document.addEventListener("click", handlePremiumClick, true)

    return () => {
      document.removeEventListener("click", handlePremiumClick, true)
    }
  }, [])

  return null
}
