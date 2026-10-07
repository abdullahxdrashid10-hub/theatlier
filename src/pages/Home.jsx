import Hero from '../components/hero/Hero'

export default function Home() {
  return (
    <>
      <title>The Atelier by SK</title>
      <Hero />
      <section
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderTop: '1px solid var(--line)',
          background: 'var(--bg)',
          color: 'var(--taupe)',
          fontFamily: 'var(--font-heading)',
          fontSize: 'var(--text-lg)',
          letterSpacing: 'var(--tracking-wide)',
          textTransform: 'uppercase',
          padding: 'var(--gutter)',
          textAlign: 'center',
        }}
      >
        <span>TODO M1.3 — Featured Works &amp; Studio Introduction</span>
      </section>
    </>
  )
}
