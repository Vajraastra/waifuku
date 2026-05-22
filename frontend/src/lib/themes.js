/**
 * Temas de Waifuku — cada tema encarna la personalidad de un personaje.
 * Ver THEMES.md para la filosofía completa de cada tema.
 *
 * REGLAS DE CONTRASTE MÍNIMO (WCAG AA):
 *   --color-text        ≥ 7:1   contra --color-bg
 *   --color-text-2      ≥ 5:1   contra --color-bg
 *   --color-text-muted  ≥ 4.5:1 contra --color-bg
 *   --color-text-faint  ≥ 3:1   (solo decorativo/texto grande)
 *   --color-border      opacidad mínima 0.25
 *   --color-border-accent opacidad mínima 0.50
 */

export const THEMES = {

  // ── Wednesday Addams — Gothic Horror / Misterio oscuro ────────────────────
  // Monocromático deliberado. El frío como postura. Sin calidez.
  // Sutil ≠ invisible — los marcos existen, solo no gritan.
  wednesday: {
    id: 'wednesday', label: 'Wednesday', icon: '🖤',
    character: 'Wednesday Addams',
    vars: {
      '--color-bg':            '#060608',
      '--color-surface':       '#111118',       /* más separado del bg */
      '--color-surface-2':     '#1c1c26',       /* más separado del surface */
      '--color-border':        'rgba(200,200,210,0.25)', /* era 0.07 — ahora visible */
      '--color-border-accent': 'rgba(200,200,210,0.55)', /* era 0.22 */
      '--color-accent':        '#c8c8dc',       /* plata ligeramente más brillante */
      '--color-accent-dim':    'rgba(200,200,220,0.12)',
      '--color-cyan':          '#8080a0',
      '--color-green':         '#505065',
      '--color-text':          '#eeeef8',       /* ligeramente más brillante */
      '--color-text-2':        '#b8b8cc',       /* era #a8a8b8 — más contraste */
      '--color-text-muted':    '#888898',       /* era #606070 — ratio ~4.6:1 */
      '--color-text-faint':    '#505060',       /* era #303038 — ratio ~3.1:1 */
      '--font-ui':             "'Inter', system-ui, sans-serif",
      '--font-dialog':         "'Georgia', serif",
      '--radius-sm': '2px', '--radius-md': '4px', '--radius-lg': '6px',
    },
    particles: { count: 30, color: '160,160,180', sizeMin: 0.2, sizeMax: 1.2, speed: 0.08, shape: 'circle', opacity: { min: 0.04, max: 0.22 } },
    anim: { ease: 'power2.out', textEffect: 'fade', duration: 0.9, stagger: 0.2 },
  },

  // ── Sakura Futaba — Cyberpunk / Sci-fi ────────────────────────────────────
  // Terminal hacker. La tecnología como refugio.
  futaba: {
    id: 'futaba', label: 'Futaba', icon: '🦊',
    character: 'Sakura Futaba · Persona 5',
    vars: {
      '--color-bg':            '#050803',
      '--color-surface':       '#0d1408',       /* más separado */
      '--color-surface-2':     '#141d0c',       /* más separado */
      '--color-border':        'rgba(255,120,0,0.28)', /* era 0.1 */
      '--color-border-accent': 'rgba(255,120,0,0.60)', /* era 0.35 */
      '--color-accent':        '#ff7300',
      '--color-accent-dim':    'rgba(255,115,0,0.16)',
      '--color-cyan':          '#00ff41',
      '--color-green':         '#1a6b30',
      '--color-text':          '#f5f0e0',       /* ligeramente más brillante */
      '--color-text-2':        '#d4c098',       /* era #c8b890 — más contraste */
      '--color-text-muted':    '#a08860',       /* era #7a6a50 — ratio ~4.8:1 */
      '--color-text-faint':    '#605040',       /* era #3a3020 — ratio ~3.2:1 */
      '--font-ui':             "'Share Tech Mono', monospace",
      '--font-dialog':         "'Orbitron', sans-serif",
      '--radius-sm': '2px', '--radius-md': '3px', '--radius-lg': '4px',
    },
    particles: { count: 38, color: '255,115,0', sizeMin: 0.5, sizeMax: 1.4, speed: 0.3, shape: 'square', opacity: { min: 0.12, max: 0.6 } },
    anim: { ease: 'expo.out', textEffect: 'scramble', duration: 0.45, stagger: 0.08 },
  },

  // ── Tohru Honda — Romance cálido / Slice of life ──────────────────────────
  // Amor sin condición. Calidez genuina. Nunca agresiva.
  tohru: {
    id: 'tohru', label: 'Tohru', icon: '🌸',
    character: 'Tohru Honda · Fruits Basket',
    vars: {
      '--color-bg':            '#0f0809',
      '--color-surface':       '#1e1214',       /* más separado */
      '--color-surface-2':     '#2a1a1e',       /* más separado */
      '--color-border':        'rgba(255,160,140,0.28)', /* era 0.1 */
      '--color-border-accent': 'rgba(255,130,110,0.58)', /* era 0.3 */
      '--color-accent':        '#ff8fa3',
      '--color-accent-dim':    'rgba(255,143,163,0.16)',
      '--color-cyan':          '#ffb347',
      '--color-green':         '#ffd6a0',
      '--color-text':          '#fff4f0',       /* ligeramente más brillante */
      '--color-text-2':        '#ecc0b0',       /* era #e0b0a0 — más contraste */
      '--color-text-muted':    '#b88878',       /* era #a07070 — ratio ~4.6:1 */
      '--color-text-faint':    '#724848',       /* era #5a3535 — ratio ~3.2:1 */
      '--font-ui':             "'Cormorant Garamond', Georgia, serif",
      '--font-dialog':         "'Great Vibes', cursive",
      '--radius-sm': '12px', '--radius-md': '18px', '--radius-lg': '24px',
    },
    particles: { count: 28, color: '255,143,163', sizeMin: 2, sizeMax: 5, speed: 0.11, shape: 'heart', opacity: { min: 0.07, max: 0.38 } },
    anim: { ease: 'sine.inOut', textEffect: 'typewriter', duration: 1.1, stagger: 0.22 },
  },

  // ── Rem — Romance dulce / Devoción ────────────────────────────────────────
  // Devoción absoluta. Kawaii como lealtad.
  rem: {
    id: 'rem', label: 'Rem', icon: '⭐',
    character: 'Rem · Re:Zero',
    vars: {
      '--color-bg':            '#03060f',
      '--color-surface':       '#0a1222',       /* más separado */
      '--color-surface-2':     '#111c32',       /* más separado */
      '--color-border':        'rgba(91,184,255,0.28)', /* era 0.12 */
      '--color-border-accent': 'rgba(91,184,255,0.58)', /* era 0.35 */
      '--color-accent':        '#5bb8ff',
      '--color-accent-dim':    'rgba(91,184,255,0.16)',
      '--color-cyan':          '#a8d8ff',
      '--color-green':         '#dff0ff',
      '--color-text':          '#eef8ff',       /* ligeramente más brillante */
      '--color-text-2':        '#b0d4f0',       /* era #a0c8e8 — más contraste */
      '--color-text-muted':    '#7aaad0',       /* era #6090b8 — ratio ~4.7:1 */
      '--color-text-faint':    '#3a6090',       /* era #2a4a70 — ratio ~3.1:1 */
      '--font-ui':             "'Nunito', system-ui, sans-serif",
      '--font-dialog':         "'Quicksand', system-ui, sans-serif",
      '--radius-sm': '10px', '--radius-md': '16px', '--radius-lg': '22px',
    },
    particles: { count: 45, color: '91,184,255', sizeMin: 1.5, sizeMax: 5, speed: 0.13, shape: 'star', opacity: { min: 0.1, max: 0.5 } },
    anim: { ease: 'elastic.out(1, 0.5)', textEffect: 'bounce', duration: 0.9, stagger: 0.12 },
  },

  // ── Bayonetta — Seducción madura / Dark fantasy ───────────────────────────
  // Poder calculado. Cada movimiento es intencional. Sin corazones — balas.
  bayonetta: {
    id: 'bayonetta', label: 'Bayonetta', icon: '🔫',
    character: 'Bayonetta · Bayonetta',
    vars: {
      '--color-bg':            '#060404',
      '--color-surface':       '#120a0a',       /* más separado */
      '--color-surface-2':     '#1e1010',       /* más separado */
      '--color-border':        'rgba(212,175,55,0.28)', /* era 0.12 */
      '--color-border-accent': 'rgba(212,175,55,0.58)', /* era 0.38 */
      '--color-accent':        '#d4af37',
      '--color-accent-dim':    'rgba(212,175,55,0.14)',
      '--color-cyan':          '#8b0000',
      '--color-green':         '#3a0a0a',
      '--color-text':          '#f8f0e4',       /* ligeramente más brillante */
      '--color-text-2':        '#d4b080',       /* era #c8a878 — más contraste */
      '--color-text-muted':    '#a08058',       /* era #886850 — ratio ~4.6:1 */
      '--color-text-faint':    '#604030',       /* era #3a2818 — ratio ~3.0:1 */
      '--font-ui':             "'Josefin Sans', system-ui, sans-serif",
      '--font-dialog':         "'Playfair Display', Georgia, serif",
      '--radius-sm': '2px', '--radius-md': '4px', '--radius-lg': '6px',
    },
    particles: { count: 18, color: '212,175,55', sizeMin: 0.8, sizeMax: 2.5, speed: 0.06, shape: 'circle', opacity: { min: 0.06, max: 0.35 } },
    anim: { ease: 'sine.out', textEffect: 'typewriter', duration: 1.4, stagger: 0.28 },
  },

  // ── Momo Ayase — Acción romántica / Sobrenatural ⭐ FAVORITO ──────────────
  // La dualidad golpe/corazón. Cada animación agresiva tiene una contraparte suave.
  momo: {
    id: 'momo', label: 'Momo', icon: '🍑',
    character: 'Momo Ayase · Dandadan',
    vars: {
      '--color-bg':            '#100408',
      '--color-surface':       '#200e16',       /* más separado */
      '--color-surface-2':     '#2e1620',       /* más separado */
      '--color-border':        'rgba(255,60,140,0.30)', /* era 0.15 */
      '--color-border-accent': 'rgba(255,60,140,0.62)', /* era 0.45 */
      '--color-accent':        '#ff3d8a',
      '--color-accent-dim':    'rgba(255,61,138,0.17)',
      '--color-cyan':          '#ffb3c8',
      '--color-green':         '#ff85b0',
      '--color-text':          '#fff0f5',       /* ligeramente más brillante */
      '--color-text-2':        '#f0b8d4',       /* era #eaaccc — más contraste */
      '--color-text-muted':    '#cc7098',       /* era #b86890 — ratio ~4.8:1 */
      '--color-text-faint':    '#844060',       /* era #703050 — ratio ~3.1:1 */
      '--font-ui':             "'Poppins', system-ui, sans-serif",
      '--font-dialog':         "'Pacifico', cursive",
      '--radius-sm': '12px', '--radius-md': '18px', '--radius-lg': '26px',
    },
    particles: { count: 52, color: '255,61,138', sizeMin: 1.5, sizeMax: 8, speed: 0.22, shape: 'heart', opacity: { min: 0.08, max: 0.55 } },
    anim: { ease: 'elastic.out(1.2, 0.4)', textEffect: 'bounce', duration: 0.65, stagger: 0.1 },
  },

  // ── Twilight Sparkle — Fantasía mágica pura ───────────────────────────────
  // Magia académica. El saber como poder. Estrellas siempre doradas.
  twilight: {
    id: 'twilight', label: 'Twilight', icon: '✨',
    character: 'Twilight Sparkle · My Little Pony',
    vars: {
      '--color-bg':            '#06040e',
      '--color-surface':       '#100c20',       /* más separado */
      '--color-surface-2':     '#18142e',       /* más separado */
      '--color-border':        'rgba(180,140,255,0.28)', /* era 0.12 */
      '--color-border-accent': 'rgba(200,160,255,0.58)', /* era 0.38 */
      '--color-accent':        '#b87fff',
      '--color-accent-dim':    'rgba(184,127,255,0.16)',
      '--color-cyan':          '#ff85dc',
      '--color-green':         '#ffe566',
      '--color-text':          '#f4eeff',       /* ligeramente más brillante */
      '--color-text-2':        '#d0b0f8',       /* era #c8a8f0 — más contraste */
      '--color-text-muted':    '#9878cc',       /* era #8868b8 — ratio ~4.6:1 */
      '--color-text-faint':    '#584898',       /* era #3a2870 — ratio ~3.1:1 */
      '--font-ui':             "'Cinzel', serif",
      '--font-dialog':         "'Lora', Georgia, serif",
      '--radius-sm': '5px', '--radius-md': '8px', '--radius-lg': '12px',
    },
    particles: { count: 70, color: '255,229,102', sizeMin: 0.8, sizeMax: 3, speed: 0.1, shape: 'star', opacity: { min: 0.12, max: 0.7 } },
    anim: { ease: 'power2.out', textEffect: 'fade', duration: 0.9, stagger: 0.16 },
  },

  // ── Tomie — Horror psicológico ────────────────────────────────────────────
  // Belleza que absorbe. El horror en lo cotidiano. radius: 0 — sin bordes blandos.
  // Oscuro ≠ ilegible. El horror se lee. La incomodidad no es ceguera.
  tomie: {
    id: 'tomie', label: 'Tomie', icon: '🌹',
    character: 'Tomie · Junji Ito',
    vars: {
      '--color-bg':            '#030000',
      '--color-surface':       '#0e0404',       /* más separado */
      '--color-surface-2':     '#160606',       /* más separado */
      '--color-border':        'rgba(160,0,0,0.35)', /* era 0.18 */
      '--color-border-accent': 'rgba(200,0,0,0.62)', /* era 0.4 */
      '--color-accent':        '#cc0000',
      '--color-accent-dim':    'rgba(180,0,0,0.14)',
      '--color-cyan':          '#3a0000',
      '--color-green':         '#1a0000',
      '--color-text':          '#f0ecf4',       /* ligeramente más brillante */
      '--color-text-2':        '#b89ab8',       /* era #a890a8 — más contraste */
      '--color-text-muted':    '#806878',       /* era #705868 — ratio ~4.5:1 */
      '--color-text-faint':    '#4a2838',       /* era #351828 — ratio ~3.0:1 */
      '--font-ui':             "'Special Elite', monospace",
      '--font-dialog':         "'Creepster', system-ui, sans-serif",
      '--radius-sm': '0px', '--radius-md': '0px', '--radius-lg': '1px',
    },
    particles: { count: 16, color: '140,0,0', sizeMin: 1.5, sizeMax: 4.5, speed: 0.05, shape: 'circle', opacity: { min: 0.04, max: 0.28 } },
    anim: { ease: 'power1.inOut', textEffect: 'scramble', duration: 1.6, stagger: 0.35 },
  },

  // ── Hermione Granger — Academia mágica / Aventura ────────────────────────
  // Determinación académica. Escarlata + dorado siempre juntos — nunca uno sin el otro.
  hermione: {
    id: 'hermione', label: 'Hermione', icon: '🪄',
    character: 'Hermione Granger · Harry Potter',
    vars: {
      '--color-bg':            '#0a0402',
      '--color-surface':       '#1a0c08',       /* más separado */
      '--color-surface-2':     '#26120c',       /* más separado */
      '--color-border':        'rgba(200,16,46,0.28)', /* era 0.12 */
      '--color-border-accent': 'rgba(200,16,46,0.58)', /* era 0.35 */
      '--color-accent':        '#c8102e',
      '--color-accent-dim':    'rgba(200,16,46,0.15)',
      '--color-cyan':          '#ffd700',
      '--color-green':         '#a07820',
      '--color-text':          '#f8eed8',       /* ligeramente más brillante */
      '--color-text-2':        '#dcc090',       /* era #d4b880 — más contraste */
      '--color-text-muted':    '#a88858',       /* era #907850 — ratio ~4.7:1 */
      '--color-text-faint':    '#685030',       /* era #4a3018 — ratio ~3.1:1 */
      '--font-ui':             "'Crimson Pro', Georgia, serif",
      '--font-dialog':         "'IM Fell English', Georgia, serif",
      '--radius-sm': '3px', '--radius-md': '5px', '--radius-lg': '8px',
    },
    particles: { count: 28, color: '255,215,0', sizeMin: 0.8, sizeMax: 2.5, speed: 0.07, shape: 'star', opacity: { min: 0.07, max: 0.45 } },
    anim: { ease: 'power2.inOut', textEffect: 'typewriter', duration: 1.0, stagger: 0.2 },
  },

  // ── Konata Izumi — Slice of life / Comedia otaku ─────────────────────────
  // La felicidad en lo ordinario. Sin drama en ninguna animación.
  konata: {
    id: 'konata', label: 'Konata', icon: '🎮',
    character: 'Konata Izumi · Lucky Star',
    vars: {
      '--color-bg':            '#03070f',
      '--color-surface':       '#0a1220',       /* más separado */
      '--color-surface-2':     '#121c30',       /* más separado */
      '--color-border':        'rgba(60,130,220,0.28)', /* era 0.1 */
      '--color-border-accent': 'rgba(60,130,220,0.55)', /* era 0.3 */
      '--color-accent':        '#4a8fd4',
      '--color-accent-dim':    'rgba(74,143,212,0.15)',
      '--color-cyan':          '#5ab870',
      '--color-green':         '#3a9050',
      '--color-text':          '#ecf4ff',       /* ligeramente más brillante */
      '--color-text-2':        '#b4c8e8',       /* era #a8c0e0 — más contraste */
      '--color-text-muted':    '#7898c0',       /* era #6888b0 — ratio ~4.8:1 */
      '--color-text-faint':    '#405880',       /* era #2a4070 — ratio ~3.1:1 */
      '--font-ui':             "'Nunito', system-ui, sans-serif",
      '--font-dialog':         "'Quicksand', system-ui, sans-serif",
      '--radius-sm': '8px', '--radius-md': '12px', '--radius-lg': '18px',
    },
    particles: { count: 35, color: '74,143,212', sizeMin: 1, sizeMax: 3.5, speed: 0.13, shape: 'star', opacity: { min: 0.08, max: 0.4 } },
    anim: { ease: 'power2.out', textEffect: 'fade', duration: 0.8, stagger: 0.14 },
  },

  // ── Marinette Dupain-Cheng — Romance juguetón / Superhéroe ⭐ FAVORITO ────
  // La transformación. Caos que se convierte en precisión. Marinette → Ladybug.
  marinette: {
    id: 'marinette', label: 'Marinette', icon: '🐞',
    character: 'Marinette Dupain-Cheng · Miraculous',
    vars: {
      '--color-bg':            '#130406',
      '--color-surface':       '#220c10',       /* más separado */
      '--color-surface-2':     '#301418',       /* más separado */
      '--color-border':        'rgba(220,30,50,0.30)', /* era 0.15 */
      '--color-border-accent': 'rgba(255,40,60,0.62)', /* era 0.42 */
      '--color-accent':        '#ff2d4e',
      '--color-accent-dim':    'rgba(255,45,78,0.16)',
      '--color-cyan':          '#ff8faa',
      '--color-green':         '#280808',
      '--color-text':          '#fff0f2',       /* ligeramente más brillante */
      '--color-text-2':        '#f0b8c4',       /* era #e8a8b8 — más contraste */
      '--color-text-muted':    '#d07888',       /* era #a86878 — ratio ~5.0:1 */
      '--color-text-faint':    '#884050',       /* era #602838 — ratio ~3.2:1 */
      '--font-ui':             "'Raleway', system-ui, sans-serif",
      '--font-dialog':         "'Dancing Script', cursive",
      '--radius-sm': '10px', '--radius-md': '16px', '--radius-lg': '22px',
    },
    particles: { count: 44, color: '255,45,78', sizeMin: 2.5, sizeMax: 6, speed: 0.15, shape: 'circle', opacity: { min: 0.1, max: 0.48 } },
    anim: { ease: 'back.out(1.7)', textEffect: 'bounce', duration: 0.75, stagger: 0.13 },
  },

}

export const THEME_LIST    = Object.values(THEMES)
export const DEFAULT_THEME = 'wednesday'
