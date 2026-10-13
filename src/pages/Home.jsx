import Hero from '../components/hero/Hero'
import FeaturedWorks from '../components/home/FeaturedWorks'
import StudioIntro from '../components/home/StudioIntro'

export default function Home() {
  return (
    <div className="home-page">
      <title>The Atelier by SK</title>
      <Hero />
      <FeaturedWorks />
      <StudioIntro />
    </div>
  )
}
