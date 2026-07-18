import { NextResponse } from "next/server"
import { activePremiumListingFields } from "@/config/plans"
import { verifyStripeWebhookSignature } from "@/lib/payments/stripe"
import { revalidatePublicListings } from "@/lib/listings-revalidation"
import { createSupabaseAdmin } from "@/lib/supabase-admin"

type CheckoutCompletedEvent = {
  type: "checkout.session.completed"
  data: {
    object: {
      id: string
      payment_intent?: string | null
      amount_total?: number | null
      currency?: string | null
      metadata?: Record<string, string>
    }
  }
}

export async function POST(request: Request) {
  const payload = await request.text()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET." }, { status: 500 })
  }

  const isValid = verifyStripeWebhookSignature({
    payload,
    signatureHeader: request.headers.get("stripe-signature"),
    webhookSecret,
  })

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 })
  }

  const event = JSON.parse(payload) as CheckoutCompletedEvent | { type: string }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true })
  }

  const session = (event as CheckoutCompletedEvent).data.object
  const metadata = session.metadata || {}
  const userId = metadata.user_id
  const listingId = metadata.listing_id || null
  const paymentType = metadata.payment_type
  const planKey = metadata.plan_key
  const credits = Number(metadata.credits || 0)

  if (!userId || !paymentType || !planKey) {
    return NextResponse.json({ error: "Missing metadata." }, { status: 400 })
  }

  const supabaseAdmin = createSupabaseAdmin()

  const { data: existingPayment } = await supabaseAdmin
    .from("payments")
    .select("id, status")
    .eq("stripe_session_id", session.id)
    .maybeSingle()

  const wasAlreadyPaid = existingPayment?.status === "paid"
  let paymentId = existingPayment?.id as string | undefined

  if (existingPayment?.id) {
    const { error: updatePaymentError } = await supabaseAdmin
      .from("payments")
      .update({
        user_id: userId,
        listing_id: listingId,
        stripe_payment_intent_id: session.payment_intent || null,
        payment_type: paymentType,
        plan_key: planKey,
        amount_cents: session.amount_total || 0,
        amount: session.amount_total || 0,
        currency: session.currency || "eur",
        status: "paid",
        credits_purchased: paymentType === "dealer_credit_pack" ? credits : 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingPayment.id)

    if (updatePaymentError) {
      return NextResponse.json({ error: updatePaymentError.message }, { status: 500 })
    }
  } else {
    const { data: insertedPayment, error: insertPaymentError } = await supabaseAdmin
      .from("payments")
      .insert({
        user_id: userId,
        listing_id: listingId,
        stripe_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent || null,
        payment_type: paymentType,
        plan_key: planKey,
        amount_cents: session.amount_total || 0,
        amount: session.amount_total || 0,
        currency: session.currency || "eur",
        status: "paid",
        credits_purchased: paymentType === "dealer_credit_pack" ? credits : 0,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (insertPaymentError) {
      return NextResponse.json({ error: insertPaymentError.message }, { status: 500 })
    }

    paymentId = insertedPayment.id
  }

  if (paymentType === "premium_boost") {
    if (!listingId) {
      return NextResponse.json({ error: "Missing listing_id." }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from("listings")
      .update({
        ...activePremiumListingFields(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", listingId)
      .eq("user_id", userId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    revalidatePublicListings()
  }

  if (paymentType === "dealer_credit_pack" && !wasAlreadyPaid && paymentId) {
    const { error } = await supabaseAdmin.rpc("add_user_credits", {
      p_user_id: userId,
      p_credits: credits,
      p_payment_id: paymentId,
      p_description: `Purchased ${credits} dealer credits`,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}

