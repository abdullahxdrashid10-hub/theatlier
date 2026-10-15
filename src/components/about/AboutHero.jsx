export default function AboutHero() {
  return (
    <header className="about-hero" aria-label="Studio Sanctuary Introduction">
      {/* Ambient Backdrop with Decorative Texture */}
      <div className="about-hero__backdrop" aria-hidden="true" />

      {/* Decorative Canvas Impasto Texture Vector */}
      <svg
        className="about-hero__texture-svg"
        viewBox="0 0 1200 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        preserveAspectRatio="none"
      >
        <path
          d="M0 120C180 80 340 180 500 130C660 80 820 220 980 160C1100 110 1180 180 1200 200V600H0V120Z"
          fill="url(#goldRelief1)"
        />
        <path
          d="M0 240C220 190 380 320 600 260C800 200 960 360 1200 300V600H0V240Z"
          fill="url(#goldRelief2)"
        />
        <defs>
          <linearGradient id="goldRelief1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D0A971" stopOpacity="0.12" />
            <stop offset="50%" stopColor="#876D4F" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#0C0B09" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="goldRelief2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#D0A971" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#0C0B09" stopOpacity="0.3" />
          </linearGradient>
        </defs>
      </svg>

      <div className="about-hero__inner">
        <span className="about-hero__eyebrow">The Atelier by SK · Studio Provenance</span>
        <h1 className="about-hero__title">Sculpting Light, Shadow & Form</h1>
        <div className="about-hero__hairline" aria-hidden="true" />
        <p className="about-hero__epigraph">
          “Canvas is not a flat boundary to be coloured. It is a dimensional plane where thick oil and metal pigment are sculpted into living topography.”
        </p>
      </div>
    </header>
  )
}
