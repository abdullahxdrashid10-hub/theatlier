const PILLARS = [
  {
    num: '01',
    title: 'Acrylics & Mixed Media on Canvas',
    text: 'Every canvas is thoughtfully chosen to complement each artwork’s unique composition, layered with rich artist-grade acrylics and mixed media to produce vibrant, enduring colour depth.',
  },
  {
    num: '02',
    title: 'Dual Mastery: Brush & Palette Knife',
    text: 'A delicate balance between soft brushstrokes for intricate nuance and bold, impasto palette-knife relief that gives each painting living texture and dimensional weight.',
  },
  {
    num: '03',
    title: 'Sculptural Textured Calligraphy',
    text: 'A harmonious dialogue between meaningful, sacred words and tactile relief techniques, allowing expressive lettering to rise gently from the painted surface.',
  },
  {
    num: '04',
    title: 'Handmade Individuality & Care',
    text: 'An entirely hands-on creative journey from the first stroke to the final seal—crafted with intention to infuse your home with warmth, personality, and soul.',
  },
]

export default function AboutMaterialityGrid() {
  return (
    <section className="about-materiality" aria-labelledby="materiality-title">
      <header className="about-materiality__header">
        <span className="about-section-label">Authentic Craftsmanship</span>
        <h2 id="materiality-title" className="about-section-title">
          The Materiality Dossier
        </h2>
        <p className="about-copy">
          From carefully selected canvases to layered impasto ridges, every element is sculpted entirely by hand with patient devotion.
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
