import { Link } from 'react-router-dom'

export default function AboutSalonCTA() {
  const handleOpenCurator = () => {
    const trigger = document.getElementById('curator-trigger-btn')
    if (trigger) trigger.click()
  }

  return (
    <section className="about-salon" aria-labelledby="salon-title">
      <div className="about-salon__inner">
        <span className="about-section-label">Bespoke Patronage</span>
        <h2 id="salon-title" className="about-section-title">
          The Private Salon Experience
        </h2>
        <p className="about-copy">
          Whether acquiring a catalog centerpiece or commissioning an original work for a landmark interior, The Atelier provides dedicated personal curation.
        </p>

        <div className="about-salon__features">
          <div className="about-salon__feature-item">
            <h3 className="about-salon__feature-title">White-Glove Art Crating</h3>
            <p className="about-salon__feature-text">
              Each sculpted canvas is prepared in an acid-free moisture barrier and encased in a custom timber-reinforced exhibition crate for insured courier delivery across Pakistan and internationally.
            </p>
          </div>

          <div className="about-salon__feature-item">
            <h3 className="about-salon__feature-title">Salon Viewings by Appointment</h3>
            <p className="about-salon__feature-text">
              Private viewings are hosted for prospective collectors and interior architects seeking to examine impasto relief depth and tonal response under specialized lighting.
            </p>
          </div>

          <div className="about-salon__feature-item">
            <h3 className="about-salon__feature-title">Site-Specific Commissions</h3>
            <p className="about-salon__feature-text">
              Collaborate directly with SK to commission a singular original work proportioned specifically to your residence or corporate collection.
            </p>
          </div>
        </div>

        <div className="about-salon__actions">
          <Link to="/shop" className="btn btn--gilded">
            <span>Explore The Collection</span>
            <span className="btn__arrow" aria-hidden="true">→</span>
          </Link>

          <button
            type="button"
            className="btn btn--framed"
            onClick={handleOpenCurator}
          >
            <span>Consult The Atelier Curator</span>
          </button>

          <Link to="/contact?inquiry=commission" className="btn btn--minimal">
            <span>Request Bespoke Commission</span>
            <span className="btn__arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
