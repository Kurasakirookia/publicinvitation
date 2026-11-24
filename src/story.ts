// The scroll story. One pinned stage, one timeline scrubbed by scroll.
// Times are in "scenes". The whole timeline is spread over STORY_LENGTH.

import { gsap } from 'gsap'

const vw = (n: number) => () => (window.innerWidth * n) / 100
const vh = (n: number) => () => (window.innerHeight * n) / 100

// Scroll length of the whole story, as a share of the screen height.
const STORY_LENGTH = '+=550%'

function addScenery(tl: gsap.core.Timeline): void {
  tl
    // 1 to 2: the clouds part and the mountains rise.
    .from('.cloud--l', { x: vw(28), duration: 1.4 }, 0.7)
    .from('.cloud--r', { x: vw(-28), duration: 1.4 }, 0.7)
    .from('.mtn--far', { yPercent: 35, duration: 1.6 }, 0.8)
    .from('.mtn--mid', { yPercent: 55, duration: 1.6 }, 0.8)
    .from('.mtn--near', { yPercent: 80, duration: 1.6 }, 0.8)
    // 3: two columns arrive and form a gate, then the garland drops.
    .from('.ledge', { yPercent: 100, duration: 0.9 }, 2.1)
    .from('.column--l', { x: vw(-55), duration: 1.4, ease: 'power3.out' }, 2.3)
    .from('.column--r', { x: vw(55), duration: 1.4, ease: 'power3.out' }, 2.3)
    // Start a full screen-height above, so it is hidden whatever the pillar height.
    .from('.garland', { y: vh(-75), duration: 1, ease: 'power2.out' }, 3.5)
    // 4: one dove from each side, meeting face to face above the gate.
    .from('.dove--l', { x: vw(-70), y: vh(22), rotate: -14, duration: 1.5, ease: 'power2.out' }, 5.0)
    .from('.dove--r', { x: vw(70), y: vh(-18), rotate: 14, duration: 1.5, ease: 'power2.out' }, 5.0)
    // 5: we pass through the gate into warm light and flowers.
    .to('.gate', { scale: 2.6, autoAlpha: 0, duration: 1.4, ease: 'power2.in' }, 7.6)
    .to('.dove--l', { x: vw(-40), y: vh(-50), duration: 1.2, ease: 'power1.in' }, 7.6)
    .to('.dove--r', { x: vw(40), y: vh(-50), duration: 1.2, ease: 'power1.in' }, 7.6)
    .to('.mountains', { scale: 1.12, duration: 1.4 }, 7.6)
    .to('.clouds', { scale: 1.1, duration: 1.4 }, 7.6)
    .to('.warmth', { opacity: 1, duration: 1.4 }, 7.6)
    .from('.flowers', { yPercent: 100, duration: 1.2, ease: 'power2.out' }, 8.2)
}

function addWords(tl: gsap.core.Timeline, isCalm: boolean): void {
  const lift = isCalm ? 0 : 24
  const show = (target: string, at: number) =>
    tl.fromTo(target, { autoAlpha: 0, y: lift }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, at)
  const hide = (target: string, at: number) =>
    tl.to(target, { autoAlpha: 0, y: -lift, duration: 0.4, ease: 'power2.in' }, at)

  hide('.beat--1', 0.5)
  show('.beat--2', 1.3)
  show('.beat--2 .line:nth-child(1)', 1.3)
  show('.beat--2 .line:nth-child(2)', 3.1)
  hide('.beat--2', 4.1)
  show('.beat--3', 4.4)
  hide('.beat--3', 5.7)
  show('.beat--4', 6.1)
  hide('.beat--4', 7.5)
  show('.beat--5', 8.8)
  show('.card__blessing', 9.8)
  // Hold the final card on screen for the last stretch of scrolling.
  tl.to({}, { duration: 0.8 }, 10.3)
}

export function buildStory(isCalm: boolean): void {
  const tl = gsap.timeline({
    defaults: { ease: 'power2.inOut' },
    scrollTrigger: {
      trigger: '.stage',
      start: 'top top',
      end: STORY_LENGTH,
      pin: true,
      // Follow the finger exactly. Lenis already smooths the wheel on desktop,
      // and any extra catch-up reads as lag on a phone.
      scrub: true,
      invalidateOnRefresh: true,
    },
  })
  // With reduced motion the scene stays still and only the words change.
  if (!isCalm) addScenery(tl)
  addWords(tl, isCalm)
}
