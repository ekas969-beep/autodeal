"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

export default function EditProfilePage() {
  const [userId, setUserId] = useState("")
  const [email, setEmail] = useState("")
  const [displayName, setDisplayName] = useState("Seller")
  const [sellerType, setSellerType] = useState("Private Seller")
  const [phone, setPhone] = useState("")
  const [about, setAbout] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    async function loadProfile() {
      const { data: userData } = await supabase.auth.getUser()

      if (!userData.user) {
        window.location.href = "/login"
        return
      }

      const user = userData.user
      setUserId(user.id)
      setEmail(user.email || "")

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, seller_type, phone, about_me, avatar_url")
        .eq("id", user.id)
        .maybeSingle()

      if (profile) {
        setDisplayName(profile.display_name || "Seller")
        setSellerType(profile.seller_type || "Private Seller")
        setPhone(profile.phone || "")
        setAbout(profile.about_me || "")
        setAvatarUrl(profile.avatar_url || "")
      }

      setLoading(false)
    }

    loadProfile()
  }, [])

  async function saveProfile() {
    setSaving(true)
    setMessage("")

    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      email,
      display_name: displayName,
      seller_type: sellerType,
      phone,
      about_me: about,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    setMessage("Profile saved successfully.")
    setSaving(false)

    setTimeout(() => {
      window.location.href = "/account"
    }, 800)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-12 text-gray-900">
        Loading...
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-900">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-3">
          <Link
            href="/account"
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-100"
          >
            ← Back
          </Link>

          <span className="text-sm text-gray-500">
            Profile / Edit Profile
          </span>
        </div>

        <h1 className="mb-8 text-center text-4xl font-black">
          Edit Profile
        </h1>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-8 flex flex-col items-center">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-blue-100 bg-gray-100 text-5xl shadow-sm">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                "🚗"
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Display Name
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                placeholder="Seller"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Seller Type
              </label>
              <select
                value={sellerType}
                onChange={(e) => setSellerType(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >
                <option value="Private Seller">Private Seller</option>
                <option value="Dealership">Dealership</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Email Address
              </label>
              <input
                value={email}
                disabled
                className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-gray-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Phone Number
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                placeholder="e.g. 087 123 4567"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                About Me
              </label>
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                rows={5}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                placeholder="Tell buyers a little about yourself"
              />
            </div>

            {message && (
              <p className="rounded-xl bg-blue-50 p-3 text-sm font-medium text-blue-700">
                {message}
              </p>
            )}

            <button
              onClick={saveProfile}
              disabled={saving}
              className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
