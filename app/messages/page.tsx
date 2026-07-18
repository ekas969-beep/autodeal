"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, type FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"

type Conversation = {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  last_message: string | null
  last_message_at: string | null
  created_at: string | null
  listing?: any
  otherUser?: any
  unreadCount?: number
}

type Message = {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  read_at: string | null
  created_at: string | null
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<MessagesLoading />}>
      <MessagesContent />
    </Suspense>
  )
}

function MessagesLoading() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <div className="h-8 w-40 rounded-lg bg-slate-200" />
        <div className="mt-6 h-96 rounded-2xl border border-slate-200 bg-white shadow-sm" />
      </div>
    </main>
  )
}

function MessagesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const messagesPanelRef = useRef<HTMLDivElement | null>(null)

  const [userId, setUserId] = useState("")
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [activeConversationId, setActiveConversationId] = useState("")
  const [messageText, setMessageText] = useState("")
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeConversationId) || null,
    [conversations, activeConversationId]
  )

  useEffect(() => {
    loadMessagesPage()
  }, [])

  useEffect(() => {
    if (!activeConversationId || !userId) return

    loadMessages(activeConversationId, userId)

    const channel = supabase
      .channel(`messages-${activeConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        async () => {
          await loadMessages(activeConversationId, userId)
          await loadConversations(userId, activeConversationId)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeConversationId, userId])

  useEffect(() => {
    const panel = messagesPanelRef.current
    if (!panel) return

    panel.scrollTo({ top: panel.scrollHeight, behavior: "smooth" })
  }, [messages])

  async function loadMessagesPage() {
    setLoading(true)
    setError("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/login")
      return
    }

    setUserId(user.id)

    const wantedConversation = searchParams.get("conversation") || ""
    await loadConversations(user.id, wantedConversation)

    setLoading(false)
  }

  async function loadConversations(currentUserId: string, preferredId = "") {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .or(`buyer_id.eq.${currentUserId},seller_id.eq.${currentUserId}`)
      .order("last_message_at", { ascending: false, nullsFirst: false })

    if (error) {
      setError(error.message)
      setConversations([])
      return
    }

    const baseConversations = data || []

    const conversationIds = baseConversations.map((item) => item.id)

    const listingIds = [
      ...new Set(baseConversations.map((item) => item.listing_id).filter(Boolean)),
    ]

    const otherUserIds = [
      ...new Set(
        baseConversations
          .map((item) =>
            item.buyer_id === currentUserId ? item.seller_id : item.buyer_id
          )
          .filter(Boolean)
      ),
    ]

    const { data: listingsData } =
      listingIds.length > 0
        ? await supabase
            .from("listings")
            .select("id, title, price, featured_image_url, images")
            .in("id", listingIds)
        : { data: [] as any[] }

    const { data: profilesData } =
      otherUserIds.length > 0
        ? await supabase
            .from("profiles")
            .select("id, display_name, avatar_url, email, seller_type")
            .in("id", otherUserIds)
        : { data: [] as any[] }

    const { data: unreadMessages } =
      conversationIds.length > 0
        ? await supabase
            .from("messages")
            .select("conversation_id")
            .in("conversation_id", conversationIds)
            .neq("sender_id", currentUserId)
            .is("read_at", null)
        : { data: [] as any[] }

    const unreadMap = new Map<string, number>()

    ;(unreadMessages || []).forEach((message) => {
      unreadMap.set(
        message.conversation_id,
        (unreadMap.get(message.conversation_id) || 0) + 1
      )
    })

    const listingsMap = new Map((listingsData || []).map((item) => [item.id, item]))
    const profilesMap = new Map((profilesData || []).map((item) => [item.id, item]))

    const enriched = baseConversations.map((conversation) => {
      const otherUserId =
        conversation.buyer_id === currentUserId
          ? conversation.seller_id
          : conversation.buyer_id

      return {
        ...conversation,
        listing: listingsMap.get(conversation.listing_id),
        otherUser: profilesMap.get(otherUserId),
        unreadCount: unreadMap.get(conversation.id) || 0,
      }
    })

    setConversations(enriched)

    const nextActive =
      preferredId && enriched.some((item) => item.id === preferredId)
        ? preferredId
        : enriched[0]?.id || ""

    setActiveConversationId((current) => current || nextActive)
  }

  async function loadMessages(conversationId: string, currentUserId: string) {
    setMessagesLoading(true)
    setError("")

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    if (error) {
      setError(error.message)
      setMessages([])
      setMessagesLoading(false)
      return
    }

    setMessages(data || [])
    setMessagesLoading(false)

    await markConversationAsRead(conversationId, currentUserId)
  }

  async function markConversationAsRead(
    conversationId: string,
    currentUserId: string
  ) {
    const { error } = await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_id", currentUserId)
      .is("read_at", null)

    if (!error) {
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, unreadCount: 0 }
            : conversation
        )
      )

      window.dispatchEvent(new Event("autodeal-unread-messages-changed"))
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const text = messageText.trim()

    if (!text || !activeConversationId || !userId || sending) return

    setSending(true)
    setError("")

    const { error: insertError } = await supabase.from("messages").insert({
      conversation_id: activeConversationId,
      sender_id: userId,
      body: text,
    })

    if (insertError) {
      setError(insertError.message)
      setSending(false)
      return
    }

    await supabase
      .from("conversations")
      .update({
        last_message: text,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", activeConversationId)

    setMessageText("")
    await loadMessages(activeConversationId, userId)
    await loadConversations(userId, activeConversationId)
    if (activeConversation) {
      const notificationResponse = await fetch("/api/message-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: activeConversationId,
          listingId: activeConversation.listing_id,
          listingTitle: activeConversation.listing?.title,
          receiverId:
            activeConversation.buyer_id === userId
              ? activeConversation.seller_id
              : activeConversation.buyer_id,
          receiverEmail: activeConversation.otherUser?.email,
          receiverName: activeConversation.otherUser?.display_name,
          senderName: "AutoDeal.ie user",
          message: text,
        }),
      })

      const notificationResult = await notificationResponse.json().catch(() => null)

      if (!notificationResponse.ok || notificationResult?.ok === false) {
        console.warn(
          "Message was sent, but the email notification could not be sent.",
          notificationResult
        )
      }
    }

    window.dispatchEvent(new Event("autodeal-unread-messages-changed"))
    setSending(false)
  }

  function getListingImage(conversation: Conversation) {
    const listing = conversation.listing

    if (!listing) return null

    return (
      listing.featured_image_url ||
      (Array.isArray(listing.images) && listing.images.length > 0
        ? listing.images[0]
        : null)
    )
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950">
        <div className="mx-auto max-w-7xl">Loading messages...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold">Messages</h1>
            <p className="mt-2 text-slate-600">
              Manage conversations between buyers and sellers.
            </p>
          </div>

          <Link
            href="/account"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold hover:bg-slate-50"
          >
            Back to account
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="grid min-h-[650px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[360px_1fr]">
          <aside className="border-b border-slate-200 lg:border-b-0 lg:border-r">
            <div className="border-b border-slate-100 p-5">
              <h2 className="font-bold">Conversations</h2>
              <p className="mt-1 text-sm text-slate-500">
                {conversations.length} conversation
                {conversations.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="max-h-[590px] overflow-y-auto">
              {conversations.length === 0 && (
                <div className="p-8 text-center text-sm text-slate-500">
                  No messages yet.
                </div>
              )}

              {conversations.map((conversation) => {
                const image = getListingImage(conversation)
                const active = conversation.id === activeConversationId
                const unreadCount = conversation.unreadCount || 0

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => setActiveConversationId(conversation.id)}
                    className={`flex w-full gap-3 border-b border-slate-100 p-4 text-left transition hover:bg-blue-50 ${
                      active ? "bg-blue-50" : "bg-white"
                    }`}
                  >
                    <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      {image ? (
                        <img
                          src={image}
                          alt={conversation.listing?.title || "Listing"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-bold text-slate-950">
                          {conversation.otherUser?.display_name || "User"}
                        </p>

                        {unreadCount > 0 && (
                          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-2 text-xs font-bold text-white">
                            {unreadCount}
                          </span>
                        )}
                      </div>

                      <p className="mt-1 truncate text-sm text-slate-600">
                        {conversation.listing?.title || "Listing"}
                      </p>

                      <p
                        className={`mt-1 truncate text-xs ${
                          unreadCount > 0
                            ? "font-bold text-slate-900"
                            : "text-slate-500"
                        }`}
                      >
                        {conversation.last_message || "No messages yet"}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>

          <section className="flex min-h-[650px] flex-col">
            {!activeConversation ? (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-slate-500">
                Select a conversation to start messaging.
              </div>
            ) : (
              <>
                <div className="border-b border-slate-200 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-xl font-bold">
                        {activeConversation.otherUser?.display_name || "User"}
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        About{" "}
                        <Link
                          href={`/cars/${activeConversation.listing_id}`}
                          className="font-semibold text-blue-700 hover:text-blue-800"
                        >
                          {activeConversation.listing?.title || "this listing"}
                        </Link>
                      </p>
                    </div>

                    <Link
                      href={`/cars/${activeConversation.listing_id}`}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold hover:bg-slate-50"
                    >
                      View listing
                    </Link>
                  </div>
                </div>

                <div ref={messagesPanelRef} className="flex-1 overflow-y-auto bg-slate-50 p-5">
                  {messagesLoading && (
                    <p className="text-sm text-slate-500">Loading messages...</p>
                  )}

                  {!messagesLoading && messages.length === 0 && (
                    <div className="flex h-full items-center justify-center text-center text-sm text-slate-500">
                      No messages in this conversation yet.
                    </div>
                  )}

                  <div className="space-y-3">
                    {messages.map((message) => {
                      const mine = message.sender_id === userId

                      return (
                        <div
                          key={message.id}
                          className={`flex ${mine ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                              mine
                                ? "bg-blue-600 text-white"
                                : "border border-slate-200 bg-white text-slate-800"
                            }`}
                          >
                            <p className="whitespace-pre-line leading-6">
                              {message.body}
                            </p>

                            <p
                              className={`mt-2 text-xs ${
                                mine ? "text-blue-100" : "text-slate-400"
                              }`}
                            >
                              {formatTime(message.created_at)}
                            </p>
                          </div>
                        </div>
                      )
                    })}

                  </div>
                </div>

                <form
                  onSubmit={sendMessage}
                  className="border-t border-slate-200 bg-white p-4"
                >
                  <div className="flex gap-3">
                    <textarea
                      value={messageText}
                      onChange={(event) => setMessageText(event.target.value)}
                      rows={2}
                      placeholder="Write a message..."
                      className="min-h-12 flex-1 resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50"
                    />

                    <button
                      type="submit"
                      disabled={sending || !messageText.trim()}
                      className="rounded-xl bg-blue-600 px-6 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {sending ? "Sending..." : "Send"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        </section>
      </div>
    </main>
  )
}

function formatTime(date: string | null) {
  if (!date) return ""

  return new Intl.DateTimeFormat("en-IE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}





