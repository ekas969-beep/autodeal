"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function ListingViewCounter({
  listingId,
  initialViews,
}: {
  listingId: string
  initialViews: number
}) {
  const [views, setViews] = useState(initialViews)

  useEffect(() => {
    const storageKey = `autodeal-listing-viewed-${listingId}`
    const alreadyCounted = window.sessionStorage.getItem(storageKey)
    let cancelled = false

    const channel = supabase
      .channel(`listing-view-count-${listingId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "listings",
          filter: `id=eq.${listingId}`,
        },
        (payload) => {
          const nextViews = Number(payload.new?.view_count || 0)

          if (Number.isFinite(nextViews)) {
            setViews(nextViews)
          }
        }
      )
      .subscribe()

    if (alreadyCounted) {
      return () => {
        cancelled = true
        supabase.removeChannel(channel)
      }
    }

    window.sessionStorage.setItem(storageKey, "1")

    fetch("/api/listing-view", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ listingId }),
    })
      .then((response) => response.json())
      .then((result) => {
        if (cancelled) return

        if (typeof result?.viewCount === "number") {
          setViews(result.viewCount)
        } else {
          setViews((current) => current + 1)
        }
      })
      .catch(() => {
        if (cancelled) return

        setViews((current) => current + 1)
      })

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [listingId])

  return <>{views.toLocaleString("en-IE")} views</>
}
