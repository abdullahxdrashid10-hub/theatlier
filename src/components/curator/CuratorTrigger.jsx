export default function CuratorTrigger({ isOpen, onClick }) {
  return (
    <button
      type="button"
      className="curator-trigger"
      onClick={onClick}
      aria-label="Consult The Atelier Curator — AI Private Art Advisory"
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      id="curator-trigger-btn"
    >
      <div className="curator-trigger__seal" aria-hidden="true">
        {/* Monogram / Feather Quill Glyph */}
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="curator-trigger__pulse" />
      </div>

      <div className="curator-trigger__text" aria-hidden="true">
        <span className="curator-trigger__title">Curator’s Desk</span>
        <span className="curator-trigger__sub">Private Art Concierge</span>
      </div>
    </button>
  )
}
