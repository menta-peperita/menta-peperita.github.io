<script setup>
import { ref, onMounted } from 'vue'
import { call } from '../api'
import { caricaUtenti, nomeDi } from '../utenti'

const righe = ref([])
const loading = ref(true)
const errore = ref('')
const VERBI = { crea: 'ha aggiunto', modifica: 'ha modificato', elimina: 'ha eliminato' }

function quando(iso) {
  const d = new Date(iso)
  const oggi = new Date()
  const ieri = new Date(Date.now() - 864e5)
  const ora = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === oggi.toDateString()) return 'oggi ' + ora
  if (d.toDateString() === ieri.toDateString()) return 'ieri ' + ora
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) + ' ' + ora
}

onMounted(async () => {
  try {
    const [r] = await Promise.all([call('attivita.list', { limit: 100 }), caricaUtenti()])
    righe.value = r
  } catch (e) { errore.value = e.message } finally { loading.value = false }
})
</script>

<template>
  <section>
    <h1 class="title">Attivit&agrave;</h1>
    <p class="muted hint">Chi ha fatto cosa, dal pi&ugrave; recente.</p>
    <div v-if="loading" class="col">
      <div v-for="i in 4" :key="i" class="skeleton" style="height: 48px"></div>
    </div>
    <p v-else-if="errore" class="error shake">{{ errore }}</p>
    <div v-else-if="!righe.length" class="card center empty"><p class="muted">Ancora nessuna attivit&agrave;.</p></div>
    <TransitionGroup v-else name="list" tag="ul" class="list stagger">
      <li v-for="a in righe" :key="a.id" class="act">
        <p><strong>{{ nomeDi(a.utente_id) }}</strong> {{ VERBI[a.azione] || a.azione }} {{ a.entita }} <span class="muted">&middot; {{ a.dettaglio }}</span></p>
        <time class="muted">{{ quando(a.quando) }}</time>
      </li>
    </TransitionGroup>
  </section>
</template>
