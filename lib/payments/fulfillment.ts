import { activePremiumListingFields } from "@/config/plans"
import { revalidatePublicListings } from "@/lib/listings-revalidation"
import { createSupabaseAdmin } from "@/lib/supabase-admin"
import type { StripeCheckoutSession } from "@/lib/payments/stripe"

export type PaymentFulfillmentResult = {
  paid: boolean
  status: string
  paymentType?: string
  next?: string
}

type PaymentSession = StripeCheckoutSession & {
  payment_status?: string
  status?: string
}

export async function fetchStripeCheckoutSession(sessionId: string) {
  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY.")
  }

  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
    },
  })

  const session = (await response.json()) as PaymentSession & {
    error?: { message?: string }
  }

  if (!response.ok) {
    throw new Error(session.error?.message || "Could not check Stripe payment.")
  }

  return session
}

export async function fulfillStripeCheckoutSession(session: PaymentSession) {
  const metadata = session.metadata || {}
  const userId = metadata.user_id
  const listingId = metadata.listing_id || null
  const paymentType = metadata.payment_type
  const planKey = metadata.plan_key
  const credits = Number(metadata.credits || 0)

  if (!userId || !paymentType || !planKey) {
    throw new Error("Missing Stripe payment metadata.")
  }

  const paymentStatus = session.payment_status || session.status || "unknown"

  if (session.payment_status !== "paid") {
    return {
      paid: false,
      status: paymentStatus,
      paymentType,
    } satisfies PaymentFulfillmentResult
  }

  const supabaseAdmin = createSupabaseAdmin()

  const { data: existingPayment } = await supabaseAdmin
    .from("payments")
    .select("id, status")
    .eq("stripe_session_id", session.id)
    .maybeSingle()

  const wasAlreadyPaid = existingPayment?.status === "paid"
  let paymentId = existingPayment?.id as string | undefined
  let transitionedToPaid = !wasAlreadyPaid

  const paymentFields = {
    user_id: userId,
    listing_id: listingId,
    stripe_payment_intent_id: session.payment_intent || null,
    payment_type: paymentType,
    plan_key: planKey,
    amount: (session.amount_total || 0) / 100,
    amount_cents: session.amount_total || 0,
    currency: session.currency || "eur",
    status: "paid",
    credits_purchased: paymentType === "dealer_credit_pack" ? credits : 0,
    updated_at: new Date().toISOString(),
  }

  if (paymentId) {
    const { data: updatedPayment, error } = await supabaseAdmin
      .from("payments")
      .update(paymentFields)
      .eq("id", paymentId)
      .neq("status", "paid")
      .select("id")
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    transitionedToPaid = Boolean(updatedPayment)
  } else {
    const { data: insertedPayment, error } = await supabaseAdmin
      .from("payments")
      .insert({
        ...paymentFields,
        stripe_session_id: session.id,
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    paymentId = insertedPayment.id
    transitionedToPaid = true
  }

  if (paymentType === "premium_boost") {
    if (!listingId) {
      throw new Error("Missing listing_id.")
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
      throw new Error(error.message)
    }

    revalidatePublicListings()
  }

  if (paymentType === "dealer_credit_pack" && transitionedToPaid && paymentId) {
    const { error } = await supabaseAdmin.rpc("add_user_credits", {
      p_user_id: userId,
      p_credits: credits,
      p_payment_id: paymentId,
      p_description: `Purchased ${credits} dealer credits`,
    })

    if (error) {
      throw new Error(error.message)
    }
  }

  return {
    paid: true,
    status: "paid",
    paymentType,
  } satisfies PaymentFulfillmentResult
}
