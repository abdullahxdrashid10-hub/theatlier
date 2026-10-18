import { Link } from 'react-router-dom'
import siteCopy from '../config/siteCopy'
import '../styles/about.css'

export default function About() {
  return (
    <main className="about-page" aria-labelledby="about-heading">
      <title>About — The Atelier by SK</title>

      <section className="about-content">
        <div className="about-content__inner">
          <header className="about-content__header">
            <span className="about-content__eyebrow">
              Contemporary · Luxury · Handmade Art
            </span>
            <h1 id="about-heading" className="about-content__statement">
              Every painting is a hands-on creative process, made with care to bring beauty, character, and individuality into your home.
            </h1>
            <div className="about-content__hairline" aria-hidden="true" />
          </header>

          <div className="about-content__body">
            <p className="about-content__text">
              I create handmade paintings using acrylic paints on canvas, working with both brushes and palette knives to create beautiful details and textures. My calligraphy combines painted and textured techniques, bringing words and art together in unique, expressive pieces.
            </p>
          </div>

          {(siteCopy.showCommissionNote || siteCopy.showWorldwideShippingNote) && (
            <aside className="about-content__notes" aria-label="Studio policies">
              {siteCopy.showCommissionNote && (
                <p className="about-content__note">
                  {siteCopy.commissionNote || siteCopy.commissionNoteText}
                </p>
              )}
              {siteCopy.showWorldwideShippingNote && (
                <p className="about-content__note">
                  {siteCopy.worldwideShippingNote || siteCopy.worldwideShippingNoteText}
                </p>
              )}
            </aside>
          )}

          <div className="about-content__actions">
            <Link to="/shop" className="btn btn--gilded">
              <span>Explore the collection</span>
              <span className="btn__arrow" aria-hidden="true">&rarr;</span>
            </Link>
            <Link to="/contact" className="btn btn--minimal">
              <span>Contact the studio</span>
              <span className="btn__arrow" aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
