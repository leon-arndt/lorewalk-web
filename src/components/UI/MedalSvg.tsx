import type { MedalConfig } from '@/data/medals'

interface Props {
  config: MedalConfig
  size?: number
}

const MX = 90, MY = 168, ORIM = 84, FACE = 70, TR = 78

const GOLD = `
  <stop offset="0%"   stop-color="#fefce8"/>
  <stop offset="14%"  stop-color="#fde047"/>
  <stop offset="42%"  stop-color="#ca8a04"/>
  <stop offset="78%"  stop-color="#854d0e"/>
  <stop offset="100%" stop-color="#3a1a00"/>`

function buildDesign(id: string): string {
  switch (id) {
    case 'bak_kwa':
      return `<g transform="translate(${MX},${MY}) rotate(-14)">
        <rect x="-32" y="-26" width="64" height="52" rx="8" fill="white" opacity="0.9"/>
        <g stroke="#b45309" stroke-width="2" stroke-linecap="round" opacity="0.55">
          <line x1="-32" y1="-8"  x2="32" y2="-8"/>
          <line x1="-32" y1="8"   x2="32" y2="8"/>
          <line x1="-10" y1="-26" x2="-10" y2="26"/>
          <line x1="10"  y1="-26" x2="10"  y2="26"/>
        </g>
        <rect x="-30" y="-24" width="28" height="10" rx="4" fill="white" opacity="0.25"/>
      </g>`

    case 'yu_sheng':
      return `<g transform="translate(${MX},${MY})">
        <ellipse cx="0" cy="14" rx="36" ry="16" fill="white" opacity="0.85"/>
        <g stroke="white" stroke-width="1.8" stroke-linecap="round" opacity="0.6">
          <line x1="0" y1="8" x2="0"   y2="-28"/>
          <line x1="0" y1="8" x2="22"  y2="-22"/>
          <line x1="0" y1="8" x2="-22" y2="-22"/>
          <line x1="0" y1="8" x2="32"  y2="-4"/>
          <line x1="0" y1="8" x2="-32" y2="-4"/>
          <line x1="0" y1="8" x2="30"  y2="10"/>
          <line x1="0" y1="8" x2="-30" y2="10"/>
        </g>
        <circle cx="-22" cy="-8"  r="4"   fill="white" opacity="0.8"/>
        <circle cx="26"  cy="-6"  r="3.5" fill="white" opacity="0.7"/>
        <circle cx="8"   cy="-30" r="3"   fill="white" opacity="0.7"/>
        <circle cx="-12" cy="-22" r="2.5" fill="white" opacity="0.65"/>
        <line x1="-44" y1="-32" x2="-12" y2="22" stroke="white" stroke-width="2.4" stroke-linecap="round" opacity="0.8"/>
        <line x1="-36" y1="-32" x2="-4"  y2="22" stroke="white" stroke-width="2.4" stroke-linecap="round" opacity="0.8"/>
      </g>`

    case 'ketupat':
      return `<g transform="translate(${MX},${MY}) rotate(45) scale(1.1)">
        <rect x="-28" y="-28" width="56" height="56" rx="5" fill="white" opacity="0.88"/>
        <g stroke="#064e3b" stroke-width="1.4" opacity="0.4">
          <line x1="-28" y1="-9.3" x2="28" y2="-9.3"/>
          <line x1="-28" y1="0"    x2="28" y2="0"/>
          <line x1="-28" y1="9.3"  x2="28" y2="9.3"/>
          <line x1="-9.3" y1="-28" x2="-9.3" y2="28"/>
          <line x1="0"    y1="-28" x2="0"    y2="28"/>
          <line x1="9.3"  y1="-28" x2="9.3"  y2="28"/>
        </g>
        <rect x="-26" y="-26" width="28" height="11" rx="3" fill="white" opacity="0.18"/>
      </g>`

    case 'kueh_lapis': {
      const colours = ['#99f6e4','#f0fdf4','#6ee7b7','#fff','#a7f3d0','#d1fae5','#fff']
      const lh = 8, total = colours.length * lh, y0 = -total / 2
      const rows = colours.map((c, i) =>
        `<rect x="${MX - 32}" y="${MY + y0 + i * lh}" width="64" height="${lh}"
          fill="${c}" opacity="${i % 2 === 0 ? '0.82' : '0.55'}"/>`
      ).join('')
      return `<rect x="${MX - 32}" y="${MY + y0}" width="64" height="${total}" rx="7" fill="white" opacity="0.9"/>
        <clipPath id="klFC"><rect x="${MX - 32}" y="${MY + y0}" width="64" height="${total}" rx="7"/></clipPath>
        <g clip-path="url(#klFC)">${rows}</g>
        <rect x="${MX - 32}" y="${MY + y0}" width="64" height="${total}" rx="7" fill="none" stroke="white" stroke-width="2" opacity="0.5"/>
        <rect x="${MX - 32}" y="${MY + y0 - 2}" width="64" height="8" rx="4" fill="white" opacity="0.3"/>`
    }

    case 'ondeh_ondeh': {
      const positions: [number, number][] = [[-22, 10], [22, 10], [0, -14]]
      const coconut: [number, number][] = [[-7,-3],[7,-3],[0,7],[11,1],[-11,1],[5,9],[-5,9],[0,-10]]
      return positions.map(([bx, by]) => `
        <circle cx="${MX + bx}" cy="${MY + by}" r="16" fill="white" opacity="0.88"/>
        ${coconut.map(([dx, dy]) =>
          `<ellipse cx="${MX+bx+dx}" cy="${MY+by+dy}" rx="2.2" ry="1" fill="#a16207"
            opacity="0.35" transform="rotate(${(dx*dy)%60},${MX+bx+dx},${MY+by+dy})"/>`
        ).join('')}
        <circle cx="${MX+bx-5}" cy="${MY+by-5}" r="5" fill="white" opacity="0.25"/>
      `).join('')
    }

    case 'biryani':
      return `<g transform="translate(${MX},${MY})">
        <path d="M -36,22 Q -36,42 0,42 Q 36,42 36,22 L 31,22 Q 31,36 0,36 Q -31,36 -31,22Z"
              fill="white" opacity="0.7"/>
        <ellipse cx="0" cy="22" rx="36" ry="11" fill="white" opacity="0.55"/>
        <path d="M -31,22 Q -30,-12 0,-20 Q 30,-12 31,22Z" fill="white" opacity="0.9"/>
        <g stroke="#b45309" stroke-width="1.1" stroke-linecap="round" opacity="0.38">
          <line x1="-18" y1="2"   x2="-9"  y2="2"/>
          <line x1="-5"  y1="-4"  x2="6"   y2="-4"/>
          <line x1="10"  y1="2"   x2="20"  y2="2"/>
          <line x1="-14" y1="10"  x2="-4"  y2="10"/>
          <line x1="2"   y1="12"  x2="16"  y2="12"/>
          <line x1="-24" y1="16"  x2="-14" y2="16"/>
          <line x1="14"  y1="16"  x2="24"  y2="16"/>
          <line x1="-6"  y1="-12" x2="4"   y2="-12"/>
        </g>
        <ellipse cx="22" cy="-6"  rx="5" ry="3" fill="white" opacity="0.6" transform="rotate(-35,${MX+22},${MY-6})"/>
        <ellipse cx="28" cy="-13" rx="5" ry="3" fill="white" opacity="0.5" transform="rotate(-65,${MX+28},${MY-13})"/>
        <line x1="22" y1="-6" x2="28" y2="-13" stroke="white" stroke-width="1.2" opacity="0.55"/>
      </g>`

    case 'chilli_crab':
      return `<g transform="translate(${MX},${MY})">
        <ellipse cx="0" cy="4" rx="24" ry="17" fill="white" opacity="0.88"/>
        <line x1="-12" y1="-14" x2="-14" y2="-20" stroke="white" stroke-width="2" opacity="0.7"/>
        <line x1=" 12" y1="-14" x2=" 14" y2="-20" stroke="white" stroke-width="2" opacity="0.7"/>
        <circle cx="-14" cy="-22" r="4" fill="white" opacity="0.88"/>
        <circle cx=" 14" cy="-22" r="4" fill="white" opacity="0.88"/>
        <circle cx="-14" cy="-22" r="2" fill="#b91c1c" opacity="0.55"/>
        <circle cx=" 14" cy="-22" r="2" fill="#b91c1c" opacity="0.55"/>
        <path d="M -24,8 C -40,2 -48,-10 -40,-20 C -33,-29 -24,-18 -24,8Z" fill="white" opacity="0.88"/>
        <path d="M -40,-20 C -44,-25 -40,-32 -35,-27Z" fill="white" opacity="0.75"/>
        <path d="M  24,8 C  40,2  48,-10  40,-20 C  33,-29  24,-18  24,8Z" fill="white" opacity="0.88"/>
        <path d="M  40,-20 C  44,-25  40,-32  35,-27Z" fill="white" opacity="0.75"/>
        <g stroke="white" stroke-width="2.2" stroke-linecap="round" opacity="0.6" fill="none">
          <path d="M -20,10 C -28,18 -30,28 -24,32"/>
          <path d="M -13,16 C -17,24 -15,32  -8,35"/>
          <path d="M  20,10 C  28,18  30,28  24,32"/>
          <path d="M  13,16 C  17,24  15,32   8,35"/>
        </g>
        <path d="M -7,20 Q -4,32 -5,42 Q -2,46 0,42 Q 2,46 5,42 Q 4,32 7,20Z"
              fill="white" opacity="0.42"/>
      </g>`

    case 'chicken_rice':
      return `<g transform="translate(${MX},${MY})">
        <ellipse cx="-26" cy="22" rx="21" ry="13" fill="white" opacity="0.75"/>
        <g fill="white" opacity="0.4">
          <circle cx="-34" cy="20" r="1.8"/>
          <circle cx="-26" cy="16" r="1.8"/>
          <circle cx="-18" cy="22" r="1.8"/>
          <circle cx="-30" cy="26" r="1.8"/>
          <circle cx="-22" cy="27" r="1.8"/>
        </g>
        <path d="M -16,-10 Q -16,-34 8,-36 Q 32,-34 32,-10 Q 32,8 20,16 Q 14,20 14,30
                 Q 14,36 20,36 L 20,38 L 4,38 L 4,30 Q 4,20 -6,16 Q -16,8 -16,-10Z"
              fill="white" opacity="0.9"/>
        <path d="M -2,-32 Q 8,-26 18,-32" fill="none" stroke="#92400e" stroke-width="1.5" opacity="0.35"/>
        <ellipse cx="12" cy="39" rx="10" ry="4.5" fill="white" opacity="0.75"/>
        <ellipse cx="42" cy="4"  rx="8" ry="6" fill="white" opacity="0.68"/>
        <ellipse cx="46" cy="16" rx="8" ry="6" fill="white" opacity="0.58"/>
      </g>`

    case 'mooncake':
      return `<g transform="translate(${MX},${MY})">
        <rect x="-32" y="-32" width="64" height="64" rx="12" fill="white" opacity="0.9"/>
        <rect x="-26" y="-26" width="52" height="52" rx="8" fill="none" stroke="white" stroke-width="1.5" opacity="0.45"/>
        <g fill="white" opacity="0.55">
          <path d="M 0,-20 Q 9,-10 0,0 Q -9,-10 0,-20Z"/>
          <path d="M 0, 20 Q 9, 10 0,0 Q -9, 10 0, 20Z"/>
          <path d="M -20,0 Q -10,-9 0,0 Q -10, 9 -20,0Z"/>
          <path d="M  20,0 Q  10,-9 0,0 Q  10, 9  20,0Z"/>
          <path d="M -14,-14 Q -6,-10 0,0 Q -10,-6 -14,-14Z"/>
          <path d="M  14,-14 Q  6,-10 0,0 Q  10,-6  14,-14Z"/>
          <path d="M -14, 14 Q -6, 10 0,0 Q -10, 6 -14, 14Z"/>
          <path d="M  14, 14 Q  6, 10 0,0 Q  10, 6  14, 14Z"/>
        </g>
        <circle cx="0" cy="0" r="8" fill="white" opacity="0.82"/>
        <text x="${MX}" y="${MY + 4}" text-anchor="middle" font-size="9" font-family="Georgia"
              fill="#4338ca" opacity="0.6">月</text>
      </g>`

    case 'prata':
      return `<g transform="translate(${MX},${MY})">
        <!-- Prata flatbread — slightly irregular circle, flaky spiral rings -->
        <ellipse cx="0" cy="4" rx="32" ry="30" fill="white" opacity="0.88"/>
        <!-- Flaky layer rings (concentric, slightly offset for realism) -->
        <ellipse cx="-1" cy="3" rx="25" ry="23" fill="none" stroke="white" stroke-width="1.4" opacity="0.42"/>
        <ellipse cx="-2" cy="2" rx="17" ry="15" fill="none" stroke="white" stroke-width="1.2" opacity="0.38"/>
        <ellipse cx="-1" cy="1" rx="10" ry="9"  fill="none" stroke="white" stroke-width="1"   opacity="0.32"/>
        <ellipse cx="0"  cy="0" rx="4"  ry="3.5" fill="white" opacity="0.45"/>
        <!-- Char spots on surface -->
        <ellipse cx="-12" cy="-8" rx="4" ry="3" fill="#7c3aed" opacity="0.18" transform="rotate(-20,-12,-8)"/>
        <ellipse cx="14"  cy="10" rx="3" ry="2" fill="#7c3aed" opacity="0.15" transform="rotate(15,14,10)"/>
        <ellipse cx="4"   cy="-18" rx="3.5" ry="2.5" fill="#7c3aed" opacity="0.13"/>
        <!-- Highlight sheen -->
        <ellipse cx="-8" cy="-10" rx="12" ry="9" fill="white" opacity="0.2" transform="rotate(-25,-8,-10)"/>
        <!-- Curry cup (side) -->
        <path d="M 30,22 Q 28,36 36,36 Q 44,36 42,22Z" fill="white" opacity="0.75"/>
        <ellipse cx="36" cy="22" rx="6" ry="3.5" fill="white" opacity="0.65"/>
        <!-- Curry surface ripple -->
        <path d="M 31,26 Q 36,23 41,26" fill="none" stroke="#7c3aed" stroke-width="1" opacity="0.35"/>
      </g>`

    case 'laksa':
      return `<g transform="translate(${MX},${MY})">
        <path d="M -34,-2 Q -36,34 0,38 Q 36,34 34,-2Z" fill="white" opacity="0.85"/>
        <ellipse cx="0" cy="-2" rx="34" ry="11" fill="white" opacity="0.65"/>
        <path d="M -14,-5 Q -5,-14 9,-7 Q 18,-2 9,5 Q 0,11 -9,6 Q -16,1 -14,-5Z"
              fill="none" stroke="#b45309" stroke-width="1.8" opacity="0.45"/>
        <clipPath id="lkFC2"><path d="M -34,-2 Q -36,34 0,38 Q 36,34 34,-2Z"/></clipPath>
        <g clip-path="url(#lkFC2)" stroke="white" stroke-width="1.8" fill="none"
           stroke-linecap="round" opacity="0.65">
          <path d="M -26,6 Q -16,18 -6,10 Q 4,4 14,14 Q 22,22 28,14"/>
          <path d="M -24,16 Q -12,26 0,18 Q 12,12 22,22"/>
          <path d="M -20,24 Q -8,32 6,24 Q 16,18 26,26"/>
        </g>
        <path d="M 28,-2 Q 40,5 36,17 Q 33,22 28,20"
              fill="none" stroke="white" stroke-width="2.8" stroke-linecap="round" opacity="0.7"/>
      </g>`

    case 'pineapple_tart': {
      const petals = Array.from({ length: 6 }, (_, i) => {
        const a = (i * Math.PI) / 3
        const px = (28 * Math.cos(a)).toFixed(1), py = (28 * Math.sin(a)).toFixed(1)
        return `<ellipse cx="${MX + parseFloat(px)}" cy="${MY + parseFloat(py)}"
          rx="11" ry="18" fill="white" opacity="0.85"
          transform="rotate(${((a * 180) / Math.PI).toFixed(0)},${MX+parseFloat(px)},${MY+parseFloat(py)})"/>`
      }).join('')
      return `${petals}
        <circle cx="${MX}" cy="${MY}" r="20" fill="white" opacity="0.92"/>
        <clipPath id="trtFC2"><circle cx="${MX}" cy="${MY}" r="20"/></clipPath>
        <g clip-path="url(#trtFC2)" stroke="#14532d" stroke-width="1.4" opacity="0.38">
          <line x1="${MX-20}" y1="${MY-7}" x2="${MX+20}" y2="${MY+7}"/>
          <line x1="${MX-20}" y1="${MY}"   x2="${MX+20}" y2="${MY}"/>
          <line x1="${MX-20}" y1="${MY+7}" x2="${MX+20}" y2="${MY-7}"/>
          <line x1="${MX-7}"  y1="${MY-20}" x2="${MX+7}"  y2="${MY+20}"/>
          <line x1="${MX}"    y1="${MY-20}" x2="${MX}"    y2="${MY+20}"/>
          <line x1="${MX+7}"  y1="${MY-20}" x2="${MX-7}"  y2="${MY+20}"/>
        </g>
        <circle cx="${MX-6}" cy="${MY-6}" r="7" fill="white" opacity="0.28"/>`
    }

    default:
      return `<text x="${MX}" y="${MY + 12}" text-anchor="middle" fill="white" font-size="40">🏅</text>`
  }
}

