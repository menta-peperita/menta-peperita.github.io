// Client unico verso l'API Apps Script. text/plain evita il preflight CORS.
import { token, sessione, setSessione, ensureFresh, expire, logout } from './auth'

export class ApiError extends Error {
  constructor(code, message, fields) { super(message || code); this.code = code; this.fields = fields || null }
}

export async function call(action, payload = {}, retry = true) {
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
