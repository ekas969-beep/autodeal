import { NextResponse } from "next/server"
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js"

const adminEmail = "ekas969@gmail.com"

type AdminResult =
  | { ok: true; user: User; supabase: SupabaseClient }
  | { ok: false; response: NextResponse }

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

  if (error || (data.user?.email || "").toLowerCase() !== adminEmail) {
    const email = data.user?.email || "unknown"
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

  return { ok: true, user: data.user, supabase }
}