export function MedalSvg({ config, size = 180 }: Props) {
  const id = config.holidayId
  const W = 180, H = 260
  const scale = size / W
  const topPath = `M ${MX - TR},${MY} A ${TR},${TR} 0 0,0 ${MX + TR},${MY}`
  const botPath = `M ${MX - TR},${MY} A ${TR},${TR} 0 0,1 ${MX + TR},${MY}`

  return (
    <svg
      width={size}
      height={Math.round(H * scale)}
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id={`${id}G`} cx="34%" cy="24%" r="72%"
          dangerouslySetInnerHTML={{ __html: GOLD }} />
        <radialGradient id={`${id}F`} cx="28%" cy="24%" r="78%">
          <stop offset="0%"   stopColor={config.faceA} />
          <stop offset="50%"  stopColor={config.faceB} />
          <stop offset="100%" stopColor={config.faceC} />
        </radialGradient>
        <linearGradient id={`${id}R`} x1="0" x2="1">
          <stop offset="0%"   stopColor={config.ribbonA} />
          <stop offset="45%"  stopColor={config.ribbonB} />
          <stop offset="55%"  stopColor={config.ribbonB} />
          <stop offset="100%" stopColor={config.ribbonA} />
        </linearGradient>
        <radialGradient id={`${id}Spec`} cx="32%" cy="28%" r="68%">
          <stop offset="0%"   stopColor="#fff" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}FC`}><circle cx={MX} cy={MY} r={FACE} /></clipPath>
        <path id={`${id}TP`} d={topPath} fill="none" />
        <path id={`${id}BP`} d={botPath} fill="none" />
      </defs>

      {/* Ribbon */}
      <rect x="78" y="0" width="24" height="56" rx="4" fill={`url(#${id}R)`} />
      <rect x="84" y="1" width="6"  height="54" rx="3" fill="white" opacity="0.1" />

      {/* Bail */}
      <ellipse cx={MX} cy="62" rx="15" ry="9"   fill={`url(#${id}G)`} />
      <ellipse cx={MX} cy="62" rx="9"  ry="5.5" fill="none" stroke="#3a1a00" strokeWidth="1.4" />

      {/* Outer rim */}
      <circle cx={MX} cy={MY} r={ORIM}       fill={`url(#${id}G)`} />
      <circle cx={MX} cy={MY} r={ORIM - 5}   fill="#3a1a00" opacity="0.5" />
      <circle cx={MX} cy={MY} r={ORIM - 7.5} fill={`url(#${id}G)`} />
      <circle cx={MX} cy={MY} r={ORIM}       fill={`url(#${id}Spec)`} />

      {/* Rim text */}
      <text fill="#f0c840" fontSize="6" fontFamily="Georgia,serif" fontWeight="700"
            letterSpacing="3" opacity="0.88">
        <textPath href={`#${id}TP`} startOffset="50%" textAnchor="middle">
          {config.subtitle.toUpperCase()}
        </textPath>
      </text>
      <text fill="#f0c840" fontSize="6" fontFamily="Georgia,serif" fontWeight="700"
            letterSpacing="2.5" opacity="0.88">
        <textPath href={`#${id}BP`} startOffset="50%" textAnchor="middle">
          {config.food.toUpperCase()}
        </textPath>
      </text>

      {/* Face */}
      <circle cx={MX} cy={MY} r={FACE} fill={`url(#${id}F)`} />

      {/* Food illustration */}
      <g clipPath={`url(#${id}FC)`} dangerouslySetInnerHTML={{ __html: buildDesign(config.holidayId) }} />
    </svg>
  )
}
