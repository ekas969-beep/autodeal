import { NextResponse } from "next/server"
import { getListingExpiryDate, isListingExpired } from "@/lib/listing-expiry"
import { createSupabaseAdmin } from "@/lib/supabase-admin"

type ListingExpiryRow = {
  id: string
  created_at: string | null
  expires_at: string | null
  premium_until: string | null
  is_premium: boolean | null
  plan_type: string | null
  status: string | null
}

export async function POST() {
  try {
    const supabase = createSupabaseAdmin()
    const now = new Date()

    const { data, error } = await supabase
      .from("listings")
      .select("id,created_at,expires_at,premium_until,is_premium,plan_type,status")
      .eq("status", "active")
      .limit(1000)

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    const rows = (data || []) as ListingExpiryRow[]
    let expiredCount = 0
    let backfilledCount = 0

    await Promise.all(
      rows.map(async (listing) => {
        const expiresAt = getListingExpiryDate(listing)
        if (!expiresAt) return

        if (isListingExpired(listing, now)) {
          const { error: updateError } = await supabase
            .from("listings")
            .update({
              status: "expired",
              expires_at: expiresAt.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq("id", listing.id)

          if (!updateError) expiredCount += 1
          return
        }

        if (!listing.expires_at) {
          const { error: updateError } = await supabase
            .from("listings")
            .update({
              expires_at: expiresAt.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq("id", listing.id)

          if (!updateError) backfilledCount += 1
        }
      })
    )

    return NextResponse.json({ ok: true, expired: expiredCount, backfilled: backfilledCount })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not expire listings." },
      { status: 500 }
    )
  }
}
