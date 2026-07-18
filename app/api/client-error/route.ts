import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const allowedLevels = new Set(["error", "warning", "info"])

function cleanText(value: unknown, limit: number) {
  if (value === null || value === undefined) return ""
  return String(value).trim().slice(0, limit)
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ ok: false, error: "Error logging is not configured." }, { status: 500 })
  }

  const body = await request.json().catch(() => null)

  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid error payload." }, { status: 400 })
  }

  const message = cleanText(body.message, 2000)

  if (!message) {
    return NextResponse.json({ ok: false, error: "Error message is required." }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const auth = request.headers.get("authorization") || ""
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : ""
  let userId: string | null = null
  let userEmail: string | null = null

  if (token) {
    const { data } = await supabase.auth.getUser(token)
    userId = data.user?.id || null
    userEmail = data.user?.email || null
  }

  const metadata =
    body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? body.metadata
      : {}

  const level = allowedLevels.has(body.level) ? body.level : "error"

  const { error } = await supabase.from("site_errors").insert({
    level,
    message,
    stack: cleanText(body.stack, 8000) || null,
    source: cleanText(body.source, 500) || null,
    pathname: cleanText(body.pathname, 500) || null,
    user_agent: cleanText(body.userAgent, 500) || null,
    user_id: userId,
    user_email: userEmail,
    metadata,
  })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
