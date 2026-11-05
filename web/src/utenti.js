// Elenco utenti condiviso tra le schermate (caricato una volta, aggiornato dopo ogni salvataggio).
import { ref, computed } from 'vue'
import { call } from './api'

export const utenti = ref([])
export const caricati = ref(false)
export const nomeDi = computed(() => {
  const m = Object.fromEntries(utenti.value.map((u) => [u.id, u.nome]))
  return (id) => m[id] || id
})

export async function caricaUtenti(forza = false) {
  if (caricati.value && !forza) return utenti.value
  utenti.value = await call('utenti.list')
  caricati.value = true
  return utenti.value
}

export async function salvaUtente(u) {
  const saved = await call('utenti.save', u)
  const i = utenti.value.findIndex((x) => x.id === saved.id)
  if (i >= 0) utenti.value.splice(i, 1, saved); else utenti.value.push(saved)
  return saved
}

export const iniziali = (nome) => String(nome || '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
