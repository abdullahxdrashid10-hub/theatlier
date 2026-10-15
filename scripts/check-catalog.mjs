import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

// Helper to load env variables from .env.local or .env if not already set in process.env
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
  } catch (err) {
    // Ignore file reading errors
  }
}

loadEnvFile('.env.local')
loadEnvFile('.env')

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing.')
  console.error('Please configure them in your environment or .env.local.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function checkCatalog() {
  console.log('Connecting to Supabase catalog at:', supabaseUrl)

  const { data, error } = await supabase
    .from('paintings')
    .select('id, slug, title, status')

  if (error) {
    console.error('Failed to fetch paintings from Supabase:', error.message)
    process.exit(1)
  }

  const counts = {
    available: 0,
    reserved: 0,
    sold: 0,
    other: 0,
  }

  data.forEach((painting) => {
    const status = String(painting.status || '').toLowerCase()
    if (counts[status] !== undefined) {
      counts[status] += 1
    } else {
      counts.other += 1
    }
  })

  console.log('\n--- Catalog Status Summary ---')
  console.log(`Available: ${counts.available}`)
  console.log(`Reserved:  ${counts.reserved}`)
  console.log(`Sold:      ${counts.sold}`)
  if (counts.other > 0) {
    console.log(`Other:     ${counts.other}`)
  }
  console.log(`Total:     ${data.length}`)
  console.log('------------------------------\n')
}

checkCatalog().catch((err) => {
  console.error('Unexpected error checking catalog:', err.message)
  process.exit(1)
})
