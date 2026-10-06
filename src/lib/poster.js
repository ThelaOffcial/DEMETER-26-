function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function truncateText(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text
  let s = String(text || '')
  while (s.length > 0 && ctx.measureText(s + '…').width > maxW) {
    s = s.slice(0, -1)
  }
  return s + '…'
}

export async function generatePoster(rankings, bgFile) {
  if (!rankings.length) throw new Error('No submitted results yet to generate a poster.')
  const W = 1080
  const H = 1350
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  const loadImg = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })

  let bgImg = null
  try {
    if (bgFile) {
      bgImg = await loadImg(URL.createObjectURL(bgFile))
    } else {
      bgImg = await loadImg('/poster-bg.png')
    }
  } catch (e) {
    bgImg = null
  }

  if (bgImg) {
    const scale = Math.max(W / bgImg.width, H / bgImg.height)
    const dw = bgImg.width * scale
    const dh = bgImg.height * scale
    const dx = (W - dw) / 2
    const dy = (H - dh) / 2
    ctx.drawImage(bgImg, dx, dy, dw, dh)
  } else {
    const bg = ctx.createLinearGradient(0, 0, W, H)
    bg.addColorStop(0, '#0A1F18')
    bg.addColorStop(0.5, '#173D2E')
    bg.addColorStop(1, '#0A1628')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
  }

  const vig = ctx.createRadialGradient(W / 2, H * 0.55, 120, W / 2, H * 0.5, H * 0.75)
  vig.addColorStop(0, 'rgba(0,0,0,0.15)')
  vig.addColorStop(1, 'rgba(0,0,0,0.55)')
  ctx.fillStyle = vig
  ctx.fillRect(0, 0, W, H)

  const panelX = 56
  const panelY = 280
  const panelW = W - 112
  const panelH = 820
  const radius = 28

  try {
    const tmp = document.createElement('canvas')
    tmp.width = panelW
    tmp.height = panelH
    const tctx = tmp.getContext('2d')
    tctx.drawImage(canvas, panelX, panelY, panelW, panelH, 0, 0, panelW, panelH)
    tctx.filter = 'blur(18px)'
    const tmp2 = document.createElement('canvas')
    tmp2.width = panelW
    tmp2.height = panelH
    const t2 = tmp2.getContext('2d')
    t2.filter = 'blur(18px)'
    t2.drawImage(tmp, 0, 0)
    ctx.save()
    roundRectPath(ctx, panelX, panelY, panelW, panelH, radius)
    ctx.clip()
    ctx.drawImage(tmp2, panelX, panelY)
    ctx.restore()
  } catch (e) {
  }

  ctx.save()
  roundRectPath(ctx, panelX, panelY, panelW, panelH, radius)
  ctx.fillStyle = 'rgba(8, 20, 28, 0.55)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.restore()

  ctx.save()
  roundRectPath(ctx, panelX + 1, panelY + 1, panelW - 2, panelH - 2, radius - 1)
  ctx.strokeStyle = 'rgba(217,164,65,0.25)'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()

  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(217,164,65,0.95)'
  ctx.font = '600 20px "Work Sans", system-ui, sans-serif'
  ctx.fillText('ALL ISLAND INTER SCHOOL ECO QUIZ', W / 2, 90)

  ctx.fillStyle = '#FFFFFF'
  ctx.font = '700 64px "Fraunces", Georgia, serif'
  ctx.fillText("DEMETER 26'", W / 2, 165)

  ctx.fillStyle = 'rgba(241,243,234,0.9)'
  ctx.font = '600 26px "Work Sans", system-ui, sans-serif'
  ctx.fillText('TOP 5 WINNING SCHOOLS', W / 2, 215)

  ctx.strokeStyle = '#D9A441'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(W / 2 - 70, 235)
  ctx.lineTo(W / 2 + 70, 235)
  ctx.stroke()

  const medals = ['#D9A441', '#C8CDD2', '#C47B3A', '#8FA89A', '#8FA89A']
  const rowStart = panelY + 36
  const rowH = 148

  rankings.forEach((row, i) => {
    const y = rowStart + i * rowH

    ctx.fillStyle =
      i === 0 ? 'rgba(217,164,65,0.18)' : 'rgba(255,255,255,0.06)'
    roundRectPath(ctx, panelX + 24, y, panelW - 48, 128, 16)
    ctx.fill()
    ctx.strokeStyle =
      i === 0 ? 'rgba(217,164,65,0.5)' : 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 1
    roundRectPath(ctx, panelX + 24, y, panelW - 48, 128, 16)
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(panelX + 88, y + 64, 30, 0, Math.PI * 2)
    ctx.fillStyle = medals[i] || '#8FA89A'
    ctx.fill()
    ctx.fillStyle = i < 3 ? '#0A1F18' : '#F1F3EA'
    ctx.font = '700 26px "Fraunces", Georgia, serif'
    ctx.textAlign = 'center'
    ctx.fillText(String(i + 1), panelX + 88, y + 73)

    ctx.textAlign = 'left'
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '600 28px "Work Sans", system-ui, sans-serif'
    ctx.fillText(truncateText(ctx, row.school, panelW - 320), panelX + 140, y + 50)

    ctx.fillStyle = 'rgba(241,243,234,0.7)'
    ctx.font = '500 20px "Work Sans", system-ui, sans-serif'
    const studentLine = row.grade
      ? `${row.name}  ·  ${row.grade}`
      : row.name
    ctx.fillText(
      truncateText(ctx, studentLine, panelW - 320),
      panelX + 140,
      y + 88
    )

    ctx.textAlign = 'right'
    ctx.fillStyle = '#D9A441'
    ctx.font = '700 36px "Fraunces", Georgia, serif'
    ctx.fillText(String(row.score), panelX + panelW - 48, y + 62)
    ctx.fillStyle = 'rgba(241,243,234,0.55)'
    ctx.font = '500 15px "Work Sans", system-ui, sans-serif'
    ctx.fillText('/ 120', panelX + panelW - 48, y + 90)
  })

  ctx.fillStyle = 'rgba(0,0,0,0.65)'
  ctx.fillRect(0, H - 70, W, 70)
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(241,243,234,0.75)'
  ctx.font = '500 18px "Work Sans", system-ui, sans-serif'
  ctx.fillText('Second Round Results  ·  Powered by SSCICTS', W / 2, H - 28)

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Could not create image.')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'demeter26-round2-top5-schools.png'
  a.click()
  URL.revokeObjectURL(url)
}
