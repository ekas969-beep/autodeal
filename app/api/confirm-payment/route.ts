import { NextResponse } from "next/server"
import {
  fetchStripeCheckoutSession,
  fulfillStripeCheckoutSession,
} from "@/lib/payments/fulfillment"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const { session_id } = (await request.json()) as { session_id?: string }

    if (!session_id) {
      return NextResponse.json({ error: "Missing Stripe session id." }, { status: 400 })
    }

    const session = await fetchStripeCheckoutSession(session_id)
    const result = await fulfillStripeCheckoutSession(session)

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not confirm payment." },
      { status: 500 }
    )
  }
}

