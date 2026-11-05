import { ref, watch } from 'vue'
import { call } from './api'
import { token, sessione, autenticato, logout } from './auth'

export const me = ref(null)
export const loading = ref(false)
export const error = ref('')

export async function loadMe() {
  if (!autenticato()) return
  loading.value = true
  error.value = ''
  try { me.value = await call('whoami') }
  catch (e) { me.value = null; error.value = e.message }
  finally { loading.value = false }
}

export function esci() {
  if (sessione.value) call('auth.esci', { sessione: sessione.value }).catch(() => {})
  logout()
  me.value = null
}

watch([token, sessione], () => {
  if (!autenticato()) me.value = null
  else if (!me.value) loadMe()
})
