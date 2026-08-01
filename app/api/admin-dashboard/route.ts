import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"

export async function GET(request: Request) {
  const admin = await requireAdmin(request)
  if (!admin.ok) return admin.response

  const { supabase } = admin

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
