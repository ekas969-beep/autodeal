import { unstable_cache } from "next/cache"
import { createClient } from "@supabase/supabase-js"
import { isListingCurrentlyPublic } from "@/lib/listing-expiry"

function createPublicSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase public environment variables are not configured.")
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

async function loadPublicListings() {
  const supabase = createPublicSupabaseClient()

  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .order("is_premium", { ascending: false })
    .order("priority_search", { ascending: false })
    .order("homepage_featured", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []).filter((listing) => isListingCurrentlyPublic(listing))
}

export const getPublicListings = unstable_cache(
  loadPublicListings,
  ["public-listings"],
  {
    tags: ["public-listings"],
    revalidate: 60,
  }
)
