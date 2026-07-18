"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { supabase } from "@/lib/supabase"

export default function MessageSellerButton({
  listingId,
  sellerId,
  sellerName,
}: {
  listingId: string
  sellerId: string
  sellerName: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function startConversation() {
    setLoading(true)
    setError("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/login")
      return
    }

    if (user.id === sellerId) {
      setError("You cannot message yourself on your own listing.")
      setLoading(false)
      return
    }

    const { data: existingConversation, error: existingError } = await supabase
      .from("conversations")
      .select("id")
      .eq("listing_id", listingId)
      .eq("buyer_id", user.id)
      .eq("seller_id", sellerId)
      .maybeSingle()

    if (existingError) {
      setError(existingError.message)
      setLoading(false)
      return
    }

    if (existingConversation?.id) {
      router.push(`/messages?conversation=${existingConversation.id}`)
      return
    }

    const { data: newConversation, error: createError } = await supabase
      .from("conversations")
      .insert({
        listing_id: listingId,
        buyer_id: user.id,
        seller_id: sellerId,
        last_message: null,
        last_message_at: null,
      })
      .select("id")
      .single()

    if (createError) {
      setError(createError.message)
      setLoading(false)
      return
    }

    router.push(`/messages?conversation=${newConversation.id}`)
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={startConversation}
        disabled={loading}
        className="flex h-12 w-full items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-sm font-bold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Opening messages..." : `Message ${sellerName}`}
      </button>

      {error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
