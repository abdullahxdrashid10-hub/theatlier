import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import AboutHero from '../components/about/AboutHero'
import AboutPhilosophy from '../components/about/AboutPhilosophy'
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
      // Gentle reveal for narrative sections
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

      gsap.from('.about-artisan__inner', {
        y: 28,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '.about-artisan',
          start: 'top 85%',
          once: true,
        },
      })

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
      <AboutHero />
      <AboutPhilosophy />
      <AboutArtisan />
      <AboutDialogue />
      <AboutMaterialityGrid />
      <AboutSalonCTA />
    </main>
  )
}

