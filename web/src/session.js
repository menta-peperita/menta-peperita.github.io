import { ref, watch } from 'vue'
import { call } from './api'
import { token, isValid, logout } from './auth'

export const me = ref(null)
export const loading = ref(false)
export const error = ref('')

export async function loadMe() {
  if (!isValid()) return
  loading.value = true
  error.value = ''
  try { me.value = await call('whoami') }
  catch (e) { me.value = null; error.value = e.message }
  finally { loading.value = false }
}

export function esci() { logout(); me.value = null }

watch(token, (t, prev) => {
  if (!t) me.value = null
  else if (!me.value && t !== prev) loadMe()
})
