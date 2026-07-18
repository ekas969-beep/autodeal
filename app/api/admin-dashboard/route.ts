import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const adminEmail = "ekas969@gmail.com"

export async function GET(request: Request) {
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

  const [
    profilesCount,
    listingsCount,
    activeListingsCount,
    pendingListingsCount,
    premiumListingsCount,
    conversationsCount,
    messagesCount,
    paymentsCount,
    errorsCount,
    unresolvedErrorsCount,
    listings,
    profiles,
    payments,
    errors,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("listings").select("id", { count: "exact", head: true }),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "pending_payment"),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("is_premium", true),
    supabase.from("conversations").select("id", { count: "exact", head: true }),
    supabase.from("messages").select("id", { count: "exact", head: true }),
    supabase.from("payments").select("id", { count: "exact", head: true }),
    supabase.from("site_errors").select("id", { count: "exact", head: true }),
    supabase.from("site_errors").select("id", { count: "exact", head: true }).is("resolved_at", null),
    supabase
      .from("listings")
      .select("id,title,brand,model,location,price,status,is_premium,plan_type,premium_until,created_at,updated_at,user_id,email,contact_email")
      .order("created_at", { ascending: false })
      .range(0, 9999),
    supabase
      .from("profiles")
      .select("*")
      .limit(20),
    supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("site_errors")
      .select("id,level,message,stack,source,pathname,user_agent,user_id,user_email,metadata,created_at,resolved_at")
      .order("created_at", { ascending: false })
      .limit(30),
  ])

  const dashboardWarnings = [errorsCount, unresolvedErrorsCount, errors]
    .map((result) => result.error?.message)
    .filter(Boolean)
    .map((message) => `Error log could not be loaded: ${message}`)

  return NextResponse.json({
    ok: true,
    data: {
      stats: {
        profiles: profilesCount.count || 0,
        listings: listingsCount.count || 0,
        activeListings: activeListingsCount.count || 0,
        pendingListings: pendingListingsCount.count || 0,
        premiumListings: premiumListingsCount.count || 0,
        conversations: conversationsCount.count || 0,
        messages: messagesCount.count || 0,
        payments: paymentsCount.count || 0,
        errors: errorsCount.count || 0,
        unresolvedErrors: unresolvedErrorsCount.count || 0,
      },
      listings: listings.data || [],
      profiles: profiles.data || [],
      payments: payments.data || [],
      errors: errors.data || [],
      dashboardWarnings,
    },
  })
}
