// Tema: 'auto' segue il sistema, oppure 'light' / 'dark' scelti dall'utente (salvato sul dispositivo).
import { ref } from 'vue'

export const tema = ref(localStorage.getItem('mp_tema') || 'auto')

export function applicaTema(t = tema.value) {
  tema.value = t
  try { localStorage.setItem('mp_tema', t) } catch {}
  const html = document.documentElement
  if (t === 'auto') delete html.dataset.theme; else html.dataset.theme = t
  const scuro = t === 'dark' || (t === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', scuro ? '#141713' : '#4A7320')
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (tema.value === 'auto') applicaTema('auto') })