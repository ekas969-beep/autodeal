import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const adminEmail = "ekas969@gmail.com"

export async function DELETE(request: Request) {
  const auth = request.headers.get("authorization") || ""
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : ""

  if (!token) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ ok: false, error: "Admin settings are missing." }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const { data: authUser, error: authError } = await supabase.auth.getUser(token)

  if (authError || (authUser.user?.email || "").toLowerCase() !== adminEmail) {
    return NextResponse.json({ ok: false, error: "Admin access only." }, { status: 403 })
  }

  const { error } = await supabase
    .from("site_errors")
    .delete()
    .not("id", "is", null)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
