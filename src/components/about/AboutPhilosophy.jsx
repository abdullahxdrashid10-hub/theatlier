export default function AboutPhilosophy() {
  return (
    <section className="about-philosophy" aria-labelledby="philosophy-title">
      <div className="about-philosophy__layout">
        {/* Left Column (60%): Curatorial Narrative */}
        <div className="about-philosophy__narrative">
          <span className="about-section-label">Curatorial Philosophy</span>
          <h2 id="philosophy-title" className="about-section-title">
            The Balance of Texture & Meaning
          </h2>
          <p className="about-copy">
            In an era defined by flat, fleeting digital images, <strong>The Atelier by SK</strong> creates art that invites touch, contemplation, and physical presence. Every artwork is a dedicated dialogue between delicate details and bold, sculptural textures.
          </p>
          <p className="about-copy">
            Working with both brushes and palette knives, SK layers rich acrylics and mixed media to build living depth on canvas. Thick ridges of paint rise from the surface, catching the natural daylight as it shifts through your home—from the soft clarity of morning to the amber warmth of evening lamplight.
          </p>
          <p className="about-copy">
            This tactile philosophy culminates in our signature <strong>textured calligraphy</strong>—where sacred and meaningful words are not merely written, but sculpted into dimensional relief, bridging timeless poetic expression with contemporary fine art.
          </p>
        </div>

        {/* Right Column (40%): Editorial Quote Card */}
        <aside className="about-philosophy__card" aria-label="Artist Reflection">
          <blockquote className="about-philosophy__quote">
            “I love the depth, dimension, and unique textures created by thick paint. It brings each painting to life and gives it a soul.”
          </blockquote>
          <div className="about-philosophy__attribution">
            <div>
              <span className="about-philosophy__author">SK · Founder & Artist</span>
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
