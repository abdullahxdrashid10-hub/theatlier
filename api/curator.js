/* global process */
export const config = {
  runtime: 'edge',
}

const SYSTEM_INSTRUCTION = `You are "The Atelier Curator", the private art concierge and gallery director for The Atelier by SK (a high-end fine art studio founded by Pakistani artist SK, known for heavy-body oil impasto paintings on fine Belgian linen).

YOUR PERSONA & VOICE:
- Cultured, articulate, warm, and visually evocative.
- Speak with editorial elegance, like an experienced curator at an exclusive gallery in Mayfair, Manhattan, or Paris.
- Use fine-art terminology naturally: heavy-body impasto, palette knife relief, chiaroscuro, Belgian linen, organic geometry, provenance, tactile depth.
- Treat every collector with courtesy, discretion, and respect.

DIALECT & LANGUAGE:
- You serve discerning collectors in Pakistan and internationally.
- Visitors may address you in English, Urdu, or Roman Urdu (e.g. "mujhay gold tone paintings dikhao", "kamray kay liye barhi painting").
- Understand all dialects fluently. Respond in polished, warm, editorial English (or courteous bilingual Urdu/English tone if addressed in Urdu).

CURRENCY & PRICE RULES:
- Always express prices strictly in whole integer Pakistani Rupees formatted like: PKR 185,000.
- NEVER use USD ($), never use "lacs" or "k" in official price mentions, and never use decimal points.

CRITICAL ZERO-HALLUCINATION TOKEN CONTRACT:
- You will be provided with a JSON manifest of authentic artworks currently in the Atelier catalog.
- When you mention, describe, or recommend an artwork from the collection, you MUST output its deterministic token: [artwork:slug].
  Example: "For a grand living room, I highly recommend [artwork:ephemeral-horizon], which features commanding chiaroscuro depth."
- The website UI automatically parses [artwork:slug] into an interactive rich card showing verified photos, live availability, dimensions, and wall scale simulation.
- NEVER invent fictional artworks, phantom slugs, or unverified dimensions. Only recommend paintings present in the provided manifest.
- If a collector asks for bespoke sizing or a custom piece, warmly direct them to inquire about a private commission via WhatsApp or the contact page.`

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { messages = [], catalogManifest = '[]' } = body
  const apiKey =
    (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
    (typeof process !== 'undefined' && process.env?.VITE_GEMINI_API_KEY)

  // If no Gemini API key is configured in environment, provide an intelligent curated response
  if (!apiKey) {
    const stream = new ReadableStream({
      start(controller) {
        const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content || ''
        const lower = lastUser.toLowerCase()
        let reply

        if (lower.includes('statement') || lower.includes('living') || lower.includes('lounge')) {
          reply =
            'For a commanding living space, statement scale and structural balance are paramount. I recommend exploring [artwork:ephemeral-horizon] and [artwork:gilded-wake]. Both canvases command attention with multi-layered palette knife reliefs that dynamically catch ambient natural light.'
        } else if (lower.includes('technique') || lower.includes('impasto') || lower.includes('knife')) {
          reply =
            'SK works exclusively with heavy-body oil pigments applied via Italian palette knives onto custom-stretched Belgian linen. Rather than flat brushwork, each canvas is built sculpturally with deep peaks and chiaroscuro valleys that create a living relief on the wall.'
        } else if (lower.includes('gold') || lower.includes('bronze') || lower.includes('warm')) {
          reply =
            'Warm bronze and gold tones create extraordinary intimacy in evening light. Consider [artwork:gilded-wake] and [artwork:bronze-hour]. The warm metallic mineral pigments reflect lamp and candlelight with remarkable warmth.'
        } else if (lower.includes('price') || lower.includes('budget') || lower.includes('200,000') || lower.includes('under')) {
          reply =
            'Several remarkable original pieces in the collection are available under PKR 200,000, including [artwork:whispering-stone] and [artwork:terracotta-silence]. Each is a one-of-one original accompanied by a signed Certificate of Authenticity.'
        } else {
          reply =
            'Welcome to The Atelier. Each original canvas in the archives is an investigation into organic geometry and sculptural oil texture. To begin, consider [artwork:ephemeral-horizon] or share details regarding the room you are designing, and I will tailor a personal selection.'
        }

        const encoder = new TextEncoder()
        const words = reply.split(' ')
        let i = 0

        const interval = setInterval(() => {
          if (i < words.length) {
            controller.enqueue(encoder.encode((i === 0 ? '' : ' ') + words[i]))
            i++
          } else {
            clearInterval(interval)
            controller.close()
          }
        }, 35)
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })
  }

  // Format conversation history for Gemini API
  const contents = [
    {
      role: 'user',
      parts: [
        {
          text: `${SYSTEM_INSTRUCTION}\n\nCURRENT ATELIER CATALOG MANIFEST (JSON):\n${catalogManifest}\n\nPlease review the collection and advise the collector with cultured precision.`,
        },
      ],
    },
    {
      role: 'model',
      parts: [
        {
          text: 'Understood. I am The Atelier Curator. I will guide collectors with refined expertise, strict PKR whole integer pricing, and deterministic [artwork:slug] tokens for catalog recommendations.',
        },
      ],
    },
  ]

  // Add conversation history
  messages.forEach((msg) => {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    })
  })

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      }),
    })

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text()
      return new Response(JSON.stringify({ error: 'Gemini upstream error', details: errText }), {
        status: geminiResponse.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Stream SSE chunks transformed into plain text
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    const reader = geminiResponse.body.getReader()

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = ''
        try {
          while (true) {
            const { value, done } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              const trimmed = line.trim()
              if (trimmed.startsWith('data: ')) {
                const jsonStr = trimmed.slice(6)
                if (jsonStr === '[DONE]') continue
                try {
                  const parsed = JSON.parse(jsonStr)
                  const textPart =
                    parsed.candidates?.[0]?.content?.parts?.[0]?.text
                  if (textPart) {
                    controller.enqueue(encoder.encode(textPart))
                  }
                } catch {
                  // Ignore JSON parse errors in SSE fragments
                }
              }
            }
          }
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Stream initiation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
