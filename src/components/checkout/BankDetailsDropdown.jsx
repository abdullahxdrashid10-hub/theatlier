import { useState } from 'react'
import { bankTransferDetails } from '../../config/siteCopy'

export default function BankDetailsDropdown({ initialOpen = true }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const num = bankTransferDetails?.accountNumber || '03362297600'
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(num)
        .then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 2200)
        })
        .catch(() => {
          fallbackCopy(num)
        })
    } else {
      fallbackCopy(num)
    }
  }

  const fallbackCopy = (text) => {
    try {
      const el = document.createElement('textarea')
      el.value = text
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      // ignore
    }
  }

  const details = bankTransferDetails || {
    service: 'Easypaisa',
    accountTitle: 'Samia Khalid',
    accountNumber: '03362297600',
    instructions:
      'Transfer via Easypaisa or any bank app / Raast to 03362297600. After placing your order, kindly share the payment screenshot on WhatsApp with your Order Reference.',
  }

  return (
    <details className="checkout-bank-dropdown" open={initialOpen}>
      <summary className="checkout-bank-dropdown__summary">
        <span className="checkout-bank-dropdown__title">
          <span className="checkout-bank-dropdown__badge">{details.service}</span>
          <span>Account Payment Details</span>
        </span>
        <span className="checkout-bank-dropdown__chevron" aria-hidden="true">
          ▾
        </span>
      </summary>

      <div className="checkout-bank-dropdown__content">
        <div className="checkout-bank-card">
          <div className="checkout-bank-row">
            <span className="checkout-bank-label">Service</span>
            <span className="checkout-bank-val">{details.service}</span>
          </div>

          <div className="checkout-bank-row">
            <span className="checkout-bank-label">Account Title</span>
            <strong className="checkout-bank-val">{details.accountTitle}</strong>
          </div>

          <div className="checkout-bank-row">
            <span className="checkout-bank-label">Account / Mobile</span>
            <div className="checkout-bank-num-wrap">
              <span className="checkout-bank-num">{details.accountNumber}</span>
              <button
                type="button"
                className={`checkout-bank-copy-btn ${copied ? 'checkout-bank-copy-btn--copied' : ''}`}
                onClick={handleCopy}
                title="Copy account number to clipboard"
                aria-label="Copy Easypaisa account number"
              >
                {copied ? '✓ Copied' : '📋 Copy'}
              </button>
            </div>
          </div>

          <p className="checkout-bank-note">
            {details.instructions}
          </p>
        </div>
      </div>
    </details>
  )
}
