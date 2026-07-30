import { NextResponse } from "next/server"
import { fulfillStripeCheckoutSession } from "@/lib/payments/fulfillment"
import { verifyStripeWebhookSignature } from "@/lib/payments/stripe"

type CheckoutCompletedEvent = {
  type: "checkout.session.completed"
  data: {
    object: {
      id: string
      payment_intent?: string | null
      amount_total?: number | null
      currency?: string | null
      metadata?: Record<string, string>
      payment_status?: string
      status?: string
    }
  }
}

export const runtime = "nodejs"

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
  await fulfillStripeCheckoutSession(session)

  return NextResponse.json({ received: true })
}

