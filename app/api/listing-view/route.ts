import { NextResponse } from "next/server"
import { createSupabaseAdmin } from "@/lib/supabase-admin"

export async function POST(request: Request) {
  try {
    const { listingId } = (await request.json()) as { listingId?: string }

    if (!listingId) {
      return NextResponse.json({ ok: false, error: "Missing listing id." }, { status: 400 })
    }

    const supabase = createSupabaseAdmin()
    const { data: incrementedCount, error: rpcError } = await supabase.rpc(
      "increment_listing_view_count",
      { p_listing_id: listingId }
    )

    if (!rpcError && typeof incrementedCount === "number") {
      return NextResponse.json({ ok: true, viewCount: incrementedCount })
    }

    const { data: listing, error: readError } = await supabase
      .from("listings")
      .select("id, view_count")
      .eq("id", listingId)
      .single()

    if (readError || !listing) {
      return NextResponse.json({ ok: false, error: "Listing not found." }, { status: 404 })
    }

    const viewCount = Number(listing.view_count || 0) + 1
    const { error: updateError } = await supabase
      .from("listings")
      .update({ view_count: viewCount })
      .eq("id", listingId)

    if (updateError) {
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, viewCount })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not count listing view."
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
