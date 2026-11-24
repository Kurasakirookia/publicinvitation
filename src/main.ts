import './styles.css'

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { paintArt } from './art'
import { buildStory } from './story'

gsap.registerPlugin(ScrollTrigger)
// Phone address bars resize the viewport while scrolling. Ignore that jump.
ScrollTrigger.config({ ignoreMobileResize: true })

paintArt()

const isCalm = matchMedia('(prefers-reduced-motion: reduce)').matches

if (!isCalm) {
  const lenis = new Lenis({ lerp: 0.08 })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
}

buildStory(isCalm)

// Text sizes change once the fonts arrive, so measure again.
document.fonts.ready.then(() => ScrollTrigger.refresh())
