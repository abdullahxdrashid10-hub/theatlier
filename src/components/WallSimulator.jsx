import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { lockScroll } from '../utils/scroll'
import '../styles/wall-simulator.css'

export default function WallSimulator({ painting, isOpen, onClose }) {
  const [theme, setTheme] = useState('noir') // 'noir' | 'stone' | 'linen'
  const [furniture, setFurniture] = useState('credenza') // 'credenza' | 'bench' | 'none'
  const [showRuler, setShowRuler] = useState(true)

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    lockScroll(true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      lockScroll(false)
    }
  }, [isOpen, onClose])

  if (!isOpen || !painting) return null

  const widthCm = painting.widthCm || 90
  const heightCm = painting.heightCm || 120
  const widthInches = (widthCm * 0.393701).toFixed(1)
  const heightInches = (heightCm * 0.393701).toFixed(1)

  // Virtual wall height represents a standard 260cm (8.5 ft) gallery ceiling
  // We compute dimensions in vh relative to 260cm so everything is physically proportional
  // A 260cm wall mapped to 62vh => 1 cm = (62 / 260) vh = 0.23846 vh
  const cmToVh = 60 / 260
  const canvasHeightVh = Math.max(12, Math.min(48, heightCm * cmToVh))
  const canvasWidthVh = canvasHeightVh * (widthCm / heightCm)

  // Furniture scale:
  // Credenza: 180cm wide, 72cm tall
  const credenzaWidthVh = 180 * cmToVh
  const credenzaHeightVh = 72 * cmToVh

  // Bench: 150cm wide, 45cm tall
  const benchWidthVh = 150 * cmToVh
  const benchHeightVh = 45 * cmToVh

  const imageSrc = painting.images?.[0] || '/placeholders/placeholder-01.svg'

  return createPortal(
    <div
      className="wall-simulator"
      role="dialog"
      aria-modal="true"
      aria-label={`Scale preview of ${painting.title} in gallery interior`}
    >
      {/* Top Header */}
      <header className="wall-simulator__header">
        <div className="wall-simulator__info">
          <span className="wall-simulator__eyebrow">Architectural Scale Simulator</span>
          <h2 className="wall-simulator__title">{painting.title}</h2>
          <span className="wall-simulator__dimensions">
            {widthCm} × {heightCm} cm ({widthInches} × {heightInches} in) · Proportional 1:1 Scale
          </span>
        </div>

        <div className="wall-simulator__controls">
          {/* Wall Ambiance Toggle */}
          <div className="wall-simulator__btn-group" role="group" aria-label="Wall Interior Palette">
            <button
              type="button"
              className={`wall-simulator__opt-btn ${theme === 'noir' ? 'wall-simulator__opt-btn--active' : ''}`}
              onClick={() => setTheme('noir')}
            >
              Gallery Noir
            </button>
            <button
              type="button"
              className={`wall-simulator__opt-btn ${theme === 'stone' ? 'wall-simulator__opt-btn--active' : ''}`}
              onClick={() => setTheme('stone')}
            >
              Limestone
            </button>
            <button
              type="button"
              className={`wall-simulator__opt-btn ${theme === 'linen' ? 'wall-simulator__opt-btn--active' : ''}`}
              onClick={() => setTheme('linen')}
            >
              Raw Linen
            </button>
          </div>

          {/* Reference Furniture Toggle */}
          <div className="wall-simulator__btn-group" role="group" aria-label="Reference Furniture Context">
            <button
              type="button"
              className={`wall-simulator__opt-btn ${furniture === 'credenza' ? 'wall-simulator__opt-btn--active' : ''}`}
              onClick={() => setFurniture('credenza')}
            >
              Credenza
            </button>
            <button
              type="button"
              className={`wall-simulator__opt-btn ${furniture === 'bench' ? 'wall-simulator__opt-btn--active' : ''}`}
              onClick={() => setFurniture('bench')}
            >
              Bench
            </button>
            <button
              type="button"
              className={`wall-simulator__opt-btn ${furniture === 'none' ? 'wall-simulator__opt-btn--active' : ''}`}
              onClick={() => setFurniture('none')}
            >
              Wall Only
            </button>
          </div>

          {/* Ruler Toggle */}
          <button
            type="button"
            className={`wall-simulator__opt-btn ${showRuler ? 'wall-simulator__opt-btn--active' : ''}`}
            onClick={() => setShowRuler((prev) => !prev)}
            aria-pressed={showRuler}
          >
            {showRuler ? 'Dimensions: On' : 'Dimensions: Off'}
          </button>

          {/* Close Modal */}
          <button
            type="button"
            className="wall-simulator__close-btn"
            onClick={onClose}
            aria-label="Close scale simulator"
          >
            ✕
          </button>
        </div>
      </header>

      {/* Main Room Stage */}
      <div className={`wall-simulator__stage wall-simulator__stage--${theme}`}>
        {/* Floor */}
        <div className="wall-simulator__floor">
          <div className="wall-simulator__floor-shadow" />
        </div>

        {/* 150cm (59") Museum Eye-level Datum Line */}
        {showRuler && (
          <div className="wall-simulator__eye-line" aria-hidden="true">
            <span className="wall-simulator__eye-label">150 cm Museum Eye-Level</span>
          </div>
        )}

        {/* Proportional Artwork Frame on Wall */}
        <div className="wall-simulator__canvas-anchor">
          <div
            className="wall-simulator__canvas-frame"
            style={{
              width: `${canvasWidthVh}vh`,
              height: `${canvasHeightVh}vh`,
            }}
          >
            <img
              src={imageSrc}
              alt={painting.title}
              className="wall-simulator__artwork-img"
            />
          </div>

          {/* Dimension Tags */}
          {showRuler && (
            <>
              <div className="wall-simulator__tag wall-simulator__tag--width" aria-hidden="true">
                <span>↔ {widthCm} cm ({widthInches} in)</span>
              </div>
              <div className="wall-simulator__tag wall-simulator__tag--height" aria-hidden="true">
                <span>↕ {heightCm} cm ({heightInches} in)</span>
              </div>
            </>
          )}
        </div>

        {/* Scaled Architecture Reference Furniture */}
        {furniture === 'credenza' && (
          <div className="wall-simulator__furniture" aria-hidden="true">
            <div
              className="wall-simulator__credenza"
              style={{
                width: `${credenzaWidthVh}vh`,
                height: `${credenzaHeightVh * 0.7}vh`,
              }}
            >
              <span className="wall-simulator__furniture-label">Floating Gallery Credenza (180 cm / 71 in)</span>
            </div>
            <div
              className="wall-simulator__credenza-legs"
              style={{ width: `${credenzaWidthVh * 0.85}vh` }}
            >
              <div className="wall-simulator__credenza-leg" />
              <div className="wall-simulator__credenza-leg" />
            </div>
          </div>
        )}

        {furniture === 'bench' && (
          <div className="wall-simulator__furniture" aria-hidden="true">
            <div
              className="wall-simulator__bench"
              style={{
                width: `${benchWidthVh}vh`,
                height: `${benchHeightVh * 0.45}vh`,
              }}
            >
              <span className="wall-simulator__furniture-label">Gallery Viewing Bench (150 cm / 59 in)</span>
            </div>
            <div
              className="wall-simulator__bench-legs"
              style={{ width: `${benchWidthVh * 0.8}vh` }}
            >
              <div className="wall-simulator__bench-leg" />
              <div className="wall-simulator__bench-leg" />
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation Bar */}
      <footer className="wall-simulator__footer">
        <div className="wall-simulator__footer-hint">
          <span>📐 Ceiling Reference: 260 cm (8.5 ft) standard gallery wall height</span>
        </div>
        <div>
          <span>Press ESC or click ✕ to return to artwork detail</span>
        </div>
      </footer>
    </div>,
    document.body
  )
}
