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
            Passion, Patience & The Living Canvas
          </h2>
          <p className="about-copy">
            What began as an intuitive passion has deepened into an enduring artistic calling. Inside the quiet sanctuary of the studio, every artwork begins with a blank canvas carefully chosen to honor the scale, weight, and voice of the piece to come.
          </p>
          <p className="about-copy">
            Days are spent in rhythmic exploration—mixing custom palettes, layering acrylics and mixed media, and finding harmony between delicate brushwork and bold palette-knife ridges. Each layer cures naturally as dimensional textures rise from the surface, capturing light and shadows in an intimate dance.
          </p>
          <p className="about-copy">
            Inspired by the quiet poetry of everyday life, nature's earthy nuances, and sacred words, SK crafts each piece with patient care to bring warmth, emotion, and individuality into the collector's home as an unrepeatable <strong>one-of-one original</strong>.
          </p>
        </div>
      </div>
    </section>
  )
}
