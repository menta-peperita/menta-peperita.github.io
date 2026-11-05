// Login Google: l'ID token va all'API, che lo verifica. Rinnovo silenzioso prima della scadenza (~1 ora).
import { ref } from 'vue'

const KEY = 'mp_id_token'
export const token = ref(sessionStorage.getItem(KEY) || '')
let gis = null
let waiters = []

function payload(jwt) {
  try {
    const b = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(decodeURIComponent(escape(atob(b))))
  } catch { return null }
}

export function isValid(jwt = token.value, marginMs = 60_000) {
  const p = jwt && payload(jwt)
  return !!p && p.exp * 1000 > Date.now() + marginMs
}

function setToken(t) {
  token.value = t
  if (t) sessionStorage.setItem(KEY, t); else sessionStorage.removeItem(KEY)
}

function waitForGis() {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const t = setInterval(() => {
      if (window.google?.accounts?.id) { clearInterval(t); resolve(window.google.accounts.id) }
      else if (Date.now() - start > 10_000) { clearInterval(t); reject(new Error('Google non raggiungibile: controlla la connessione')) }
    }, 100)
  })
}

export async function initLogin(buttonEl) {
  if (!gis) {
    gis = await waitForGis()
    gis.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      auto_select: true,
      callback: (r) => { setToken(r.credential); waiters.splice(0).forEach((w) => w(true)) }
    })
  }
  if (buttonEl) gis.renderButton(buttonEl, { theme: 'outline', size: 'large', shape: 'pill', locale: 'it' })
  if (!isValid()) gis.prompt()
}

/** Garantisce un token valido per almeno 5 minuti; se serve chiede a Google un rinnovo silenzioso. */
export function ensureFresh() {
  if (isValid(token.value, 5 * 60_000)) return Promise.resolve(true)
  if (!gis) return Promise.resolve(isValid())
  return new Promise((resolve) => {
    waiters.push(resolve)
    gis.prompt()
    setTimeout(() => {
      const i = waiters.indexOf(resolve)
      if (i >= 0) { waiters.splice(i, 1); resolve(isValid()) }
    }, 8000)
  })
}

export function expire() { setToken('') }

// Sessione per l'accesso con codice via email o password (60 giorni, salvata sul dispositivo)
const SKEY = 'mp_sessione'
export const sessione = ref(localStorage.getItem(SKEY) || '')
export function setSessione(t) {
  sessione.value = t
  try { if (t) localStorage.setItem(SKEY, t); else localStorage.removeItem(SKEY) } catch {}
}
export const autenticato = () => !!sessione.value || isValid()

export function logout() {
  setToken('')
  setSessione('')
  window.google?.accounts?.id?.disableAutoSelect()
}

// Controllo periodico: rinnova in background prima che scada
setInterval(() => { if (token.value && !isValid(token.value, 5 * 60_000)) ensureFresh() }, 60_000)
