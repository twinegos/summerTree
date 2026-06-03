import QRCode from 'qrcode'

export function useQRCode() {
  function getPlantUrl(plantId: string): string {
    const origin = import.meta.client
      ? window.location.origin
      : useRuntimeConfig().public.siteUrl || 'https://summer-tree.vercel.app'
    return `${origin}/plant/${plantId}`
  }

  async function generateDataUrl(plantId: string): Promise<string> {
    return QRCode.toDataURL(getPlantUrl(plantId), {
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#1a1a1a', light: '#ffffff' },
    })
  }

  async function downloadPNG(plantId: string, plantName: string): Promise<void> {
    const dataUrl = await generateDataUrl(plantId)
    const link = document.createElement('a')
    link.download = `QR_${plantName}.png`
    link.href = dataUrl
    link.click()
  }

  function printQR(dataUrl: string, plantName: string): void {
    const win = window.open('', '_blank', 'width=400,height=520')
    if (!win) return
    const escapedName = plantName.replace(/[<>&"']/g, (c) =>
      ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[c] ?? c
    )
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
<title>QR - ${escapedName}</title>
<style>body{font-family:sans-serif;text-align:center;padding:40px;margin:0}
img{width:250px;height:250px;display:block;margin:0 auto}
p{margin-top:12px;font-size:15px;color:#111;font-weight:500}</style>
</head><body><img src="${dataUrl}"><p>${escapedName}</p>
<script>window.onload=function(){window.print();window.close()}<\/script>
</body></html>`)
    win.document.close()
  }

  return { getPlantUrl, generateDataUrl, downloadPNG, printQR }
}
