import { useState, useRef } from 'react'

const TECHNIQUES = [
  {
    id: 'knife',
    badge: 'Dimensional Strata',
    title: 'The Sculptural Palette Knife',
    subtitle: 'Bold Impasto, 8mm Relief & Living Shadow',
    description:
      'Wielded with decisive pressure, flexible spring-steel palette knives sculpt heavy-body acrylics and mixed media directly onto the canvas. Rather than lying flat, the paint rises in architectural ridges and jagged crests that capture changing ambient light throughout the day.',
    details: [
      { label: 'Surface Profile', value: 'High-relief impasto up to 8mm' },
      { label: 'Light Interaction', value: 'Dynamic raking daylight & dramatic evening shadow' },
      { label: 'Tactile Emotion', value: 'Visceral, raw, grounding, and unapologetically physical' },
    ],
    quote: '“I love the depth, dimension, and unique textures created by thick paint. It brings each painting to life and makes it special.”',
    visualClass: 'about-duel__canvas--knife',
  },
  {
    id: 'brush',
    badge: 'Nuance & Detailing',
    title: 'The Delicate Brushwork',
    subtitle: 'Whispering Glazes & Sacred Calligraphy Curves',
    description:
      'In contrast to the raw power of the knife, fine filament and pointed brushes introduce contemplative stillness. Through feathered glazes and fluid calligraphic strokes, the brush weaves intricate tonal gradients and precise sacred lettering across the painted surface.',
    details: [
      { label: 'Surface Profile', value: 'Feathered glazes & continuous fluid scripts' },
      { label: 'Light Interaction', value: 'Soft ambient luster with mineral pigment refraction' },
      { label: 'Tactile Emotion', value: 'Reverent, intimate, lyrical, and emotionally soothing' },
    ],
    quote: '“My calligraphy pieces combine painted elements and textured techniques, creating a balance between meaningful words and artistic expression.”',
    visualClass: 'about-duel__canvas--brush',
  },
  {
    id: 'synthesis',
    badge: 'Signature Mastery',
    title: 'The Dual Synthesis',
    subtitle: 'Textured Dimensional Calligraphy',
    description:
      'The pinnacle of SK’s oeuvre is where both worlds unite. Meaningful sacred words are inscribed not as flat script, but as raised sculptural relief that emerges organically from an impasto landscape. It is the sacred harmony of meaning and tactile form.',
    details: [
      { label: 'Surface Profile', value: 'Raised 3D calligraphic lettering over knife strata' },
      { label: 'Light Interaction', value: 'Dual illumination: smooth script sheen against rugged backdrop' },
      { label: 'Tactile Emotion', value: 'A profound spiritual grounding that transforms living space' },
    ],
    quote: '“Every artwork at The Atelier by SK is created by hand... made with care to bring beauty, character, and individuality into your home.”',
    visualClass: 'about-duel__canvas--synthesis',
  },
]

export default function AboutTechniqueDuel() {
  const [activeTab, setActiveTab] = useState(0)
  const [lightPos, setLightPos] = useState({ x: 50, y: 50 })
  const canvasRef = useRef(null)

  const activeTechnique = TECHNIQUES[activeTab]

  const handleMouseMove = (e) => {
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
    setLightPos({ x, y })
  }

  return (
    <section className="about-duel" aria-labelledby="duel-title">
      <div className="about-duel__inner">
        <header className="about-duel__header">
          <span className="about-section-label">The Studio Methodology</span>
          <h2 id="duel-title" className="about-section-title">
            The Dual Harmony: Brush & Palette Knife
          </h2>
          <p className="about-copy">
            A deliberate convergence of opposites—where architectural knife impasto and delicate brush calligraphy converse on a single canvas.
          </p>
        </header>

        {/* Interactive Tab Selectors */}
        <div className="about-duel__tabs" role="tablist" aria-label="Technique comparison">
          {TECHNIQUES.map((tech, idx) => (
            <button
              key={tech.id}
              type="button"
              role="tab"
              aria-selected={activeTab === idx}
              className={`about-duel__tab ${activeTab === idx ? 'about-duel__tab--active' : ''}`}
              onClick={() => setActiveTab(idx)}
            >
              <span className="about-duel__tab-num">0{idx + 1}</span>
              <span className="about-duel__tab-title">{tech.title}</span>
            </button>
          ))}
        </div>

        {/* Display Panel */}
        <div className="about-duel__display">
          {/* Interactive Tactile Swatch with Live Raking Light */}
          <div
            ref={canvasRef}
            className={`about-duel__canvas ${activeTechnique.visualClass}`}
            onMouseMove={handleMouseMove}
            style={{
              '--light-x': `${lightPos.x}%`,
              '--light-y': `${lightPos.y}%`,
            }}
          >
            <div className="about-duel__canvas-light" aria-hidden="true" />
            <div className="about-duel__canvas-texture" aria-hidden="true">
              {activeTab === 0 && (
                <div className="about-duel__texture-art about-duel__texture-art--knife">
                  <div className="about-duel__knife-ridge ridge-1" />
                  <div className="about-duel__knife-ridge ridge-2" />
                  <div className="about-duel__knife-ridge ridge-3" />
                  <div className="about-duel__knife-crest" />
                </div>
              )}
              {activeTab === 1 && (
                <div className="about-duel__texture-art about-duel__texture-art--brush">
                  <svg className="about-duel__brush-svg" viewBox="0 0 400 300" fill="none">
                    <path
                      d="M40,150 C120,60 200,240 280,110 C320,40 370,160 380,180"
                      stroke="var(--gold)"
                      strokeWidth="12"
                      strokeLinecap="round"
                      opacity="0.85"
                    />
                    <path
                      d="M60,180 C140,90 220,260 300,140 C340,70 360,180 370,200"
                      stroke="var(--champagne)"
                      strokeWidth="4"
                      strokeLinecap="round"
                      opacity="0.6"
                    />
                  </svg>
                </div>
              )}
              {activeTab === 2 && (
                <div className="about-duel__texture-art about-duel__texture-art--synthesis">
                  <div className="about-duel__knife-ridge ridge-bg" />
                  <div className="about-duel__script-relief">
                    <span className="about-duel__script-char">ح</span>
                    <span className="about-duel__script-char">ب</span>
                    <span className="about-duel__script-char">نور</span>
                  </div>
                </div>
              )}
            </div>

            <div className="about-duel__canvas-footer">
              <span className="about-duel__canvas-badge">{activeTechnique.badge}</span>
              <span className="about-duel__canvas-hint">Drag cursor to shift raking daylight</span>
            </div>
          </div>

          {/* Technique Dossier & Narrative */}
          <div className="about-duel__content">
            <h3 className="about-duel__content-title">{activeTechnique.title}</h3>
            <span className="about-duel__content-subtitle">{activeTechnique.subtitle}</span>
            <p className="about-copy">{activeTechnique.description}</p>

            <div className="about-duel__specs">
              {activeTechnique.details.map((item, i) => (
                <div key={i} className="about-duel__spec-item">
                  <span className="about-duel__spec-label">{item.label}</span>
                  <span className="about-duel__spec-value">{item.value}</span>
                </div>
              ))}
            </div>

            <blockquote className="about-duel__quote">
              <p>{activeTechnique.quote}</p>
              <cite>— SK, Studio Archive</cite>
            </blockquote>
          </div>
        </div>
      </div>
    </section>
  )
}
