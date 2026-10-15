const PILLARS = [
  {
    num: '01',
    title: 'Belgian Archival Linen',
    text: 'Heavy-weave European natural flax mounted over custom kiln-dried kiln timber stretchers, engineered to support substantial impasto weight without tension loss over decades.',
  },
  {
    num: '02',
    title: 'Mineral Pigments & Gold Leaf',
    text: 'Formulated in-house with artist-grade heavy-body oils, earthen umber, copper leaf, and metallic mineral flake that capture and refract natural ambient light.',
  },
  {
    num: '03',
    title: 'Sculptural Palette Knife Relief',
    text: 'Hand-wielded Italian spring-steel knives carve multidirectional ridges up to eight millimetres high, producing a living sculptural landscape on the canvas.',
  },
  {
    num: '04',
    title: 'Registry & Provenance Seal',
    text: 'Each one-of-one work is catalogued in the studio ledger, signed and dated verso, and accompanied by an artist-embossed Certificate of Authenticity.',
  },
]

export default function AboutMaterialityGrid() {
  return (
    <section className="about-materiality" aria-labelledby="materiality-title">
      <header className="about-materiality__header">
        <span className="about-section-label">Uncompromising Craftsmanship</span>
        <h2 id="materiality-title" className="about-section-title">
          The Materiality Dossier
        </h2>
        <p className="about-copy">
          From the unbleached linen grain to the final archival varnish, every physical component adheres to museum standards.
        </p>
      </header>

      <div className="about-materiality__grid">
        {PILLARS.map((pillar) => (
          <article key={pillar.num} className="about-pillar">
            <span className="about-pillar__num" aria-hidden="true">
              {pillar.num}
            </span>
            <h3 className="about-pillar__title">{pillar.title}</h3>
            <p className="about-pillar__text">{pillar.text}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
