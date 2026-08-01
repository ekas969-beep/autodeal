import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"

export async function POST(request: Request) {
  const admin = await requireAdmin(request)
  if (!admin.ok) return admin.response

  const { supabase } = admin

  const body = await request.json()
  const listingId = String(body.listingId || "")
  const action = String(body.action || "")

  if (!listingId) {
    return NextResponse.json({ ok: false, error: "Listing id is required." }, { status: 400 })
  }

  if (action === "delete") {
    const { error } = await supabase.from("listings").delete().eq("id", listingId)

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  }

  if (action === "premium") {
    const premiumUntil = new Date()
    premiumUntil.setDate(premiumUntil.getDate() + 60)

    const { error } = await supabase
      .from("listings")
      .update({
        status: "active",
        plan_type: "premium",
        is_premium: true,
        premium_badge: true,
        priority_search: true,
        homepage_featured: true,
        video_enabled: true,
        photo_limit: 20,
        premium_until: premiumUntil.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", listingId)

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  }

  if (!["active", "draft", "sold", "pending_payment"].includes(action)) {
    return NextResponse.json({ ok: false, error: "Unknown listing action." }, { status: 400 })
  }

  const { error } = await supabase
    .from("listings")
    .update({ status: action, updated_at: new Date().toISOString() })
    .eq("id", listingId)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
