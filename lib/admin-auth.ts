import { NextResponse } from "next/server"
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js"

const adminEmail = "ekas969@gmail.com"

type AdminResult =
  | { ok: true; user: User; supabase: SupabaseClient }
  | { ok: false; response: NextResponse }

type TokenPayload = {
  sub?: string
  email?: string
  exp?: number
  role?: string
  aud?: string
}

export async function requireAdmin(request: Request): Promise<AdminResult> {
  const auth = request.headers.get("authorization") || ""
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : ""

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 }),
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "Admin settings are missing." }, { status: 500 }),
    }
  }

  const authSupabase = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const { data, error } = await authSupabase.auth.getUser(token)
  const fallbackUser = error?.message === "fetch failed" && isLocalDevelopment(request)
    ? getAdminUserFromToken(token)
    : null
  const user = data.user || fallbackUser

  if (!user || (user.email || "").toLowerCase() !== adminEmail) {
    const email = user?.email || "unknown"
    const reason = error?.message ? ` Auth error: ${error.message}` : ` Signed in email: ${email}.`

    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: `Admin access only.${reason}` }, { status: 403 }),
    }
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return { ok: true, user, supabase }
}

function getAdminUserFromToken(token: string): User | null {
  const payload = readTokenPayload(token)
  const email = payload?.email || ""
  const expiresAt = payload?.exp || 0
  const now = Math.floor(Date.now() / 1000)

  if (!payload?.sub || !expiresAt || expiresAt <= now) return null
  if (email.toLowerCase() !== adminEmail) return null

  return {
    id: payload.sub,
    aud: payload.aud || "authenticated",
    role: payload.role || "authenticated",
    email,
    app_metadata: {},
    user_metadata: {},
    created_at: "",
  } as User
}

function isLocalDevelopment(request: Request) {
  const hostname = new URL(request.url).hostname
  return process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1", "0.0.0.0"].includes(hostname)
}

function readTokenPayload(token: string): TokenPayload | null {
  const payload = token.split(".")[1]
  if (!payload) return null

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/")
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"))
  } catch {
    return null
  }
}
