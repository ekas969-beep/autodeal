import { NextResponse } from "next/server"
import { createSupabaseAdmin } from "@/lib/supabase-admin"

type ProfileRow = {
  id: string
  email: string | null
  display_name: string | null
  avatar_url: string | null
  seller_type: string | null
  phone: string | null
  about_me: string | null
  credits_balance: number | null
  vip_listing_count: number | null
  plan_type: string | null
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || ""
    const token = authHeader.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json({ error: "Please log in first." }, { status: 401 })
    }

    const supabaseAdmin = createSupabaseAdmin()
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json({ error: "Please log in first." }, { status: 401 })
    }

    const email = user.email || null
    const metadata = user.user_metadata || {}
    const fallbackName =
      readMetadataString(metadata, "display_name") ||
      readMetadataString(metadata, "full_name") ||
      readMetadataString(metadata, "name") ||
      "Seller"

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select(
        "id,email,display_name,avatar_url,seller_type,phone,about_me,credits_balance,vip_listing_count,plan_type"
      )
      .eq("id", user.id)
      .maybeSingle<ProfileRow>()

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    const currentCredits = Number(profile?.credits_balance || 0)
    const legacyCredits = Number(profile?.vip_listing_count || 0)
    const creditsBalance = Math.max(currentCredits, legacyCredits)

    const profilePatch = {
      id: user.id,
      email,
      display_name: profile?.display_name || fallbackName,
      avatar_url:
        profile?.avatar_url ||
        readMetadataString(metadata, "avatar_url") ||
        readMetadataString(metadata, "picture") ||
        null,
      seller_type: profile?.seller_type || "Private Seller",
      phone: profile?.phone || "",
      about_me: profile?.about_me || "",
      credits_balance: creditsBalance,
      vip_listing_count: Math.max(legacyCredits, creditsBalance),
      plan_type: profile?.plan_type || "free",
      updated_at: new Date().toISOString(),
    }

    const { data: syncedProfile, error: upsertError } = await supabaseAdmin
      .from("profiles")
      .upsert(profilePatch, { onConflict: "id" })
      .select(
        "display_name, avatar_url, phone, about_me, seller_type, vip_listing_count, plan_type, credits_balance"
      )
      .single()

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, profile: syncedProfile })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not sync account." },
      { status: 500 }
    )
  }
}

function readMetadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key]
  return typeof value === "string" && value.trim() ? value.trim() : ""
}
