// Client unico verso l'API Apps Script. text/plain evita il preflight CORS.
import { ref } from 'vue'
import { token, sessione, setSessione, ensureFresh, expire, logout } from './auth'

// Operazioni in corso: alimentano la barra di caricamento globale
export const inCorso = ref(0)
export const etichetta = ref('')
const ETICHETTE = {
  dati: 'Aggiorno i dati\u2026', whoami: 'Verifico l\u2019accesso\u2026', salva: 'Salvo\u2026', elimina: 'Elimino\u2026',
  'ordine.salva': 'Salvo l\u2019ordine\u2026', 'ordine.stato': 'Aggiorno lo stato\u2026', 'ordine.elimina': 'Elimino l\u2019ordine\u2026', 'ordine.tempo': 'Salvo il tempo\u2026',
  'banco.vendita': 'Registro la vendita\u2026', 'spesa.rimborsa': 'Registro il rimborso\u2026',
  'foto.carica': 'Carico la foto\u2026', 'foto.dati': 'Preparo la foto\u2026', 'foto.elimina': 'Elimino la foto\u2026',
  'impostazioni.salva': 'Salvo le impostazioni\u2026', 'utenti.list': 'Carico gli utenti\u2026', 'utenti.save': 'Salvo l\u2019utente\u2026', 'utenti.delete': 'Elimino l\u2019utente\u2026',
  'attivita.list': 'Carico le attivit\u00e0\u2026', 'auth.codice.invia': 'Invio il codice\u2026', 'auth.codice.verifica': 'Verifico il codice\u2026',
  'auth.password': 'Accesso in corso\u2026', 'auth.imposta_password': 'Salvo la password\u2026', catalogo: 'Carico il catalogo\u2026'
}

export class ApiError extends Error {
  constructor(code, message, fields) { super(message || code); this.code = code; this.fields = fields || null }
}

export async function call(action, payload = {}, retry = true) {
  inCorso.value++
  etichetta.value = ETICHETTE[action] || 'Attendere\u2026'
  try { return await esegui(action, payload, retry) } finally { inCorso.value = Math.max(0, inCorso.value - 1) }
}

async function esegui(action, payload, retry) {
  const conSessione = !!sessione.value
  if (!conSessione) await ensureFresh()
  let res
  try {
    res = await fetch(import.meta.env.VITE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, payload, idToken: conSessione ? '' : token.value, sessione: sessione.value })
    })
  } catch {
    throw new ApiError('NETWORK', 'Connessione assente: riprova')
  }
  if (!res.ok) throw new ApiError('HTTP_' + res.status, 'Errore del server')
  const body = await res.json()
  if (body.ok) return body.data
  if (body.error === 'SESSION_EXPIRED') setSessione('')
  const authErr = body.error === 'BAD_TOKEN' || body.error === 'NO_TOKEN' || body.error === 'SESSION_EXPIRED'
  if (authErr && retry && !conSessione) {
    expire()
    if (await ensureFresh()) return call(action, payload, false)
  }
  if (authErr || body.error === 'NOT_ALLOWED') logout()
  throw new ApiError(body.error, body.message, body.fields)
}
