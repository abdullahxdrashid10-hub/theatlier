import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** True only when both Supabase URL and public anon key are present. */
export const isSupabaseConfigured = Boolean(
  typeof supabaseUrl === 'string' &&
  supabaseUrl.trim().length > 0 &&
  typeof supabaseAnonKey === 'string' &&
  supabaseAnonKey.trim().length > 0
)

/**
 * Browser-safe Supabase client. Uses only the public anon key with disabled
 * session persistence for public storefront visitors.
 * If credentials are missing, exports null instead of throwing an unhandled error.
 */
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl.trim(), supabaseAnonKey.trim(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null

/**
 * Returns the active Supabase client or throws a descriptive error if unconfigured.
 */
export function getSupabase() {
  if (!supabase) {
    throw new Error('Supabase client is not configured: missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.')
  }
  return supabase
}
