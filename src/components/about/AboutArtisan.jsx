import { useState } from 'react'

export default function AboutArtisan() {
  const [errors, setErrors] = useState({ f1: false, f2: false, f3: false })

  const handleErr = (key) => setErrors((prev) => ({ ...prev, [key]: true }))

  const handleConsultCurator = () => {
    window.dispatchEvent(
      new CustomEvent('atelier:open-curator', {
        detail: { prompt: 'Tell me about SK’s creative process and studio rhythm.' },
      })
    )
  }

  return (
    <section className="about-artisan" aria-labelledby="artisan-title">
      <div className="about-artisan__inner">
        {/* Left Column: Asymmetric 3-Frame Editorial Montage */}
        <div className="about-artisan__montage">
          {/* Frame 1: Primary Sanctuary Atmosphere */}
          <div className="about-artisan__frame about-artisan__frame--main">
            {!errors.f1 ? (
              <img
                src="/artworks/al-asr-room-new.jpg"
                alt="The Atelier Studio Space — authentic handcrafted original on display"
                className="about-artisan__img"
                loading="lazy"
                onError={() => handleErr('f1')}
              />
            ) : (
              <div className="about-artisan__fallback about-artisan__fallback--main">
                <span className="about-artisan__fallback-title">The Atelier by SK</span>
                <span className="about-artisan__fallback-sub">Original Handmade Art</span>
              </div>
            )}
            <div className="about-artisan__caption">
              <span>The Atelier by SK · Original Artworks</span>
            </div>
          </div>

          {/* Frame 2: Floating Detail Accent (Palette Knife & Impasto) */}
          <div className="about-artisan__frame about-artisan__frame--accent-top">
            {!errors.f2 ? (
              <img
                src="/artworks/gilded-ridge-detail.jpg"
                alt="Palette knife impasto texture and dimensional paint ridges"
                className="about-artisan__img"
                loading="lazy"
                onError={() => handleErr('f2')}
              />
            ) : (
              <div className="about-artisan__fallback about-artisan__fallback--accent">
                <span>Sculptural Knife Impasto</span>
              </div>
            )}
            <div className="about-artisan__micro-tag">
              <span>Palette Knife Relief</span>
            </div>
          </div>

          {/* Frame 3: Floating Detail Accent (Dimensional Calligraphy) */}
          <div className="about-artisan__frame about-artisan__frame--accent-bottom">
            {!errors.f3 ? (
              <img
                src="/artworks/tajalli-detail.jpg"
                alt="Textured dimensional calligraphy detail on canvas"
                className="about-artisan__img"
                loading="lazy"
                onError={() => handleErr('f3')}
              />
            ) : (
              <div className="about-artisan__fallback about-artisan__fallback--accent">
                <span>Textured Calligraphy Detail</span>
              </div>
            )}
            <div className="about-artisan__micro-tag">
              <span>Dimensional Calligraphy</span>
            </div>
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

          <div className="about-artisan__cta-wrap">
            <button
              type="button"
              className="about-curator-pill"
              onClick={handleConsultCurator}
              aria-label="Inquire about SK’s studio process with the AI Curator"
            >
              <span className="about-curator-pill__icon" aria-hidden="true">✦</span>
              <span>Ask Curator About SK’s Studio Process</span>
              <span className="about-curator-pill__arrow" aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
