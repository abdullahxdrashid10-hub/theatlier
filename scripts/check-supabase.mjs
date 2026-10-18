import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

function loadEnvFile(filename) {
  const filePath = path.resolve(process.cwd(), filename)
  if (!fs.existsSync(filePath)) return
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) return
      const key = trimmed.slice(0, eqIdx).trim()
      let val = trimmed.slice(eqIdx + 1).trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) {
        process.env[key] = val
      }
    })
  } catch {
    // Ignore read errors
  }
}

loadEnvFile('.env.local')
loadEnvFile('.env')

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('FAIL: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

let passed = 0
let failed = 0

function report(testName, isSuccess, details = '') {
  if (isSuccess) {
    passed++
    console.log(`[PASS] ${testName}`)
  } else {
    failed++
    console.error(`[FAIL] ${testName}${details ? ` - ${details}` : ''}`)
  }
}

async function runTests() {
  console.log('Running Supabase anon security & validation checks...')

  // 1. paintings are readable
  try {
    const { data, error } = await supabase.from('paintings').select('id, slug, title').limit(5)
    report('Paintings are readable by anon key', !error && Array.isArray(data), error?.message)
  } catch (err) {
    report('Paintings are readable by anon key', false, err.message)
  }

  // 2. orders return no rows
  try {
    const { data } = await supabase.from('orders').select('*')
    const count = data ? data.length : 0
    report('Orders table returns zero rows to anon key', count === 0, `Returned ${count} rows`)
  } catch (err) {
    report('Orders table returns zero rows to anon key', false, err.message)
  }

  // 3. order_items return no rows
  try {
    const { data } = await supabase.from('order_items').select('*')
    const count = data ? data.length : 0
    report('Order items table returns zero rows to anon key', count === 0, `Returned ${count} rows`)
  } catch (err) {
    report('Order items table returns zero rows to anon key', false, err.message)
  }

  // 4. admins return no rows
  try {
    const { data } = await supabase.from('admins').select('*')
    const count = data ? data.length : 0
    report('Admins table returns zero rows to anon key', count === 0, `Returned ${count} rows`)
  } catch (err) {
    report('Admins table returns zero rows to anon key', false, err.message)
  }

  // 5. insert into paintings is rejected or changes nothing
  try {
    const { data, error } = await supabase
      .from('paintings')
      .insert({
        slug: 'security-test-painting',
        title: 'Security Test Painting',
        price_pkr: 999999,
        medium: 'Acrylic on canvas',
      })
      .select()

    const prevented = Boolean(error) || !data || data.length === 0
    report('Insert into paintings is rejected or touches 0 rows', prevented, error?.message)
  } catch (err) {
    report('Insert into paintings is rejected or touches 0 rows', true, err.message)
  }

  // 6. update of a painting is rejected or changes nothing
  try {
    const { data, error } = await supabase
      .from('paintings')
      .update({ title: 'Hacked Title' })
      .eq('slug', 'al-asr')
      .select()

    const prevented = Boolean(error) || !data || data.length === 0
    report('Update of paintings is rejected or touches 0 rows', prevented)
  } catch (err) {
    report('Update of paintings is rejected or touches 0 rows', true, err.message)
  }

  // 7. release_stale_reservations is rejected
  try {
    const { error } = await supabase.rpc('release_stale_reservations', { p_hours: 48 })
    report('Call to release_stale_reservations is rejected for anon key', Boolean(error), error?.message)
  } catch (err) {
    report('Call to release_stale_reservations is rejected for anon key', true, err.message)
  }

  // 8. place_order with invalid phone returns ATL02
  try {
    const { error } = await supabase.rpc('place_order', {
      p_items: ['226ae6d8-71d6-42a7-a477-d85bf081c12c'],
      p_customer: {
        name: 'Verification Bot',
        phone: '12345',
        city: 'Karachi',
        address: '123 Studio Road',
      },
      p_payment_method: 'cod',
    })

    const isAtl02 =
      error &&
      (error.code === 'ATL02' ||
        String(error.message).includes('ATL02') ||
        String(error.message).includes('INVALID_CUSTOMER') ||
        String(error.details).includes('phone'))

    report('place_order with invalid phone returns ATL02', Boolean(isAtl02), error?.message || 'No error returned')
  } catch (err) {
    report('place_order with invalid phone returns ATL02', false, err.message)
  }

  // 9. place_order with empty list returns ATL01
  try {
    const { error } = await supabase.rpc('place_order', {
      p_items: [],
      p_customer: {
        name: 'Verification Bot',
        phone: '+923001234567',
        city: 'Karachi',
        address: '123 Studio Road',
      },
      p_payment_method: 'cod',
    })

    const isAtl01 =
      error &&
      (error.code === 'ATL01' ||
        String(error.message).includes('ATL01') ||
        String(error.message).includes('INVALID_ITEMS'))

    report('place_order with empty item list returns ATL01', Boolean(isAtl01), error?.message || 'No error returned')
  } catch (err) {
    report('place_order with empty item list returns ATL01', false, err.message)
  }

  // 10. place_order with random uuid returns ATL03
  try {
    const { error } = await supabase.rpc('place_order', {
      p_items: ['a0000000-0000-0000-0000-000000000000'],
      p_customer: {
        name: 'Verification Bot',
        phone: '+923001234567',
        city: 'Karachi',
        address: '123 Studio Road',
      },
      p_payment_method: 'cod',
    })

    const isAtl03 =
      error &&
      (error.code === 'ATL03' ||
        String(error.message).includes('ATL03') ||
        String(error.message).includes('PAINTING_UNAVAILABLE'))

    report('place_order with non-existent uuid returns ATL03', Boolean(isAtl03), error?.message || 'No error returned')
  } catch (err) {
    report('place_order with non-existent uuid returns ATL03', false, err.message)
  }

  console.log(`\nCheck results: ${passed} passed, ${failed} failed.`)

  if (failed > 0) {
    process.exit(1)
  } else {
    process.exit(0)
  }
}

runTests()
