// Login con Google Identity Services: l'ID token viene mandato all'API, che lo verifica.
import { ref } from 'vue'

const KEY = 'mp_id_token'
export const token = ref(sessionStorage.getItem(KEY) || '')

function payload(jwt) {
  try {
    const b = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(decodeURIComponent(escape(atob(b))))
  } catch { return null }
}

export function isValid(jwt = token.value) {
  const p = jwt && payload(jwt)
  return !!p && p.exp * 1000 > Date.now() + 60_000
}

function waitForGis() {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const t = setInterval(() => {
      if (window.google?.accounts?.id) { clearInterval(t); resolve(window.google.accounts.id) }
      else if (Date.now() - start > 10_000) { clearInterval(t); reject(new Error('Google non raggiungibile')) }
    }, 100)
  })
}

export async function initLogin(buttonEl) {
  const gis = await waitForGis()
  gis.initialize({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    auto_select: true,
    callback: (r) => { token.value = r.credential; sessionStorage.setItem(KEY, r.credential) }
  })
  if (buttonEl) gis.renderButton(buttonEl, { theme: 'outline', size: 'large', shape: 'pill', locale: 'it' })
  gis.prompt()
}

export function logout() {
  token.value = ''
  sessionStorage.removeItem(KEY)
  window.google?.accounts?.id?.disableAutoSelect()
}
