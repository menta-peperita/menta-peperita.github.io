// Foto: ridimensiona prima di caricare (max 1280 px, JPEG) e condivisione verso WhatsApp/Instagram.
export function ridimensiona(file, max = 1280) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height))
      const cv = document.createElement('canvas')
      cv.width = Math.round(img.width * k)
      cv.height = Math.round(img.height * k)
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height)
      const dataUrl = cv.toDataURL('image/jpeg', 0.82)
      URL.revokeObjectURL(img.src)
      resolve({ base64: dataUrl.split(',')[1], mime: 'image/jpeg' })
    }
    img.onerror = () => reject(new Error('Immagine non leggibile'))
    img.src = URL.createObjectURL(file)
  })
}

export function base64ToFile(base64, mime, nome) {
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new File([bytes], nome, { type: mime })
}

export async function copia(testo) {
  try { await navigator.clipboard.writeText(testo); return true } catch { return false }
}

/** Apre il menu di condivisione con foto (e testo). Ritorna false se il dispositivo non lo supporta. */
export async function condividi({ testo, file }) {
  const data = file ? { files: [file], text: testo } : { text: testo }
  if (file && !navigator.canShare?.({ files: [file] })) return false
  if (!navigator.share) return false
  try { await navigator.share(data) } catch (e) { if (e.name !== 'AbortError') throw e }
  return true
}

export function scaricaCsv(nome, righe) {
  const esc = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'
  const csv = '\ufeff' + righe.map((r) => r.map(esc).join(';')).join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  a.download = nome
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
