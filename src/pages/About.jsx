import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import AboutHero from '../components/about/AboutHero'
import AboutLedger from '../components/about/AboutLedger'
import AboutPhilosophy from '../components/about/AboutPhilosophy'
import AboutTechniqueDuel from '../components/about/AboutTechniqueDuel'
import AboutArtisan from '../components/about/AboutArtisan'
import AboutDialogue from '../components/about/AboutDialogue'
import AboutMaterialityGrid from '../components/about/AboutMaterialityGrid'
import AboutSalonCTA from '../components/about/AboutSalonCTA'
import '../styles/about.css'

gsap.registerPlugin(ScrollTrigger)

export default function About() {
  const pageRef = useRef(null)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const ctx = gsap.context(() => {
      // Ledger reveal
      gsap.from('.about-ledger__item', {
        y: 20,
        opacity: 0,
        duration: 0.65,
        stagger: 0.1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '.about-ledger',
          start: 'top 88%',
          once: true,
        },
      })

      // Philosophy reveal
      gsap.from('.about-philosophy__layout', {
        y: 28,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '.about-philosophy',
          start: 'top 85%',
          once: true,
        },
      })

      // Duel showcase reveal
      gsap.from('.about-duel__display', {
        y: 32,
        opacity: 0,
        duration: 0.85,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '.about-duel',
          start: 'top 85%',
          once: true,
        },
      })

      // Artisan montage reveal
      gsap.from('.about-artisan__frame', {
        y: 30,
        opacity: 0,
        duration: 0.75,
        stagger: 0.15,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '.about-artisan__montage',
          start: 'top 85%',
          once: true,
        },
      })

      // Dialogue reveal
      gsap.from('.about-dialogue__inner', {
        y: 28,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '.about-dialogue',
          start: 'top 85%',
          once: true,
        },
      })

      // Pillars reveal
      gsap.from('.about-pillar', {
        y: 24,
        opacity: 0,
        duration: 0.7,
        stagger: 0.12,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '.about-materiality__grid',
          start: 'top 88%',
          once: true,
        },
      })

      // Salon CTA reveal
      gsap.from('.about-salon__inner', {
        y: 24,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '.about-salon',
          start: 'top 85%',
          once: true,
        },
      })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  return (
    <main ref={pageRef} className="about-page">
      <title>The Atelier & Artist SK — Studio Provenance</title>

      {/* Atmospheric Editorial Ghost Watermarks */}
      <div className="about-watermark about-watermark--1" aria-hidden="true">
        L’ATELIER
      </div>
      <div className="about-watermark about-watermark--2" aria-hidden="true">
        IMPASTO
      </div>
      <div className="about-watermark about-watermark--3" aria-hidden="true">
        PROVENANCE
      </div>

      <AboutHero />
      <AboutLedger />
      <AboutPhilosophy />
      <AboutTechniqueDuel />
      <AboutArtisan />
      <AboutDialogue />
      <AboutMaterialityGrid />
      <AboutSalonCTA />
    </main>
  )
}

