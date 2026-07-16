import QRCode from 'qrcode'

const BRAND = '#2B4820'

// QR 매트릭스를 캔버스에 직접 렌더 — 둥근 점 + 라운드 파인더 + 초록 프레임 + "여름나무"
function renderStyledQR(url: string): string {
  const qr = QRCode.create(url, { errorCorrectionLevel: 'H' })
  const size = qr.modules.size
  const data = qr.modules.data

  const scale = 12          // 모듈당 px
  const quiet = 3           // 콰이엇 존(모듈)
  const inner = (size + quiet * 2) * scale  // 흰 배경 영역
  const pad = 34            // 초록 프레임 두께
  const textH = 52          // 하단 "여름나무" 밴드
  const W = inner + pad * 2
  const H = inner + pad * 2 + textH

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  const rr = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }

  // 초록 프레임(라운드) + 흰 QR 영역
  rr(2, 2, W - 4, H - 4, 40); ctx.fillStyle = BRAND; ctx.fill()
  rr(pad, pad, inner, inner, 22); ctx.fillStyle = '#ffffff'; ctx.fill()

  const ox = pad + quiet * scale
  const oy = pad + quiet * scale

  // 파인더(3개 코너 7x7) 영역인지
  const inFinder = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7)

  // 어두운 모듈을 둥근 점으로 (파인더 제외)
  ctx.fillStyle = BRAND
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!data[r * size + c] || inFinder(r, c)) continue
      const cx = ox + c * scale + scale / 2
      const cy = oy + r * scale + scale / 2
      ctx.beginPath()
      ctx.arc(cx, cy, scale * 0.42, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // 파인더 패턴 — 라운드 사각형 3중(스캔 안정성 유지)
  const drawFinder = (mr: number, mc: number) => {
    const x = ox + mc * scale
    const y = oy + mr * scale
    const s = 7 * scale
    ctx.fillStyle = BRAND; rr(x, y, s, s, scale * 1.6); ctx.fill()
    ctx.fillStyle = '#ffffff'; rr(x + scale, y + scale, s - scale * 2, s - scale * 2, scale * 1.1); ctx.fill()
    ctx.fillStyle = BRAND; rr(x + scale * 2, y + scale * 2, s - scale * 4, s - scale * 4, scale * 0.7); ctx.fill()
  }
  drawFinder(0, 0)
  drawFinder(0, size - 7)
  drawFinder(size - 7, 0)

  // 하단 "여름나무"
  ctx.fillStyle = '#ffffff'
  ctx.font = `600 ${Math.round(textH * 0.5)}px "Apple SD Gothic Neo", -apple-system, "Malgun Gothic", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('여름나무', W / 2, pad + inner + textH / 2 + 6)

  return canvas.toDataURL('image/png')
}

export function useQRCode() {
  function getPlantUrl(plantId: string): string {
    const origin = import.meta.client
      ? window.location.origin
      : useRuntimeConfig().public.siteUrl || 'https://summer-tree.vercel.app'
    return `${origin}/plant/${plantId}`
  }

  async function generateDataUrl(plantId: string): Promise<string> {
    return renderStyledQR(getPlantUrl(plantId))
  }

  async function downloadPNG(plantId: string, plantName: string): Promise<void> {
    const dataUrl = await generateDataUrl(plantId)
    const link = document.createElement('a')
    link.download = `QR_${plantName}.png`
    link.href = dataUrl
    link.click()
  }

  function printQR(dataUrl: string, plantName: string): void {
    const win = window.open('', '_blank', 'width=400,height=560')
    if (!win) return
    const escapedName = plantName.replace(/[<>&"']/g, (c) =>
      ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[c] ?? c
    )
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
<title>QR - ${escapedName}</title>
<style>body{font-family:sans-serif;text-align:center;padding:40px;margin:0}
img{width:280px;display:block;margin:0 auto}
p{margin-top:12px;font-size:15px;color:#111;font-weight:500}</style>
</head><body><img src="${dataUrl}"><p>${escapedName}</p>
<script>window.onload=function(){window.print();window.close()}<\/script>
</body></html>`)
    win.document.close()
  }

  return { getPlantUrl, generateDataUrl, downloadPNG, printQR }
}
