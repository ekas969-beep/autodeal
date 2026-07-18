import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const name = cleanText(body.name)
    const email = cleanText(body.email)
    const phone = cleanText(body.phone)
    const subject = cleanText(body.subject)
    const message = cleanText(body.message)
    const website = cleanText(body.website)

    if (website) {
      return NextResponse.json({ ok: true })
    }

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { ok: false, error: "Please fill in all required fields." },
        { status: 400 }
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid email address." },
        { status: 400 }
      )
    }

    const resendApiKey = process.env.RESEND_API_KEY
    const contactToEmail = process.env.CONTACT_TO_EMAIL
    const fromEmail = "AutoDeal.ie <onboarding@resend.dev>"

    if (!resendApiKey || !contactToEmail) {
      return NextResponse.json(
        {
          ok: false,
          error: "Email settings are missing. Please check RESEND_API_KEY and CONTACT_TO_EMAIL.",
        },
        { status: 500 }
      )
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: contactToEmail,
        reply_to: email,
        subject: `AutoDeal.ie contact: ${subject}`,
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
            <h2>New contact message from AutoDeal.ie</h2>
            <p><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p><strong>Email:</strong> ${escapeHtml(email)}</p>
            ${phone ? `<p><strong>Phone:</strong> ${escapeHtml(phone)}</p>` : ""}
            <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
            <div style="margin:20px 0;padding:16px;border-radius:10px;background:#f3f4f6;white-space:pre-wrap">
              ${escapeHtml(message)}
            </div>
          </div>
        `,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()

      console.error("Contact email failed:", errorText)

      return NextResponse.json(
        {
          ok: false,
          error: "Message could not be sent right now. Please try again later.",
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Contact form error:", error)

    return NextResponse.json(
      {
        ok: false,
        error: "Message could not be sent right now. Please try again later.",
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
