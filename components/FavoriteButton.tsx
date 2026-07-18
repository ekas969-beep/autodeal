"use client"

import { useEffect, useState } from "react"
import type { MouseEvent } from "react"
import { supabase } from "@/lib/supabase"

const LOCAL_FAVORITES_KEY = "autodeal-favorite-listing-ids"
const FAVORITES_EVENT = "autodeal-favorites-changed"

type FavoriteButtonProps = {
  listingId: string
  className?: string
  label?: boolean
}

function readLocalFavorites() {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(LOCAL_FAVORITES_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function writeLocalFavorites(ids: string[]) {
  if (typeof window === "undefined") return

  const uniqueIds = Array.from(new Set(ids.map(String)))
  window.localStorage.setItem(LOCAL_FAVORITES_KEY, JSON.stringify(uniqueIds))
  window.dispatchEvent(new Event(FAVORITES_EVENT))
}

export default function FavoriteButton({
  listingId,
  className = "",
  label = false,
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const syncFromLocalStorage = () => {
      setIsFavorite(readLocalFavorites().includes(String(listingId)))
    }

    syncFromLocalStorage()
    window.addEventListener(FAVORITES_EVENT, syncFromLocalStorage)
    window.addEventListener("storage", syncFromLocalStorage)

    return () => {
      window.removeEventListener(FAVORITES_EVENT, syncFromLocalStorage)
      window.removeEventListener("storage", syncFromLocalStorage)
    }
  }, [listingId])

  async function toggleFavorite(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()

    if (saving) return

    const id = String(listingId)
    const nextIsFavorite = !isFavorite
    setIsFavorite(nextIsFavorite)

    const localFavorites = readLocalFavorites()
    const nextLocalFavorites = nextIsFavorite
      ? [...localFavorites, id]
      : localFavorites.filter((favoriteId) => favoriteId !== id)

    writeLocalFavorites(nextLocalFavorites)
    setSaving(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      if (nextIsFavorite) {
        await supabase
          .from("listing_favorites")
          .upsert(
            {
              user_id: user.id,
              listing_id: id,
            },
            { onConflict: "user_id,listing_id" }
          )

        return
      }

      await supabase
        .from("listing_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("listing_id", id)
    } catch {
      return
    } finally {
      setSaving(false)
    }
  }

  const icon = isFavorite ? "\u2665" : "\u2661"

  return (
    <button
      type="button"
      onClick={toggleFavorite}
      disabled={saving}
      aria-label={isFavorite ? "Remove from favorites" : "Save to favorites"}
      title={isFavorite ? "Remove from favorites" : "Save to favorites"}
      className={`inline-flex items-center justify-center gap-2 rounded-full border text-sm font-bold shadow-sm transition ${
        isFavorite
          ? "border-blue-200 bg-blue-600 text-white hover:bg-blue-700"
          : "border-gray-200 bg-white text-gray-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
      } ${saving ? "cursor-wait opacity-70" : ""} ${className}`}
    >
      <span className="text-lg leading-none">{icon}</span>
      {label && <span>{isFavorite ? "Saved" : "Save"}</span>}
    </button>
  )
}

export { FAVORITES_EVENT, LOCAL_FAVORITES_KEY }