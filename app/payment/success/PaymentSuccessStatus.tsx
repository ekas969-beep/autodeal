"use client"

import { useEffect, useState } from "react"

type PaymentSuccessStatusProps = {
  sessionId: string
}

type ConfirmPaymentResponse = {
  paid?: boolean
  status?: string
  paymentType?: string
  error?: string
}

export function PaymentSuccessStatus({ sessionId }: PaymentSuccessStatusProps) {
  const [state, setState] = useState<"checking" | "confirmed" | "pending" | "error">("checking")
  const [message, setMessage] = useState("Confirming your payment...")

  useEffect(() => {
    let isMounted = true

    async function confirmPayment() {
      try {
        const response = await fetch("/api/confirm-payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ session_id: sessionId }),
        })

        const data = (await response.json()) as ConfirmPaymentResponse

        if (!isMounted) return

        if (!response.ok) {
          setState("error")
          setMessage(data.error || "Payment was successful, but automatic activation failed.")
          return
        }

        if (data.paid) {
          setState("confirmed")
          setMessage(
            data.paymentType === "dealer_credit_pack"
              ? "Your credits have been added to your account."
              : "Your Premium listing has been activated."
          )
          return
        }

        setState("pending")
        setMessage(`Stripe payment status: ${data.status || "pending"}.`)
      } catch {
        if (!isMounted) return
        setState("error")
        setMessage("Payment was successful, but automatic activation could not be checked.")
      }
    }

    confirmPayment()

    return () => {
      isMounted = false
    }
  }, [sessionId])

  const className =
    state === "confirmed"
      ? "bg-green-50 text-green-700"
      : state === "error"
        ? "bg-red-50 text-red-700"
        : "bg-blue-50 text-blue-700"

  return (
    <p className={`mt-5 rounded-xl px-4 py-3 text-sm font-semibold ${className}`}>
      {message}
    </p>
  )
}

