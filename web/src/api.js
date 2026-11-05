// Client unico verso l'API Apps Script. text/plain evita il preflight CORS.
import { token, logout } from './auth'

export class ApiError extends Error {
  constructor(code, message) { super(message || code); this.code = code }
}

export async function call(action, payload = {}) {
  let res
  try {
    res = await fetch(import.meta.env.VITE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, payload, idToken: token.value })
    })
  } catch {
    throw new ApiError('NETWORK', 'Connessione assente')
  }
  if (!res.ok) throw new ApiError('HTTP_' + res.status, 'Errore del server')
  const body = await res.json()
  if (!body.ok) {
    if (body.error === 'BAD_TOKEN' || body.error === 'NO_TOKEN') logout()
    throw new ApiError(body.error, body.message)
  }
  return body.data
}
