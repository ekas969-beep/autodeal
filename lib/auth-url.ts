import type { SupabaseClient } from "@supabase/supabase-js"

type FinishAuthResult =
  | { ok: true; completed: boolean }
  | { ok: false; completed: false; error: string }

export async function finishAuthFromCurrentUrl(
  supabase: SupabaseClient
): Promise<FinishAuthResult> {
  const search = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.slice(1))
  const authError =
    search.get("error_description") ||
    search.get("error") ||
    hash.get("error_description") ||
    hash.get("error")

  if (authError) {
    clearAuthParamsFromUrl()
    return { ok: false, completed: false, error: authError }
  }

  const code = search.get("code")

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    clearAuthParamsFromUrl()

    if (error) {
      return { ok: false, completed: false, error: error.message }
    }

    return { ok: true, completed: true }
  }

  const accessToken = hash.get("access_token")
  const refreshToken = hash.get("refresh_token")

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    clearAuthParamsFromUrl()

    if (error) {
      return { ok: false, completed: false, error: error.message }
    }

    return { ok: true, completed: true }
  }

  return { ok: true, completed: false }
}

function clearAuthParamsFromUrl() {
  window.history.replaceState(null, "", window.location.pathname)
}
