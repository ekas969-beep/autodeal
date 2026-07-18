import { createHmac, timingSafeEqual } from "crypto"

export type StripeCheckoutSession = {
  id: string
  url: string | null
  amount_total: number | null
  currency: string | null
  payment_intent: string | null
  metadata?: Record<string, string>
}

type CheckoutSessionInput = {
  successUrl: string
  cancelUrl: string
  productName: string
  amountCents: number
  priceId?: string
  metadata: Record<string, string>
}

export async function createStripeCheckoutSession({
  successUrl,
  cancelUrl,
  productName,
  amountCents,
  priceId,
  metadata,
}: CheckoutSessionInput) {
  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY.")
  }

  const shouldUseSavedPrice = Boolean(priceId) && !secretKey.startsWith("sk_test_")

  const body = new URLSearchParams()
  body.set("mode", "payment")
  body.set("success_url", successUrl)
  body.set("cancel_url", cancelUrl)
  body.set("payment_method_types[0]", "card")
  body.set("line_items[0][quantity]", "1")

  if (shouldUseSavedPrice && priceId) {
    body.set("line_items[0][price]", priceId)
  } else {
    body.set("line_items[0][price_data][currency]", "eur")
    body.set("line_items[0][price_data][unit_amount]", String(amountCents))
    body.set("line_items[0][price_data][product_data][name]", productName)
  }

  Object.entries(metadata).forEach(([key, value]) => {
    body.set(`metadata[${key}]`, value)
    body.set(`payment_intent_data[metadata][${key}]`, value)
  })

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  })

  const data = (await response.json()) as StripeCheckoutSession & {
    error?: { message?: string }
  }

  if (!response.ok) {
    throw new Error(data.error?.message || "Stripe checkout failed.")
  }

  return data
}

export function verifyStripeWebhookSignature({
  payload,
  signatureHeader,
  webhookSecret,
}: {
  payload: string
  signatureHeader: string | null
  webhookSecret: string
}) {
  if (!signatureHeader) return false

  const parts = signatureHeader.split(",").reduce<Record<string, string[]>>(
    (acc, item) => {
      const [key, value] = item.split("=")
      if (!key || !value) return acc
      acc[key] = [...(acc[key] || []), value]
      return acc
    },
    {}
  )

  const timestamp = parts.t?.[0]
  const signatures = parts.v1 || []

  if (!timestamp || signatures.length === 0) return false

  const signedPayload = `${timestamp}.${payload}`
  const expected = createHmac("sha256", webhookSecret)
    .update(signedPayload, "utf8")
    .digest("hex")

  return signatures.some((signature) => {
    const actualBuffer = Buffer.from(signature, "hex")
    const expectedBuffer = Buffer.from(expected, "hex")

    return (
      actualBuffer.length === expectedBuffer.length &&
      timingSafeEqual(actualBuffer, expectedBuffer)
    )
  })
}


