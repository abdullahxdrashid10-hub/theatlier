import { createClient } from '@supabase/supabase-js'
import { invalidateCatalogCache } from '../data/api'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase environment variables are missing for admin client.')
}

/**
 * Separate Supabase client for admin operations.
 * Uses the public anon key only. Never uses service_role.
 * Stores auth session in sessionStorage/localStorage under 'atelier-admin-auth'.
 */
export const adminSupabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '', {
  auth: {
    persistSession: true,
    storageKey: 'atelier-admin-auth',
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})

/**
 * Checks if the currently authenticated user has the admin role.
 * @returns {Promise<boolean>}
 */
export async function checkIsAdmin() {
  try {
    const { data: { session } } = await adminSupabase.auth.getSession()
    if (!session?.user) return false

    const { data, error } = await adminSupabase.rpc('is_admin')
    if (error) {
      console.error('is_admin RPC check error:', error)
      return false
    }
    return data === true
  } catch (err) {
    console.error('Admin verification check failed:', err)
    return false
  }
}

/**
 * Signs in with email and password, then verifies admin status.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>} User object if authorized
 */
export async function adminSignIn(email, password) {
  const { data, error } = await adminSupabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })

  if (error) {
    throw new Error(error.message || 'Invalid email or password.')
  }

  const authorized = await checkIsAdmin()
  if (!authorized) {
    await adminSupabase.auth.signOut()
    throw new Error('This account is not authorised.')
  }

  return data.user
}

/**
 * Signs out the admin user.
 */
export async function adminSignOut() {
  await adminSupabase.auth.signOut()
  invalidateCatalogCache()
}

/**
 * Helper to ensure a mutation touched rows.
 * Database rules silently block updates, so we must treat empty results as an error.
 */
export function assertTouched(data, actionName = 'Operation') {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    throw new Error(`${actionName} failed: no rows were modified. Please check permissions or stale data.`)
  }
  invalidateCatalogCache()
  return data
}
