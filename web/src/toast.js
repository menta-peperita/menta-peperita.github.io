import { ref } from 'vue'

export const toast = ref(null)
let timer

export function notify(msg, tipo = 'ok') {
  toast.value = { msg, tipo, id: Date.now() }
  clearTimeout(timer)
  timer = setTimeout(() => { toast.value = null }, 3200)
}
