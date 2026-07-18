import { createHash } from "crypto"
import { NextResponse } from "next/server"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { isListingCurrentlyPublic } from "@/lib/listing-expiry"

const windowMs = 5 * 60 * 1000
const blockMs = 24 * 60 * 60 * 1000
const maxUniqueListings = 10
const adminEmail = "ekas969@gmail.com"

type MemoryEvent = {
  ipHash: string
  listingId: string
  createdAt: number
  blockedUntil: number | null
}

type ContactRevealEvent = {
  listing_id: string
  created_at: string
  blocked_until: string | null
}

const memoryEvents: MemoryEvent[] = []

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const listingId = cleanText(body?.listingId, 80)

  if (!listingId) {
    return NextResponse.json({ ok: false, error: "Listing id is required." }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ ok: false, error: "Contact reveal is not configured." }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const ip = getClientIp(request)
  const ipHash = hashIp(ip)
  const rateLimit = await checkContactRateLimit(supabase, ipHash, listingId)

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: `Too many seller contacts opened. Try again ${formatBlockedUntil(rateLimit.blockedUntil)}.`,
      },
      { status: 429 }
    )
  }

  const { data: listing, error } = await supabase
    .from("listings")
    .select("id,user_id,status,created_at,expires_at,premium_until,is_premium,plan_type,phone,contact_phone,email,contact_email,seller_type")
    .eq("id", listingId)
    .single()

  if (error || !listing || !isPublicListing(listing)) {
    return NextResponse.json({ ok: false, error: "Listing contact is unavailable." }, { status: 404 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name,email,phone,about_me,seller_type,avatar_url")
    .eq("id", listing.user_id)
    .maybeSingle()

  const sellerName = cleanText(profile?.display_name, 80) || "Seller"

  return NextResponse.json({
    ok: true,
    contact: {
      sellerId: listing.user_id,
      sellerName,
      sellerType: cleanText(listing.seller_type || profile?.seller_type, 80) || "Seller",
      avatarUrl: cleanText(profile?.avatar_url, 500) || null,
      aboutMe: cleanText(profile?.about_me, 2000),
      phone: cleanText(listing.phone || listing.contact_phone || profile?.phone, 80),
      email: cleanSellerEmail(listing.email || listing.contact_email),
    },
  })
}

async function checkContactRateLimit(
  supabase: SupabaseClient,
  ipHash: string,
  listingId: string
) {
  const now = Date.now()
  const sinceIso = new Date(now - windowMs).toISOString()

  const { data, error } = await supabase
    .from("contact_reveal_events")
    .select("listing_id,blocked_until,created_at")
    .eq("ip_hash", ipHash)
    .or(`created_at.gte.${sinceIso},blocked_until.gte.${new Date(now).toISOString()}`)
    .order("created_at", { ascending: false })
    .limit(200)

  if (error) {
    return checkMemoryRateLimit(ipHash, listingId)
  }

  const events = (data || []) as ContactRevealEvent[]
  const activeBlock = events.find((event) => {
    return event.blocked_until && new Date(event.blocked_until).getTime() > now
  })

  if (activeBlock?.blocked_until) {
    return { allowed: false, blockedUntil: new Date(activeBlock.blocked_until).getTime() }
  }

  const recentListings = new Set(
    events
      .filter((event) => new Date(event.created_at).getTime() >= now - windowMs)
      .map((event) => String(event.listing_id))
  )
  const isNewListingInWindow = !recentListings.has(listingId)

  if (isNewListingInWindow && recentListings.size >= maxUniqueListings) {
    const blockedUntil = new Date(now + blockMs)
    await supabase.from("contact_reveal_events").insert({
      ip_hash: ipHash,
      listing_id: listingId,
      blocked_until: blockedUntil.toISOString(),
    })

    return { allowed: false, blockedUntil: blockedUntil.getTime() }
  }

  await supabase.from("contact_reveal_events").insert({
    ip_hash: ipHash,
    listing_id: listingId,
  })

  return { allowed: true, blockedUntil: null }
}

function checkMemoryRateLimit(ipHash: string, listingId: string) {
  const now = Date.now()

  for (let index = memoryEvents.length - 1; index >= 0; index--) {
    const event = memoryEvents[index]
    if (now - event.createdAt > blockMs && !event.blockedUntil) {
      memoryEvents.splice(index, 1)
    }
  }

  const activeBlock = memoryEvents.find((event) => {
    return event.ipHash === ipHash && event.blockedUntil && event.blockedUntil > now
  })

  if (activeBlock?.blockedUntil) {
    return { allowed: false, blockedUntil: activeBlock.blockedUntil }
  }

  const recentListings = new Set(
    memoryEvents
      .filter((event) => event.ipHash === ipHash && now - event.createdAt <= windowMs)
      .map((event) => event.listingId)
  )
  const isNewListingInWindow = !recentListings.has(listingId)

  if (isNewListingInWindow && recentListings.size >= maxUniqueListings) {
    const blockedUntil = now + blockMs
    memoryEvents.push({ ipHash, listingId, createdAt: now, blockedUntil })
    return { allowed: false, blockedUntil }
  }

  memoryEvents.push({ ipHash, listingId, createdAt: now, blockedUntil: null })
  return { allowed: true, blockedUntil: null }
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")
  const firstForwardedIp = forwardedFor?.split(",")[0]?.trim()

  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    firstForwardedIp ||
    "unknown"
  )
}

function hashIp(ip: string) {
  const salt = process.env.CONTACT_REVEAL_HASH_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "autodeal"
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex")
}

function formatBlockedUntil(blockedUntil: number | null) {
  if (!blockedUntil) return "later"

  return new Intl.DateTimeFormat("en-IE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(blockedUntil))
}

function cleanText(value: unknown, limit: number) {
  return String(value || "").trim().slice(0, limit)
}

function cleanSellerEmail(value: unknown) {
  const email = cleanText(value, 200)
  return email.toLowerCase() === adminEmail ? "" : email
}

function isPublicListing(listing: { status?: string | null }) {
  return isListingCurrentlyPublic(listing)
}
