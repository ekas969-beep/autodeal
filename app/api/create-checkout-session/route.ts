import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { DEALER_PACKS, PREMIUM_BOOST, type DealerPackKey } from "@/config/plans"
import { createStripeCheckoutSession } from "@/lib/payments/stripe"
import { createSupabaseAdmin } from "@/lib/supabase-admin"

type CheckoutRequest = {
  type: "premium_boost" | "dealer_credit_pack"
  listing_id?: string
  plan_key: "premium_boost" | DealerPackKey
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || ""
    const token = authHeader.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json({ error: "Please log in first." }, { status: 401 })
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
      error: userError,
    } = await userClient.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json({ error: "Please log in first." }, { status: 401 })
    }

    const body = (await request.json()) as CheckoutRequest
    const origin = getCheckoutOrigin(request)
    const supabaseAdmin = createSupabaseAdmin()

    if (body.type === "premium_boost") {
      if (body.plan_key !== PREMIUM_BOOST.key || !body.listing_id) {
        return NextResponse.json({ error: "Invalid Premium request." }, { status: 400 })
      }

      const { data: listing } = await supabaseAdmin
        .from("listings")
        .select("id, user_id")
        .eq("id", body.listing_id)
        .eq("user_id", user.id)
        .maybeSingle()

      if (!listing) {
        return NextResponse.json({ error: "Listing not found." }, { status: 404 })
      }

      const session = await createStripeCheckoutSession({
        successUrl: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/payment/cancelled`,
        productName: "AutoDeal.ie Premium",
        amountCents: PREMIUM_BOOST.priceCents,
        priceId: getStripePriceId("STRIPE_PRICE_PREMIUM_BOOST"),
        metadata: {
          user_id: user.id,
          listing_id: body.listing_id,
          payment_type: "premium_boost",
          plan_key: PREMIUM_BOOST.key,
        },
      })

      const { error: paymentInsertError } = await supabaseAdmin.from("payments").insert(
        {
          user_id: user.id,
          listing_id: body.listing_id,
          stripe_session_id: session.id,
          payment_type: "premium_boost",
          plan_key: PREMIUM_BOOST.key,
          amount: PREMIUM_BOOST.priceCents / 100,
          amount_cents: PREMIUM_BOOST.priceCents,
          currency: "eur",
          status: "pending",
          credits_purchased: 0,
        })

      if (paymentInsertError) {
        return NextResponse.json({ error: paymentInsertError.message }, { status: 500 })
      }

      return NextResponse.json({ url: session.url })
    }

    if (body.type === "dealer_credit_pack") {
      const pack =
        body.plan_key === PREMIUM_BOOST.key
          ? {
              key: PREMIUM_BOOST.key,
              name: "Premium Listing",
              credits: PREMIUM_BOOST.creditsRequired,
              priceCents: PREMIUM_BOOST.priceCents,
              stripePriceId: PREMIUM_BOOST.stripePriceId,
            }
          : DEALER_PACKS[body.plan_key as DealerPackKey]

      if (!pack) {
        return NextResponse.json({ error: "Invalid dealer pack." }, { status: 400 })
      }

      const session = await createStripeCheckoutSession({
        successUrl:
          pack.key === PREMIUM_BOOST.key
            ? `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}&next=/sell/new?plan=premium`
            : `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/payment/cancelled`,
        productName:
          pack.key === PREMIUM_BOOST.key
            ? "AutoDeal.ie Premium Listing Credit"
            : `AutoDeal.ie Dealer ${pack.name} Pack`,
        amountCents: pack.priceCents,
        priceId: getStripePriceId(
          pack.key === PREMIUM_BOOST.key
            ? "STRIPE_PRICE_PREMIUM_BOOST"
            : `STRIPE_PRICE_${pack.key.toUpperCase()}`
        ),
        metadata: {
          user_id: user.id,
          payment_type: "dealer_credit_pack",
          plan_key: pack.key,
          credits: String(pack.credits),
        },
      })

      const { error: packPaymentInsertError } = await supabaseAdmin.from("payments").insert(
        {
          user_id: user.id,
          stripe_session_id: session.id,
          payment_type: "dealer_credit_pack",
          plan_key: pack.key,
          amount: pack.priceCents / 100,
          amount_cents: pack.priceCents,
          currency: "eur",
          status: "pending",
          credits_purchased: pack.credits,
        })

      if (packPaymentInsertError) {
        return NextResponse.json({ error: packPaymentInsertError.message }, { status: 500 })
      }

      return NextResponse.json({ url: session.url })
    }

    return NextResponse.json({ error: "Invalid checkout type." }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout failed." },
      { status: 500 }
    )
  }
}

function getStripePriceId(envName: string) {
  return process.env[envName]
}

function getCheckoutOrigin(request: Request) {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "")
  }

  const forwardedHost = request.headers.get("x-forwarded-host")
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https"

  if (forwardedHost && !forwardedHost.startsWith("0.0.0.0")) {
    return `${forwardedProto}://${forwardedHost}`
  }

  const host = request.headers.get("host")

  if (host && !host.startsWith("0.0.0.0")) {
    return `${forwardedProto}://${host}`
  }

  return "https://autodeal.ie"
}








