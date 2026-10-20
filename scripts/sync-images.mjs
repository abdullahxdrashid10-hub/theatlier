import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

function loadEnvFile(filename) {
  const filePath = path.resolve(process.cwd(), filename)
  if (!fs.existsSync(filePath)) return {}
  const content = fs.readFileSync(filePath, 'utf8')
  const env = {}
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) return
    const key = trimmed.slice(0, eqIdx).trim()
    let val = trimmed.slice(eqIdx + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    env[key] = val
  })
  return env
}

const env = { ...loadEnvFile('.env'), ...loadEnvFile('.env.local') }
const supabaseUrl = env.VITE_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY
const anonKey = env.VITE_SUPABASE_ANON_KEY

const keyToUse = serviceKey || anonKey

if (!supabaseUrl || !keyToUse) {
  console.error('Missing Supabase URL or Key.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, keyToUse, {
  auth: { persistSession: false, autoRefreshToken: false }
})

const artworks = [
  { slug: 'al-asr', dim: '/artworks/al-asr-dimension.jpg' },
  { slug: 'mountain-ridge', dim: '/artworks/mountain-ridge-dimension.jpg' },
  { slug: 'tajalli', dim: '/artworks/tajalli-dimension.jpg' },
  { slug: 'nafs-e-rehmat', dim: '/artworks/nafs-e-rehmat-dimension.jpg' },
  { slug: 'tajdeed', dim: '/artworks/tajdeed-dimension.jpg' },
  { slug: 'ufaq-e-sukoon', dim: '/artworks/ufaq-e-sukoon-dimension.jpg' },
  { slug: 'sukoon-e-khak', dim: '/artworks/sukoon-e-khak-dimension.jpg' },
  { slug: 'iltija', dim: '/artworks/iltija-dimension.jpg' },
  { slug: 'uns', dim: '/artworks/uns-dimension.jpg' },
  { slug: 'kursi-e-jalal', dim: '/artworks/kursi-e-jalal-dimension.jpg' },
  { slug: 'nuqoosh', dim: '/artworks/nuqoosh-dimension.jpg' },
  { slug: 'yusra', dim: '/artworks/yusra-dimension.jpg' },
  { slug: 'madar', dim: '/artworks/madar-dimension.jpg' }
]

async function run() {
  console.log('Syncing dimension images to Supabase...')
  const { data: paintings, error } = await supabase.from('paintings').select('id, slug')
  if (error) {
    console.error('Error fetching paintings:', error.message)
    return
  }

  const map = new Map(paintings.map(p => [p.slug, p.id]))

  for (const art of artworks) {
    const id = map.get(art.slug)
    if (!id) {
      console.warn('Painting not found:', art.slug)
      continue
    }

    // Check if sort_order 0 exists
    const { data: existing } = await supabase
      .from('painting_images')
      .select('id, url')
      .eq('painting_id', id)
      .eq('sort_order', 0)
      .maybeSingle()

    if (existing) {
      if (existing.url !== art.dim) {
        const { error: updateErr } = await supabase
          .from('painting_images')
          .update({ url: art.dim })
          .eq('id', existing.id)
        if (updateErr) {
          console.warn(`Could not update ${art.slug} (RLS might prevent anon writes):`, updateErr.message)
        } else {
          console.log(`Updated ${art.slug} sort_order 0 -> ${art.dim}`)
        }
      } else {
        console.log(`${art.slug} already has dimension image as sort_order 0`)
      }
    } else {
      const { error: insertErr } = await supabase
        .from('painting_images')
        .insert({
          painting_id: id,
          url: art.dim,
          sort_order: 0,
          alt: `${art.slug} · In-situ architectural scale view with dimensions`
        })
      if (insertErr) {
        console.warn(`Could not insert ${art.slug}:`, insertErr.message)
      } else {
        console.log(`Inserted ${art.slug} -> ${art.dim}`)
      }
    }
  }
}

run().catch(console.error)
