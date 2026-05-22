/**
 * Sistema de partículas en canvas adaptable por tema.
 * Soporta formas: circle, square, star, heart.
 */

export function startParticles(canvas, config) {
  if (!canvas) return () => {}

  const ctx = canvas.getContext('2d')
  canvas.width  = window.innerWidth
  canvas.height = window.innerHeight

  const {
    count = 50,
    color = '192,132,252',
    sizeMin = 0.5,
    sizeMax = 2,
    speed = 0.2,
    shape = 'circle',
    opacity = { min: 0.1, max: 0.5 },
  } = config

  const particles = Array.from({ length: count }, () => ({
    x:  Math.random() * canvas.width,
    y:  Math.random() * canvas.height,
    r:  Math.random() * (sizeMax - sizeMin) + sizeMin,
    vx: (Math.random() - 0.5) * speed,
    vy: (Math.random() - 0.5) * speed,
    a:  Math.random() * (opacity.max - opacity.min) + opacity.min,
    rot: Math.random() * Math.PI * 2,
    rotV: (Math.random() - 0.5) * 0.02,
  }))

  let running = true

  function draw() {
    if (!running) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (const p of particles) {
      ctx.save()
      ctx.globalAlpha = p.a
      ctx.fillStyle   = `rgb(${color})`
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)

      drawShape(ctx, shape, p.r)

      ctx.restore()

      p.x   += p.vx
      p.y   += p.vy
      p.rot += p.rotV

      if (p.x < -10)                p.x = canvas.width  + 10
      if (p.x > canvas.width  + 10) p.x = -10
      if (p.y < -10)                p.y = canvas.height + 10
      if (p.y > canvas.height + 10) p.y = -10
    }

    requestAnimationFrame(draw)
  }

  draw()
  return () => { running = false }
}

function drawShape(ctx, shape, r) {
  switch (shape) {
    case 'square':
      ctx.fillRect(-r, -r, r * 2, r * 2)
      break

    case 'star':
      drawStar(ctx, r)
      break

    case 'heart':
      drawHeart(ctx, r)
      break

    default: // circle
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.fill()
  }
}

function drawStar(ctx, r) {
  const spikes = 5
  const inner  = r * 0.4
  ctx.beginPath()
  for (let i = 0; i < spikes * 2; i++) {
    const angle  = (i * Math.PI) / spikes - Math.PI / 2
    const radius = i % 2 === 0 ? r : inner
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
}

function drawHeart(ctx, r) {
  const s = r * 0.055
  ctx.beginPath()
  ctx.moveTo(0, r * 0.3)
  ctx.bezierCurveTo( r,  -r * 0.3,  r * 1.6, r * 0.8,  0, r * 1.4)
  ctx.bezierCurveTo(-r * 1.6, r * 0.8, -r, -r * 0.3,  0, r * 0.3)
  ctx.fill()
}
