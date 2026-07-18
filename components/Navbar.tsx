"use client"

import Link from "next/link"
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import {
  readSearchHistory,
  saveSearchHistory,
  type SearchHistoryEntry,
} from "@/lib/search-history"

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/listings", label: "Listings" },
]

const HOME_SCROLL_KEY = "autodeal-home-scroll-position"
const HOME_FORCE_TOP_KEY = "autodeal-home-force-top"

const accountLinks = [
  { href: "/account", label: "Dashboard", icon: "grid" },
  { href: "/account", label: "My Listings", icon: "car" },
  { href: "/messages", label: "Messages", icon: "message" },
  { href: "/favorites", label: "Favorites", icon: "heart" },
  { href: "/listings", label: "Saved Searches", icon: "search" },
  { href: "/edit-profile", label: "Account Settings", icon: "settings" },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const accountRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const userIdRef = useRef("")
  const unreadLoadingRef = useRef(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [accountOpen, setAccountOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userId, setUserId] = useState("")
  const [siteSearch, setSiteSearch] = useState("")
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([])

  const loadUnreadCount = useCallback(async (nextUserId?: string) => {
    const activeUserId = nextUserId ?? userIdRef.current

    if (!activeUserId || unreadLoadingRef.current) {
      if (!activeUserId) setUnreadCount(0)
      return
    }

    unreadLoadingRef.current = true

    try {
      const { data: conversations, error: conversationsError } = await supabase
        .from("conversations")
        .select("id")
        .or(`buyer_id.eq.${activeUserId},seller_id.eq.${activeUserId}`)

      if (conversationsError) {
        setUnreadCount(0)
        return
      }

      const conversationIds = (conversations || []).map(
        (conversation) => conversation.id
      )

      if (conversationIds.length === 0) {
        setUnreadCount(0)
        return
      }

      const { count, error: messagesError } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("conversation_id", conversationIds)
        .neq("sender_id", activeUserId)
        .is("read_at", null)

      if (messagesError) {
        setUnreadCount(0)
        return
      }

      setUnreadCount(count || 0)
    } catch {
      setUnreadCount(0)
    } finally {
      unreadLoadingRef.current = false
    }
  }, [])

  const applyAuthUser = useCallback(
    (user: User | null) => {
      const nextUserId = user?.id || ""

      userIdRef.current = nextUserId
      setIsSignedIn(Boolean(user))
      setUserId(nextUserId)
      setIsAdmin((user?.email || "").toLowerCase() === "ekas969@gmail.com")
      setAuthChecked(true)
      loadUnreadCount(nextUserId)
    },
    [loadUnreadCount]
  )

  const loadAuthState = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      applyAuthUser(user || null)
    } catch {
      userIdRef.current = ""
      setIsSignedIn(false)
      setUserId("")
      setIsAdmin(false)
      setUnreadCount(0)
      setAuthChecked(true)
    }
  }, [applyAuthUser])

  useEffect(() => {
    queueMicrotask(() => {
      loadAuthState()
    })

    const interval = window.setInterval(loadUnreadCount, 15000)

    const handleUnreadChange = () => {
      loadUnreadCount()
    }

    const handleAuthRefresh = () => {
      loadAuthState()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadAuthState()
      }
    }

    window.addEventListener("autodeal-unread-messages-changed", handleUnreadChange)
    window.addEventListener("focus", handleAuthRefresh)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    const authListener = supabase.auth.onAuthStateChange((_event, session) => {
      applyAuthUser(session?.user || null)
      setAccountOpen(false)
    })

    const channel = supabase
      .channel("navbar-unread-messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          loadUnreadCount()
        }
      )
      .subscribe()

    return () => {
      window.clearInterval(interval)
      window.removeEventListener(
        "autodeal-unread-messages-changed",
        handleUnreadChange
      )
      window.removeEventListener("focus", handleAuthRefresh)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      authListener.data.subscription.unsubscribe()
      supabase.removeChannel(channel)
    }
  }, [loadUnreadCount])

  useEffect(() => {
    queueMicrotask(() => {
      setSearchHistory(readSearchHistory(userId))
    })
  }, [userId, searchOpen])

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null

      if (accountRef.current && target && !accountRef.current.contains(target)) {
        setAccountOpen(false)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    document.addEventListener("touchstart", handleOutsideClick)

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick)
      document.removeEventListener("touchstart", handleOutsideClick)
    }
  }, [])

  useEffect(() => {
    if (!searchOpen) return

    const focusTimer = window.setTimeout(() => {
      searchInputRef.current?.focus()
    }, 50)

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSearchOpen(false)
      }
    }

    document.addEventListener("keydown", closeOnEscape)

    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [searchOpen])

  async function signOut() {
    setAccountOpen(false)
    setIsSignedIn(false)
    setIsAdmin(false)
    setUnreadCount(0)
    userIdRef.current = ""
    setUserId("")
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  function submitSiteSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const query = siteSearch.trim()
    const params = new URLSearchParams()

    if (query) {
      params.set("q", query)
    }

    if (userId && query) {
      setSearchHistory(
        saveSearchHistory(userId, {
          query,
          href: `/listings?${params.toString()}`,
        })
      )
    }

    setSearchOpen(false)
    router.push(params.size ? `/listings?${params.toString()}` : "/listings")
  }

  function runSuggestedSearch(query: string) {
    const href = `/listings?q=${encodeURIComponent(query)}`
    setSiteSearch(query)
    if (userId) {
      setSearchHistory(saveSearchHistory(userId, { query, href }))
    }
    setSearchOpen(false)
    router.push(href)
  }

  function runHistorySearch(entry: SearchHistoryEntry) {
    setSiteSearch(entry.query)
    setSearchOpen(false)
    router.push(entry.href)
  }

  function resetHomeScroll() {
    sessionStorage.removeItem(HOME_SCROLL_KEY)
    sessionStorage.setItem(HOME_FORCE_TOP_KEY, "1")
    window.dispatchEvent(new Event("autodeal-refresh-public-listings"))
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-sm shadow-slate-900/[0.03] backdrop-blur">
      <div className="relative mx-auto grid h-16 max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 sm:h-[70px] sm:gap-4 sm:px-4">
        <Link href="/" prefetch={false} onClick={resetHomeScroll} className="group flex items-center" aria-label="AutoDeal.ie home">
          <img
            src="/brand/autodeal-logo.png"
            alt="AutoDeal.ie"
            className="h-6 w-auto max-w-[118px] object-contain transition duration-200 group-hover:scale-[1.02] min-[390px]:max-w-[132px] md:h-8 md:max-w-[178px]"
          />
        </Link>

        <nav className="absolute left-1/2 top-0 hidden h-full -translate-x-1/2 items-center justify-center gap-7 text-sm font-bold text-slate-700 lg:flex">
          {navLinks
            .filter((link) => isSignedIn || link.href === "/" || link.href === "/listings")
            .map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname === link.href || pathname.startsWith(`${link.href}/`)

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={link.href === "/" ? resetHomeScroll : undefined}
                className={`relative py-6 transition hover:text-[#005BFF] ${
                  active ? "text-[#005BFF]" : ""
                }`}
              >
                {link.label}
                {link.href === "/messages" && unreadCount > 0 && (
                  <span className="absolute -right-4 top-4 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold leading-none text-white shadow-sm">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[linear-gradient(135deg,#005BFF_0%,#1677FF_55%,#00A3FF_100%)]" />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="flex min-w-0 items-center justify-self-end gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search listings"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#07111F] shadow-sm transition hover:-translate-y-0.5 hover:border-[#005BFF] hover:text-[#005BFF] active:scale-[0.98] sm:h-11 sm:w-11"
          >
            <Icon name="search" />
          </button>

          <Link
            href={isSignedIn ? "/sell" : "/login"}
            className="shrink-0 rounded-xl bg-[linear-gradient(135deg,#005BFF_0%,#1677FF_55%,#00A3FF_100%)] px-3 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/25 active:scale-[0.98] sm:px-4 sm:py-3 sm:text-sm md:px-5"
          >
            Place Ad
          </Link>

          {authChecked && !isSignedIn ? (
            <Link
              href="/login"
              className="flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-0 text-sm font-bold text-[#07111F] shadow-sm transition hover:-translate-y-0.5 hover:border-[#005BFF] hover:text-[#005BFF] active:scale-[0.98] sm:h-11 sm:w-auto sm:px-4"
            >
              <Icon name="user" />
              <span className="hidden sm:inline">Log in</span>
            </Link>
          ) : (
            <div ref={accountRef} className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen((value) => !value)}
                className="flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-0 text-sm font-bold text-[#07111F] shadow-sm transition hover:-translate-y-0.5 hover:border-[#005BFF] hover:text-[#005BFF] active:scale-[0.98] sm:h-11 sm:w-auto sm:px-3"
              >
                <Icon name="user" />
                <span className="hidden xl:inline">My Account</span>
                <svg viewBox="0 0 20 20" className={`hidden h-4 w-4 transition sm:block ${accountOpen ? "rotate-180" : ""}`} aria-hidden="true">
                  <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {accountOpen && (
                <div className="absolute right-0 top-[calc(100%+10px)] w-64 origin-top-right rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/15">
                  {accountLinks.map((item) => (
                    <Link
                      key={`${item.href}-${item.label}`}
                      href={item.href}
                      onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-[#07111F] transition hover:bg-slate-100 hover:text-[#005BFF]"
                    >
                      <Icon name={item.icon} />
                      {item.label}
                    </Link>
                  ))}
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-3 rounded-xl bg-blue-50 px-3 py-2.5 text-sm font-bold text-[#005BFF] transition hover:bg-blue-100"
                    >
                      <Icon name="settings" />
                      Admin Panel
                    </Link>
                  )}

                  <div className="my-2 h-px bg-slate-100" />

                  <button
                    type="button"
                    onClick={signOut}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-red-600 transition hover:bg-red-50"
                  >
                    <Icon name="signout" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {searchOpen && (
        <div className="fixed inset-0 z-[80] bg-slate-950/55 px-4 py-24 backdrop-blur-sm">
          <div className="mx-auto max-w-2xl rounded-xl bg-white p-4 shadow-2xl shadow-slate-950/25">
            <form onSubmit={submitSiteSearch} className="flex items-center gap-3">
              <div className="flex h-12 min-w-0 flex-1 items-center rounded-lg border border-[#005BFF] bg-white px-3">
                <Icon name="search" />
                <input
                  ref={searchInputRef}
                  value={siteSearch}
                  onChange={(event) => setSiteSearch(event.target.value)}
                  placeholder="Search AutoDeal"
                  className="h-full min-w-0 flex-1 bg-transparent px-3 text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                  aria-label="Search listings"
                />
              </div>

              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="h-12 rounded-lg px-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
            </form>

            <div className="mt-7 space-y-3">
              {isSignedIn && searchHistory.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-bold text-slate-900">Your recent searches</p>

                  {searchHistory.slice(0, 4).map((entry) => (
                    <button
                      type="button"
                      key={`${entry.query}-${entry.createdAt}`}
                      onClick={() => runHistorySearch(entry)}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-[#005BFF]"
                    >
                      <Icon name="clock" />
                      {entry.query}
                    </button>
                  ))}
                </div>
              )}

              <p className="text-sm font-bold text-slate-900">Suggested searches</p>

              {["Audi A1", "BMW 3 Series", "Volkswagen Golf", "Toyota Hybrid", "Diesel Automatic"].map((query) => (
                <button
                  type="button"
                  key={query}
                  onClick={() => runSuggestedSearch(query)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-[#005BFF]"
                >
                  <span className="text-slate-300">↗</span>
                  {query}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0",
    grid: "M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z",
    car: "M5 13l2-5h10l2 5M6 17h.01M18 17h.01M4 13h16v5H4v-5Z",
    message: "M4 5h16v11H8l-4 4V5Z",
    heart: "M20 8.5c0 5.5-8 10.5-8 10.5S4 14 4 8.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 8 2.5Z",
    search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 4 4",
    clock: "M12 8v5l3 2m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0-13v3m0 13v3m9.5-9.5h-3m-13 0h-3m16.4-6.4-2.1 2.1M7.2 16.8l-2.1 2.1m13.8 0-2.1-2.1M7.2 7.2 5.1 5.1",
    signout: "M14 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-3m3-8 4 4-4 4m4-4H9",
  }

  const path = paths[name] || paths.user

  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}







