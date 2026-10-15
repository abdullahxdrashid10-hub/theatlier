import { useState } from 'react'

export default function AboutArtisan() {
  const [imgError, setImgError] = useState(false)

  return (
    <section className="about-artisan" aria-labelledby="artisan-title">
      <div className="about-artisan__inner">
        {/* Left Column: Studio Portrait / Impasto Texture Container */}
        <div className="about-artisan__portrait-wrap">
          {!imgError ? (
            <img
              src="/placeholders/placeholder-02.svg"
              alt="SK working with palette knife in The Atelier studio sanctuary"
              className="about-artisan__portrait"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'radial-gradient(circle at 40% 40%, #252019 0%, #151410 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--gold)',
                fontFamily: 'var(--font-heading)',
                fontSize: 'var(--text-lg)',
                letterSpacing: '0.04em',
              }}
            >
              The Atelier Studio Sanctuary
            </div>
          )}
          <div className="about-artisan__portrait-caption">
            <span>Studio Sanctuary · Lahore / Karachi</span>
          </div>
        </div>

        {/* Right Column: Narrative Biography & Studio Rhythm */}
        <div className="about-artisan__content">
          <span className="about-section-label">The Artisan & Sanctuary</span>
          <h2 id="artisan-title" className="about-section-title">
            Solitary Discipline & Master Provenance
          </h2>
          <p className="about-copy">
            Inside the studio, the creative process is one of patient, rigorous meditation. Each large-format canvas begins with hand-stretching unbleached Belgian linen over custom timber frames, primed with an archival mineral base to withstand immense textural weight.
          </p>
          <p className="about-copy">
            SK works in continuous multi-week cycles. Pigments are hand-mixed using artist-grade heavy oils, raw umber, burnt sienna, and genuine metallic leaf. Applying paint with Italian spring-steel palette knives, layers are applied wet-on-wet to create organic marbling, then allowed to cure naturally before sculpted ridges are carved and refined.
          </p>
          <p className="about-copy">
            Drawing inspiration from Pakistan’s arid mineral landscapes, ancient earthen architecture, and mid-century minimalism, every painting stands as an unrepeatable <strong>one-of-one original</strong>.
          </p>
        </div>
      </div>
    </section>
  )
}
