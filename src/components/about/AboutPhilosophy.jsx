export default function AboutPhilosophy() {
  return (
    <section className="about-philosophy" aria-labelledby="philosophy-title">
      <div className="about-philosophy__layout">
        {/* Left Column (60%): Curatorial Narrative */}
        <div className="about-philosophy__narrative">
          <span className="about-section-label">Curatorial Philosophy</span>
          <h2 id="philosophy-title" className="about-section-title">
            The Tactile Rejection of Flatness
          </h2>
          <p className="about-copy">
            In an era defined by smooth, backlit glass screens, <strong>The Atelier by SK</strong> reasserts the commanding authority of physical presence. We believe true fine art is dimensional—it demands to be experienced through physical relief, deep shadows, and genuine weight.
          </p>
          <p className="about-copy">
            Every canvas is built using Italian steel palette knives and heavy-body oil formulations. Rather than blending pigments into two-dimensional illusions, SK sculpts <strong>sculptural ridges up to eight millimetres high</strong>. These tactile crests interact dynamically with the daylight in your living space: morning sun illuminates crisp matte contours, while warm evening lamplight catches gold leaf and metallic mineral crests.
          </p>
          <p className="about-copy">
            The result is an artwork that never appears the same twice—a living, shifting conversation between impasto oil, chiaroscuro shadow, and architectural space.
          </p>
        </div>

        {/* Right Column (40%): Editorial Quote Card */}
        <aside className="about-philosophy__card" aria-label="Artist Reflection">
          <blockquote className="about-philosophy__quote">
            “When natural sunlight traverses an impasto canvas, the work breathes. It is never static; it is an organic topography of meditative silence.”
          </blockquote>
          <div className="about-philosophy__attribution">
            <div>
              <span className="about-philosophy__author">SK · Studio Director</span>
            </div>
            <span className="about-philosophy__sig" aria-hidden="true">
              SK
            </span>
          </div>
        </aside>
      </div>
    </section>
  )
}
