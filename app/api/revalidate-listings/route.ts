import { NextResponse } from "next/server"
import { revalidatePublicListings } from "@/lib/listings-revalidation"

export async function POST() {
  revalidatePublicListings()

  return NextResponse.json({ ok: true })
}
