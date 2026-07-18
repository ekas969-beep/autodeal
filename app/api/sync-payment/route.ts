import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { activePremiumListingFields, PREMIUM_BOOST } from "@/config/plans"
import { revalidatePublicListings } from "@/lib/listings-revalidation"
import { createSupabaseAdmin } from "@/lib/supabase-admin"

type StripeSession = {
  id: string
  payment_status?: string
  status?: string
  payment_intent?: string | null
  amount_total?: number | null
  currency?: string | null
  metadata?: Record<string, string>
}

type StripeSessionList = {
  data?: StripeSession[]
  error?: { message?: string }
}

type PaymentRow = {
  id?: string
  user_id: string
  listing_id: string
  stripe_session_id: string
  stripe_payment_intent_id?: string | null
  payment_type: string
  plan_key: string
  amount_cents: number
  currency: string
  status: string
  credits_purchased: number
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || ""
    const token = authHeader.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json({ error: "Please log in first." }, { status: 401 })
    }

    const { listing_id } = (await request.json()) as { listing_id?: string }

    if (!listing_id) {
      return NextResponse.json({ error: "Missing listing id." }, { status: 400 })
    }

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )

    const {
      data: { user },
    } = await userClient.auth.getUser(token)

    if (!user) {
      return NextResponse.json({ error: "Please log in first." }, { status: 401 })
    }

    const secretKey = process.env.STRIPE_SECRET_KEY

    if (!secretKey) {
      return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY." }, { status: 500 })
    }

    const supabaseAdmin = createSupabaseAdmin()

    const { data: listing } = await supabaseAdmin
      .from("listings")
      .select("id, user_id")
      .eq("id", listing_id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (!listing) {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 })
    }

    const { data: existingPayment } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("user_id", user.id)
      .eq("listing_id", listing_id)
      .eq("payment_type", "premium_boost")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    let stripeSession: StripeSession | null = null
    let payment = existingPayment as PaymentRow | null

    if (payment?.stripe_session_id) {
      stripeSession = await fetchStripeSession(secretKey, payment.stripe_session_id)
    } else {
      stripeSession = await findStripeSessionForListing(secretKey, user.id, listing_id)

      if (!stripeSession) {
        return NextResponse.json(
          { error: "No paid Stripe session found for this listing yet." },
          { status: 404 }
        )
      }

      const { data: insertedPayment, error: insertError } = await supabaseAdmin
        .from("payments")
        .insert(
          {
            user_id: user.id,
            listing_id,
            stripe_session_id: stripeSession.id,
            stripe_payment_intent_id: stripeSession.payment_intent || null,
            payment_type: "premium_boost",
            plan_key: PREMIUM_BOOST.key,
            amount_cents: stripeSession.amount_total || PREMIUM_BOOST.priceCents,
            amount: stripeSession.amount_total || PREMIUM_BOOST.priceCents,
            currency: stripeSession.currency || "eur",
            status: stripeSession.payment_status === "paid" ? "paid" : "pending",
            credits_purchased: 0,
            updated_at: new Date().toISOString(),
          })
        .select("*")
        .single()

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      payment = insertedPayment as PaymentRow
    }

    if (stripeSession.payment_status !== "paid") {
      return NextResponse.json({ paid: false, status: stripeSession.payment_status || "unpaid" })
    }

    if (payment?.id) {
      await supabaseAdmin
        .from("payments")
        .update({
          status: "paid",
          stripe_payment_intent_id: stripeSession.payment_intent || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id)
    }

    const { error: listingError } = await supabaseAdmin
      .from("listings")
      .update({
        ...activePremiumListingFields(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", listing_id)
      .eq("user_id", user.id)

    if (listingError) {
      return NextResponse.json({ error: listingError.message }, { status: 500 })
    }

    revalidatePublicListings()

    return NextResponse.json({ paid: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not sync payment." },
      { status: 500 }
    )
  }
}

async function fetchStripeSession(secretKey: string, sessionId: string) {
  const stripeResponse = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${sessionId}`,
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    }
  )

  const stripeSession = (await stripeResponse.json()) as StripeSession & {
    error?: { message?: string }
  }

  if (!stripeResponse.ok) {
    throw new Error(stripeSession.error?.message || "Could not check Stripe payment.")
  }

  return stripeSession
}

async function findStripeSessionForListing(
  secretKey: string,
  userId: string,
  listingId: string
) {
  const response = await fetch(
    "https://api.stripe.com/v1/checkout/sessions?limit=100",
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    }
  )

  const list = (await response.json()) as StripeSessionList

  if (!response.ok) {
    throw new Error(list.error?.message || "Could not list Stripe sessions.")
  }

  return (
    list.data?.find((session) => {
      const metadata = session.metadata || {}
      return (
        metadata.user_id === userId &&
        metadata.listing_id === listingId &&
        metadata.payment_type === "premium_boost"
      )
    }) || null
  )
}



