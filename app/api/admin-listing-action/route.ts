import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const adminEmail = "ekas969@gmail.com"

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") || ""
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : ""

  if (!token) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { ok: false, error: "Admin settings are missing." },
      { status: 500 }
    )
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const { data: authUser, error: authError } = await supabase.auth.getUser(token)

  if (authError || (authUser.user?.email || "").toLowerCase() !== adminEmail) {
    return NextResponse.json({ ok: false, error: "Admin access only." }, { status: 403 })
  }

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
