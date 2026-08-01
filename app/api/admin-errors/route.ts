import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"

export async function DELETE(request: Request) {
  const admin = await requireAdmin(request)
  if (!admin.ok) return admin.response

  const { supabase } = admin

  const { error } = await supabase
    .from("site_errors")
    .delete()
    .not("id", "is", null)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
