// Draws the repeating illustration pieces (clouds, garland, flowers, doves,
// butterflies) as SVG markup. A seeded random keeps every load identical.

type Draw = (seed: number) => string

function seeded(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const round = (n: number) => Math.round(n * 10) / 10

// Soft layered cloud: a blurred cool underside, a body, and a warm lit top
// on the sun side (right). Puff sizes vary so no two clouds match.
function cloud(seed: number): string {
  const rand = seeded(seed)
  const count = 7 + Math.floor(rand() * 5)
  const puffs = Array.from({ length: count }, (_, i) => {
    const t = (i + 0.5) / count
    const rad = 24 + (14 + rand() * 26) * Math.sin(Math.PI * t)
    return { x: round(40 + t * 320 + (rand() - 0.5) * 20), y: round(112 - rad * (0.5 + rand() * 0.4)), rad: round(rad) }
  })
  const circles = (fill: string, dx: number, dy: number, scale: number, pick = () => true) =>
    puffs.filter(pick).map((p) => `<circle cx="${p.x + dx}" cy="${p.y + dy}" r="${round(p.rad * scale)}" fill="${fill}"/>`).join('')
  return `<g opacity=".95">
    <ellipse cx="200" cy="122" rx="170" ry="16" fill="#c6d3e4" filter="url(#soft-lg)"/>
    <g filter="url(#soft-sm)">${circles('#d6e0ec', 0, 7, 1)}${circles('#f1f5fa', 2, 0, 0.92)}</g>
    <g filter="url(#soft-lg)" opacity=".75">${circles('#fffaf1', 8, -8, 0.7)}</g>
  </g>`
}

// Mountain ridge from layered "ridged" sine waves: sharp peaks, round valleys.
function ridge(seed: number, base: number, amp: number): number[][] {
  const rand = seeded(seed)
  const [p1, p2, p3] = [rand() * 6, rand() * 6, rand() * 6]
  const points: number[][] = []
  for (let x = 0; x <= 1000; x += 8) {
    const h =
      0.6 * (1 - Math.abs(Math.sin(x / 170 + p1))) +
      0.28 * (1 - Math.abs(Math.sin(x / 71 + p2))) +
      0.12 * Math.sin(x / 23 + p3) * rand()
    points.push([x, round(base - amp * h)])
  }
  return points
}

const ridgePath = (pts: number[][]) => `M${pts.map((p) => p.join(' ')).join('L')}V400H0Z`

function mountains(fill: string, pts: number[][], extra = ''): string {
  const d = ridgePath(pts)
  return `<path d="${d}" fill="url(#${fill})"/>${extra}<path d="${d}" fill="url(#haze)"/>`
}

// Snow on the peaks: the ridge line above a height, closed by a ragged edge below it.
function snow(pts: number[][], line: number, rand: () => number): string {
  let out = ''
  let run: number[][] = []
  const flush = () => {
    if (run.length > 2) {
      const lower = [...run].reverse().map(([x, y]) => [x, round(Math.min(line + 6, y + 8 + rand() * 12))])
      out += `<path d="M${[...run, ...lower].map((p) => p.join(' ')).join('L')}Z" fill="#f6f7fb"/>`
    }
    run = []
  }
  pts.forEach((p) => (p[1] < line ? run.push(p) : flush()))
  flush()
  return out
}

function mtnFar(seed: number): string {
  return mountains('mtn-far', ridge(seed, 250, 150))
}

function mtnMid(seed: number): string {
  const pts = ridge(seed, 300, 160)
  return mountains('mtn-mid', pts, snow(pts, 185, seeded(seed + 1)))
}

function mtnNear(seed: number): string {
  const rand = seeded(seed)
  const pts: number[][] = []
  for (let x = 0; x <= 1000; x += 20) pts.push([x, round(330 - 22 * Math.sin(x / 140 + rand() * 0.3) - 10 * Math.sin(x / 57))])
  return mountains('mtn-near', pts)
}

const LEAF_GREENS = ['#56784a', '#6f8f5a', '#83a36b']

function leaf(x: number, y: number, len: number, angle: number, fill: string): string {
  const w = len * 0.32
  return `<path transform="translate(${round(x)} ${round(y)}) rotate(${round(angle)})" fill="${fill}" d="M0 0C${w} ${-len / 3} ${w} ${(-2 * len) / 3} 0 ${-len}C${-w} ${(-2 * len) / 3} ${-w} ${-len / 3} 0 0Z"/>`
}

function bud(x: number, y: number, r: number): string {
  return `<ellipse cx="${round(x)}" cy="${round(y)}" rx="${round(r)}" ry="${round(r * 1.25)}" fill="#fffdf6" stroke="#e8dfc9" stroke-width=".6"/>`
}

const BELL = '<path d="M-6 0Q-6-11 0-11 6-11 6 0L8 3H-8Z" fill="url(#gold)"/><circle cy="5" r="2" fill="#9a7433"/>'

// One hanging jasmine strand. The sway delay depends on x, so a breeze
// reads as a wave travelling left to right.
function strand(x: number, top: number, length: number, rand: () => number): string {
  let parts = `<path d="M${x} ${top}V${top + length}" stroke="#7a8f63" stroke-width="1.2"/>`
  for (let y = top + 6; y < top + length - 4; y += 8) {
    parts += bud(x + (rand() - 0.5) * 5, y, 2.6 + rand())
    if (rand() > 0.75) parts += leaf(x, y, 12, rand() > 0.5 ? 140 : -140, LEAF_GREENS[0])
  }
  parts += `<g transform="translate(${x} ${top + length + 4})">${BELL}</g>`
  const delay = round(-(x / 680) * 1.6)
  return `<g class="strand" style="animation-delay:${delay}s">${parts}</g>`
}

function garland(seed: number): string {
  const rand = seeded(seed)
  // The swag is one quadratic curve between the two column tops.
  const at = (t: number) => [
    2 * (1 - t) * t * 340 + t * t * 680,
    (1 - t) ** 2 * 14 + 2 * (1 - t) * t * 190 + t * t * 14,
  ]
  let leaves = ''
  let buds = ''
  for (let i = 0; i <= 64; i++) {
    const [x, y] = at(i / 64)
    leaves += leaf(x, y, 16 + rand() * 8, rand() * 360, LEAF_GREENS[i % 3])
    for (let k = 0; k < 3; k++) buds += bud(x + (rand() - 0.5) * 12, y + (rand() - 0.5) * 10, 2.6 + rand() * 1.4)
  }
  const strands = [8, 672, 170, 510, 340]
    .map((x, i) => strand(x, i < 2 ? 18 : at(x / 680)[1] + 4, i < 2 ? 210 : i === 4 ? 80 : 110, rand))
    .join('')
  return `<path d="M0 14Q340 190 680 14" stroke="#5f7d4c" stroke-width="3" fill="none"/>${strands}${leaves}${buds}`
}

function flower(x: number, y: number, size: number, rot: number): string {
  const petals = Array.from(
    { length: 5 },
    (_, i) => `<ellipse cy="${round(-size * 0.55)}" rx="${round(size * 0.3)}" ry="${round(size * 0.55)}" transform="rotate(${i * 72})" fill="url(#petal)" stroke="#efe6d2" stroke-width=".8"/>`,
  ).join('')
  return `<g transform="translate(${round(x)} ${round(y)}) rotate(${round(rot)})">${petals}<circle r="${round(size * 0.12)}" fill="#e9b94f"/></g>`
}

// A corner cluster: leaves fanning up from the bottom corner, blooms on top.
function flowers(seed: number): string {
  const rand = seeded(seed)
  let leaves = ''
  for (let i = 0; i < 11; i++) {
    leaves += leaf(20 + rand() * 160, 330, 120 + rand() * 120, -10 + i * 8 + rand() * 6, LEAF_GREENS[i % 3])
  }
  let blooms = ''
  for (let i = 0; i < 14; i++) {
    const x = 10 + rand() * 300
    const y = 150 + rand() * 160 + x * 0.12
    blooms += flower(x, y, 22 + rand() * 26, rand() * 72)
  }
  return leaves + blooms
}

function dove(): string {
  return `
    <path class="wing wing--back" fill="#e4eaf2" d="M66 44C60 30 58 16 60 2 72 10 82 26 84 42Z"/>
    <path fill="#fbfcfe" d="M8 50L22 46C34 42 52 40 70 42 84 43 94 38 102 33 108 29 116 30 118 35L126 36 118 39C114 46 100 56 80 58 60 60 40 58 26 54L6 60Z"/>
    <path fill="#dde4ee" d="M30 54C50 58 70 58 88 54 80 60 60 62 40 59Z"/>
    <circle cx="112" cy="34" r="1.5" fill="#3b3b44"/>
    <g class="wing wing--front"><path fill="#fff" stroke="#dfe6ef" d="M58 44C50 30 44 16 38 2 56 8 72 22 80 42Z"/><path d="M50 28L62 34M45 17L57 25" stroke="#dfe6ef" fill="none"/></g>`
}

function butterfly(): string {
  const wing = '<path d="M0 0C-6-14-18-16-18-6-18 0-8 2 0 0Z" fill="#e8a457"/><path d="M0 0C-10 4-14 12-8 14-3 14 0 6 0 0Z" fill="#d1803a"/><circle cx="-12" cy="-8" r="1.6" fill="#fff3dc"/>'
  return `<g class="bwing bwing--l">${wing}</g><g class="bwing bwing--r"><g transform="scale(-1 1)">${wing}</g></g><ellipse rx="1.3" ry="7" fill="#5a4030"/>`
}

const ART: Record<string, Draw> = { cloud, mtnFar, mtnMid, mtnNear, garland, flowers, dove, butterfly }

export function paintArt(): void {
  document.querySelectorAll<SVGElement>('[data-art]').forEach((el) => {
    const name = el.dataset.art ?? ''
    const draw = ART[name]
    if (!draw) throw new Error(`Unknown art piece: "${name}"`)
    el.innerHTML = draw(Number(el.dataset.seed ?? 1))
  })
}
