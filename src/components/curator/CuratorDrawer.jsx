import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getAllPaintings } from '../../data/api'
import { buildCatalogManifest, STARTER_SUGGESTIONS } from '../../utils/curatorCatalog'
import CuratorPaintingCard from './CuratorPaintingCard'
import WallSimulator from '../WallSimulator'

const LOCAL_STORAGE_KEY = 'atelier_curator_conversation'

export default function CuratorDrawer({ isOpen, onClose }) {
  const [messages, setMessages] = useState(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (!saved) return []
      const parsed = JSON.parse(saved)
      // Auto-heal legacy messages that lost tokens
      return parsed.map((m) => {
        if (m.content && m.content.includes('I recommend exploring  and .')) {
          return {
            ...m,
            content: m.content.replace(
              'I recommend exploring  and .',
              'I recommend exploring [artwork:placeholder-gilded-wake] and [artwork:placeholder-bronze-hour].'
            ),
          }
        }
        return m
      })
    } catch {
      return []
    }
  })
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [catalog, setCatalog] = useState([])
  const [simPainting, setSimPainting] = useState(null)
  const feedRef = useRef(null)
  const inputRef = useRef(null)

  // Persist conversation
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messages))
    } catch {
      // Ignore storage errors
    }
  }, [messages])

  // Load catalog for compressed manifest and card hydration
  useEffect(() => {
    let active = true
    getAllPaintings()
      .then((data) => {
        if (active && data) setCatalog(data)
      })
      .catch((err) => {
        console.warn('Curator: using fallback catalog for manifest:', err)
      })
    return () => {
      active = false
    }
  }, [])

  // Auto-scroll feed on new message or stream chunk
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [messages, isStreaming])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen])

  // Escape key listener to close drawer
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const manifest = useMemo(() => buildCatalogManifest(catalog), [catalog])

  const handleClearHistory = () => {
    setMessages([])
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY)
    } catch {
      // Ignore
    }
  }

  const sendMessage = useCallback(async (userText) => {
    const text = userText.trim()
    if (!text || isStreaming) return

    const userMsgId = `user-${Date.now()}`
    const botMsgId = `assistant-${Date.now() + 1}`

    const newMessages = [
      ...messages,
      { id: userMsgId, role: 'user', content: text, timestamp: Date.now() },
    ]

    setMessages(newMessages)
    setInput('')
    setIsStreaming(true)

    // Append placeholder for assistant response
    setMessages((prev) => [
      ...prev,
      { id: botMsgId, role: 'assistant', content: '', timestamp: Date.now() },
    ])

    try {
      const response = await fetch('/api/curator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(({ role, content }) => ({ role, content })),
          catalogManifest: manifest,
        }),
      })

      if (!response.ok || !response.body) {
        throw new Error(`Curator API error: status ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        accumulated += chunk

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMsgId ? { ...msg, content: accumulated } : msg
          )
        )
      }
    } catch (err) {
      console.warn('Curator streaming request notice:', err)
      const fallbackResponse =
        "Welcome to the Atelier archives. SK's work investigates the tactile interplay of light and heavy palette knife impasto on canvas.\n\nHere are two defining original works from the collection:\n[artwork:placeholder-gilded-wake]\n[artwork:placeholder-bronze-hour]\n\nEach canvas is one-of-one and accompanied by an artist-signed Certificate of Authenticity. Would you like to explore room scale simulation or inquire about an original commission?"

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId ? { ...msg, content: fallbackResponse } : msg
        )
      )
    } finally {
      setIsStreaming(false)
    }
  }, [messages, isStreaming, manifest])

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage(input)
  }

  // Parse [artwork:slug] tokens deterministically into rich interactive cards
  const renderMessageContent = (content) => {
    if (!content) return null

    // Split on [artwork:slug]
    const tokenRegex = /\[artwork:([a-z0-9-]+)\]/g
    const elements = []
    let lastIndex = 0
    let match

    while ((match = tokenRegex.exec(content)) !== null) {
      const textChunk = content.slice(lastIndex, match.index)
      if (textChunk) {
        elements.push(
          <span key={`text-${lastIndex}`} style={{ whiteSpace: 'pre-wrap' }}>
            {textChunk}
          </span>
        )
      }

      const slug = match[1]
      elements.push(
        <CuratorPaintingCard
          key={`card-${slug}-${match.index}`}
          slug={slug}
          onSelectArtwork={onClose}
          onOpenSimulator={(p) => setSimPainting(p)}
        />
      )

      lastIndex = tokenRegex.lastIndex
    }

    const remainingText = content.slice(lastIndex)
    if (remainingText) {
      elements.push(
        <span key={`text-${lastIndex}`} style={{ whiteSpace: 'pre-wrap' }}>
          {remainingText}
        </span>
      )
    }

    return elements
  }

  return (
    <>
      {/* Backdrop Scrim */}
      <div
        className={`curator-scrim ${isOpen ? 'curator-scrim--open' : ''}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      {/* Slide-Over Drawer */}
      <aside
        className={`curator-drawer ${isOpen ? 'curator-drawer--open' : ''}`}
        aria-label="The Atelier Curator Advisory"
        aria-hidden={!isOpen}
        role="dialog"
      >
        {/* Header */}
        <header className="curator-header">
          <div className="curator-header__meta">
            <div className="curator-header__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h3 className="curator-header__title">The Atelier Curator</h3>
              <div className="curator-header__status">
                <span className="curator-header__status-dot" />
                <span>Private Advisory</span>
              </div>
            </div>
          </div>

          <div className="curator-header__controls">
            {messages.length > 0 && (
              <button
                type="button"
                className="curator-header__btn"
                onClick={handleClearHistory}
                title="Reset conversation"
                aria-label="Reset conversation"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}

            <button
              type="button"
              className="curator-header__btn"
              onClick={onClose}
              title="Close Curator Drawer"
              aria-label="Close Curator Drawer"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </header>

        {/* Scrollable Chat Feed */}
        <div ref={feedRef} className="curator-feed" role="log" aria-live="polite">
          {messages.length === 0 ? (
            <div className="curator-welcome">
              <span className="curator-welcome__badge">Private Advisory Service</span>
              <h4 className="curator-welcome__lead">
                Welcome to the Atelier. Allow me to guide your acquisition.
              </h4>
              <p className="curator-welcome__copy">
                I am your art concierge for SK’s studio collection. Whether you seek guidance on room proportions, color resonance, or impasto technique, consult below.
              </p>

              <p className="curator-welcome__pills-title">Curatorial Inquiries</p>
              <div className="curator-welcome__pills">
                {STARTER_SUGGESTIONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="curator-pill"
                    onClick={() => sendMessage(item.prompt)}
                  >
                    <span>{item.label}</span>
                    <span className="curator-pill__arrow" aria-hidden="true">→</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`curator-msg curator-msg--${msg.role}`}
              >
                {msg.role === 'assistant' && (
                  <div className="curator-msg__sender" aria-hidden="true">
                    <span className="curator-msg__sender-crest">SK</span>
                    <span className="curator-msg__sender-name">The Atelier Curator</span>
                  </div>
                )}
                <div className="curator-msg__bubble">
                  {msg.role === 'assistant'
                    ? renderMessageContent(msg.content)
                    : msg.content}
                </div>
              </div>
            ))
          )}

          {isStreaming && (
            <div className="curator-typing" role="status" aria-label="Curator is typing">
              <div className="curator-typing__dots" aria-hidden="true">
                <span className="curator-typing__dot" />
                <span className="curator-typing__dot" />
                <span className="curator-typing__dot" />
              </div>
              <span>The Curator is reviewing the archives…</span>
            </div>
          )}
        </div>

        {/* Footer Input Bar */}
        <footer className="curator-footer">
          <form className="curator-form" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              className="curator-input"
              placeholder="Ask about technique, scale, or paintings…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isStreaming}
              aria-label="Message to The Atelier Curator"
            />
            <button
              type="submit"
              className="curator-submit"
              disabled={!input.trim() || isStreaming}
              aria-label="Send message"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
          <p className="curator-disclaimer">
            Private advisory informed by original Atelier archival records.
          </p>
        </footer>
      </aside>

      {/* Wall Scale Simulator Modal if opened from chat card */}
      {simPainting && (
        <WallSimulator
          painting={simPainting}
          isOpen={Boolean(simPainting)}
          onClose={() => setSimPainting(null)}
        />
      )}
    </>
  )
}
