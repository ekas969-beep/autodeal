import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const resendApiKey = process.env.RESEND_API_KEY
    const fromEmail = "AutoDeal.ie <onboarding@resend.dev>"

    if (!resendApiKey) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        message: "RESEND_API_KEY is not set. Email notification skipped.",
      })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    let receiverEmail = cleanText(
      body.receiverEmail || body.recipientEmail || body.toEmail || ""
    )
    let receiverName = cleanText(body.receiverName || "there")
    let listingTitle = cleanText(body.listingTitle || "a vehicle listing")
    const receiverId = cleanText(body.receiverId)
    const listingId = cleanText(body.listingId)

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      if (receiverId) {
        const { data: receiverProfile } = await supabase
          .from("profiles")
          .select("email, display_name, full_name")
          .eq("id", receiverId)
          .maybeSingle()

        receiverEmail = receiverProfile?.email || receiverEmail
        receiverName =
          receiverProfile?.display_name ||
          receiverProfile?.full_name ||
          receiverName

        if (!receiverEmail) {
          const { data: authUser } = await supabase.auth.admin.getUserById(receiverId)
          receiverEmail = authUser?.user?.email || receiverEmail
        }
      }

      if (listingId) {
        const { data: listing } = await supabase
          .from("listings")
          .select("title")
          .eq("id", listingId)
          .maybeSingle()

        listingTitle = listing?.title || listingTitle
      }
    }

    if (!receiverEmail || !isValidEmail(receiverEmail)) {
      return NextResponse.json(
        {
          ok: false,
          skipped: true,
          error: "Receiver email not found. Add email to the recipient account or check SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 400 }
      )
    }

    const senderName = cleanText(body.senderName || "Someone")
    const messageText = cleanText(
      body.message || body.body || "You received a new message."
    )
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://autodeal.ie"
    const messagesUrl = `${siteUrl.replace(/\/$/, "")}/messages`

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: receiverEmail,
        subject: "You have a new message on AutoDeal.ie",
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:620px">
            <h2 style="margin:0 0 12px;color:#0f172a">You have a new message on AutoDeal.ie</h2>
            <p>Hi ${escapeHtml(receiverName)},</p>
            <p>${escapeHtml(senderName)} sent you a new message about <strong>${escapeHtml(listingTitle)}</strong>.</p>
            <div style="margin:20px 0;padding:16px;border-radius:12px;background:#f3f4f6;white-space:pre-wrap">
              ${escapeHtml(messageText)}
            </div>
            <p>
              <a href="${escapeHtml(messagesUrl)}" style="display:inline-block;border-radius:10px;background:#0b63ff;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px">
                Open Messages
              </a>
            </p>
            <p style="margin-top:24px;color:#64748b;font-size:13px">
              This notification was sent because your AutoDeal.ie account received a new message.
            </p>
          </div>
        `,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Message notification email failed:", errorText)

      return NextResponse.json(
        { ok: false, error: errorText || "Email notification could not be sent." },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Message notification error:", error)

    return NextResponse.json(
      {
        ok: false,
        error: "Email notification could not be sent.",
      },
      { status: 500 }
    )
  }
}

function cleanText(value: unknown) {
  return String(value || "").trim().slice(0, 5000)
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function escapeHtml(value: string) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}



