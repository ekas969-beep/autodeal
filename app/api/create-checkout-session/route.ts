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
    const origin = new URL(request.url).origin
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
        priceId: PREMIUM_BOOST.stripePriceId,
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
          amount_cents: PREMIUM_BOOST.priceCents,
          amount: PREMIUM_BOOST.priceCents,
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
      const pack = DEALER_PACKS[body.plan_key as DealerPackKey]

      if (!pack) {
        return NextResponse.json({ error: "Invalid dealer pack." }, { status: 400 })
      }

      const session = await createStripeCheckoutSession({
        successUrl: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/payment/cancelled`,
        productName: `AutoDeal.ie Dealer ${pack.name} Pack`,
        amountCents: pack.priceCents,
        priceId: pack.stripePriceId,
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
          amount_cents: pack.priceCents,
          amount: pack.priceCents,
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








