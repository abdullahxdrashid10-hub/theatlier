const METRICS = [
  {
    num: '100%',
    label: 'Handmade Originals',
    detail: 'Every canvas is shaped entirely by hand. Strictly zero giclées, prints, or digital reproductions.',
  },
  {
    num: 'Dual Harmony',
    label: 'Brush & Palette Knife',
    detail: 'Delicate calligraphic nuance converges with bold, sculptural impasto ridges up to 8mm deep.',
  },
  {
    num: 'One-of-One',
    label: 'Singular Provenance',
    detail: 'Each piece is an unrepeatable physical original, inscribed and catalogued in the studio registry.',
  },
  {
    num: '14 Days',
    label: 'Layering & Natural Curing',
    detail: 'Patient multi-week strata building, allowing artist-grade acrylics and mixed media to cure naturally.',
  },
]

export default function AboutLedger() {
  return (
    <section className="about-ledger" aria-label="The Studio Ledger & Standards">
      <div className="about-ledger__inner">
        <header className="about-ledger__header">
          <span className="about-section-label">Studio Ledger & Standards</span>
          <h2 className="about-ledger__title">The Disciplines of Provenance</h2>
        </header>

        <div className="about-ledger__grid">
          {METRICS.map((metric, i) => (
            <div key={i} className="about-ledger__item">
              <span className="about-ledger__num">{metric.num}</span>
              <span className="about-ledger__label">{metric.label}</span>
              <p className="about-ledger__detail">{metric.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
