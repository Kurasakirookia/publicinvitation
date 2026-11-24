// Draws the repeating illustration pieces (clouds, mountains, garland,
// flowers, doves, butterflies) as SVG markup. A seeded random keeps every load identical.

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

// Garland drawing units. The swag svg uses a 680 x 300 box.
const GARLAND_W = 680
const GARLAND_H = 300
const STRAND_HALF = 14

// One hanging jasmine strand as its own small svg layer, placed in % of the
// garland box. Swaying a whole layer is cheap; swaying shapes inside one big
// svg repaints every bud on every frame. The delay depends on x, so the
// breeze reads as a wave travelling left to right.
function strand(x: number, top: number, length: number, rand: () => number): string {
  const h = length + 16
  let parts = `<path d="M0 0V${length}" stroke="#7a8f63" stroke-width="1.2"/>`
  for (let y = 6; y < length - 4; y += 8) {
    parts += bud((rand() - 0.5) * 5, y, 2.6 + rand())
    if (rand() > 0.75) parts += leaf(0, y, 12, rand() > 0.5 ? 140 : -140, LEAF_GREENS[0])
  }
  parts += `<g transform="translate(0 ${length + 4})">${BELL}</g>`
  const pct = (n: number, of: number) => round((n / of) * 100)
  const style = [
    `left:${pct(x - STRAND_HALF, GARLAND_W)}%`,
    `top:${pct(top, GARLAND_H)}%`,
    `width:${pct(STRAND_HALF * 2, GARLAND_W)}%`,
    `height:${pct(h, GARLAND_H)}%`,
    `animation-delay:${round(-(x / GARLAND_W) * 1.6)}s`,
  ].join(';')
  return `<svg class="strand" viewBox="${-STRAND_HALF} 0 ${STRAND_HALF * 2} ${h}" style="${style}">${parts}</svg>`
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
  // Strands first, so their tops tuck under the swag.
  return `${strands}<svg class="garland__swag" viewBox="0 0 ${GARLAND_W} ${GARLAND_H}"><path d="M0 14Q340 190 680 14" stroke="#5f7d4c" stroke-width="3" fill="none"/>${leaves}${buds}</svg>`
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

// One feather, drawn along +x from its base, then turned into place.
function feather(x: number, y: number, len: number, w: number, angle: number, fill: string, rib = false): string {
  // Soft, rounded tip: real flight feathers are not pointed.
  const [a, b, c] = [round(len * 0.25), round(len * 0.8), round(len * 0.96)]
  const shape = `<path d="M0 0C${a} ${-w} ${b} ${round(-w * 0.95)} ${c} ${round(-w * 0.45)}Q${len + 1} 0 ${c} ${round(w * 0.45)}C${b} ${round(w * 0.8)} ${a} ${round(w * 0.8)} 0 0Z" fill="url(#${fill})" stroke="#cfc8bd" stroke-width=".5"/>`
  const line = rib ? `<path d="M3 0H${round(len * 0.85)}" stroke="#d9d2c6" stroke-width=".5"/>` : ''
  return `<g transform="translate(${round(x)} ${round(y)}) rotate(${round(angle)})">${shape}${line}</g>`
}

// A raised wing: long flight feathers fanned from the shoulder, short
// coverts over their roots. Back feathers first, so the front ones overlap.
function wing(sx: number, sy: number, from: number, to: number, size: number, fill: string): string {
  let flight = ''
  let coverts = ''
  for (let i = 9; i >= 0; i--) {
    const t = i / 9
    const angle = from + (to - from) * t
    const len = size * (0.62 + 0.4 * Math.sin(Math.PI * (t * 0.8 + 0.15)))
    flight += feather(sx - t * 26, sy + t * 4, round(len), 11, angle, fill, true)
    if (i % 2 === 0) coverts += feather(sx - t * 16, sy + t * 3, round(size * 0.42), 12, angle + 5, fill)
  }
  return flight + coverts + `<ellipse cx="${sx - 6}" cy="${sy - 6}" rx="16" ry="9" transform="rotate(-35 ${sx - 6} ${sy - 6})" fill="url(#${fill})"/>`
}

// A dove in flight facing right, wings raised. Three stacked svg layers
// share one 200 x 160 box: far wing, body, near wing. Each wing is its own
// layer, so flapping moves a layer instead of repainting the bird.
// Light comes from the upper right, so the underside is cool and the back warm.
function dove(): string {
  const layer = (cls: string, inner: string) => `<svg class="${cls}" viewBox="0 0 200 160">${inner}</svg>`
  const tail = [0, 1, 2, 3, 4].map((k) => feather(46, 99, 42, 7, 166 + k * 6, 'feather', true)).join('')
  const body = 'M186 72C184 62 174 55 163 56C152 57 146 64 138 69C120 78 92 82 64 88C52 91 44 94 38 97L40 104C60 108 84 112 108 110C132 108 152 100 166 90C176 84 183 79 186 76Z'
  return layer('wing wing--far', wing(126, 70, -84, -122, 78, 'feather-shade')) + layer('dove__body', `
    ${tail}
    <path d="${body}" fill="url(#dove-body)"/>
    <ellipse cx="150" cy="70" rx="30" ry="11" fill="url(#dove-glow)"/>
    <ellipse cx="112" cy="84" rx="28" ry="8" fill="url(#dove-shade)"/>
    <path d="M104 109q-2 6-6 9M112 109q0 6-3 10" stroke="#d4847a" stroke-width="2" stroke-linecap="round" fill="none"/>
    <path d="M185 70L198 74 185 78Z" fill="#e4a597"/><path d="M186 74H195" stroke="#c97f73" stroke-width=".6"/>
    <circle cx="172" cy="66" r="2.6" fill="#2b2420"/><circle cx="172.8" cy="65.2" r=".8" fill="#fff"/>`) +
    layer('wing wing--near', wing(112, 72, -98, -142, 92, 'feather'))
}

function butterfly(): string {
  const wing = '<path d="M0 0C-6-14-18-16-18-6-18 0-8 2 0 0Z" fill="#e8a457"/><path d="M0 0C-10 4-14 12-8 14-3 14 0 6 0 0Z" fill="#d1803a"/><circle cx="-12" cy="-8" r="1.6" fill="#fff3dc"/>'
  return `<g class="bwing bwing--l">${wing}</g><g class="bwing bwing--r"><g transform="scale(-1 1)">${wing}</g></g><ellipse rx="1.3" ry="7" fill="#5a4030"/>`
}

const ART: Record<string, Draw> = { cloud, mtnFar, mtnMid, mtnNear, garland, flowers, dove, butterfly }

export function paintArt(): void {
  document.querySelectorAll<HTMLElement | SVGElement>('[data-art]').forEach((el) => {
    const name = el.dataset.art ?? ''
    const draw = ART[name]
    if (!draw) throw new Error(`Unknown art piece: "${name}"`)
    el.innerHTML = draw(Number(el.dataset.seed ?? 1))
  })
}
