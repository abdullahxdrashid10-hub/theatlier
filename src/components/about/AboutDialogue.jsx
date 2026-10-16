import { useState } from 'react'

const DIALOGUE_ITEMS = [
  {
    num: '01',
    q: 'How did you start painting, and what does your work mean to you?',
    a: 'Painting began not as a profession, but as a quiet, undeniable passion—a sacred sanctuary where emotion could take tangible shape. Over the years, that impulse evolved into a dedicated discipline. To me, every canvas is a sincere reflection of my devotion to colour, the sculptural language of texture, and the belief that art should carry a deep, soulful presence into the home.',
  },
  {
    num: '02',
    q: 'What is it about thick palette-knife paint that you love?',
    a: 'I am drawn to the living depth and dimension that only thick, layered paint can create. When pigments are sculpted with a palette knife rather than smoothed flat, they break free from the boundary of the canvas. They catch the morning sun, hold deep evening shadows, and give the artwork an unrepeatable, tactile heartbeat.',
  },
  {
    num: '03',
    q: 'What does a day in the studio look like?',
    a: 'My studio days are quiet meditations steeped in experimentation. They begin with mixing bespoke tonal palettes, studying how colours converse, and gradually building thick textural strata layer by layer. Hours dissolve into the rhythmic scrape of the palette knife, the delicacy of the brush, and the patient unfolding of an idea into physical form.',
  },
  {
    num: '04',
    q: 'Where do you find ideas, and what are you trying to make people feel?',
    a: 'I find inspiration in the understated grace of everyday life—the raw tones of nature, the shifting ambient light of dawn, and words that stir the soul. I do not create art merely to occupy space; I paint to evoke warmth, emotional grounding, and an enduring sense of comfort in every room my work enters.',
  },
  {
    num: '05',
    q: 'What do you want a collector to know before choosing a painting?',
    a: 'Every single artwork is shaped entirely by hand with intentional care, patience, and heart. I always hope that a collector chooses a piece not out of trend, but because it strikes a personal chord within them—an intuitive resonance that transforms their sanctuary into a space that feels deeply individual and alive.',
  },
  {
    num: '06',
    q: 'Where do you paint, and what materials do you work on?',
    a: 'I create handmade paintings on carefully selected canvases using artist acrylics, mixed media, fine detail brushes, and bold palette knives. A cornerstone of my practice is textured calligraphy—a delicate synthesis where meaningful words meet sculptural relief, allowing sacred prose to rise gracefully from the painted surface.',
  },
]

export default function AboutDialogue() {
  const [openIndex, setOpenIndex] = useState(0)

  const toggle = (idx) => {
    setOpenIndex((prev) => (prev === idx ? null : idx))
  }

  return (
    <section className="about-dialogue" aria-labelledby="dialogue-title">
      <div className="about-dialogue__inner">
        <header className="about-dialogue__header">
          <div className="about-dialogue__seal" aria-hidden="true">
            <span>SK</span>
          </div>
          <span className="about-section-label">The Studio Journal & Inquiries</span>
          <h2 id="dialogue-title" className="about-section-title">
            Conversations With The Artist
          </h2>
          <p className="about-copy">
            An intimate dialogue on creative impulse, sculptural impasto, and the emotional resonance of authentic handmade art.
          </p>
        </header>

        <div className="about-dialogue__list" role="region" aria-label="Artist Q&A">
          {DIALOGUE_ITEMS.map((item, index) => {
            const isOpen = openIndex === index
            return (
              <div
                key={item.num}
                className={`about-dialogue__item ${isOpen ? 'about-dialogue__item--open' : ''}`}
              >
                <button
                  type="button"
                  className="about-dialogue__trigger"
                  onClick={() => toggle(index)}
                  aria-expanded={isOpen}
                >
                  <span className="about-dialogue__num">{item.num}</span>
                  <span className="about-dialogue__question">{item.q}</span>
                  <span className="about-dialogue__icon" aria-hidden="true">
                    {isOpen ? '—' : '+'}
                  </span>
                </button>

                {isOpen && (
                  <div className="about-dialogue__answer-wrap">
                    <p className="about-dialogue__answer">{item.a}</p>
                    <div className="about-dialogue__author-tag">
                      <span>— SK · Studio Archive</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Curator Consultation Connectors */}
        <div className="about-dialogue__connectors">
          <span className="about-dialogue__connectors-label">Further Inquiries</span>
          <div className="about-dialogue__connectors-grid">
            <button
              type="button"
              className="about-curator-pill"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent('atelier:open-curator', {
                    detail: { prompt: 'Can I commission a custom textured calligraphy piece with a specific sacred ayah?' },
                  })
                )
              }
            >
              <span className="about-curator-pill__icon" aria-hidden="true">✦</span>
              <span>Commission Custom Sacred Calligraphy</span>
              <span className="about-curator-pill__arrow" aria-hidden="true">→</span>
            </button>

            <button
              type="button"
              className="about-curator-pill"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent('atelier:open-curator', {
                    detail: { prompt: 'What artworks are currently available or in progress at the studio?' },
                  })
                )
              }
            >
              <span className="about-curator-pill__icon" aria-hidden="true">✦</span>
              <span>View Available Works in Progress</span>
              <span className="about-curator-pill__arrow" aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
