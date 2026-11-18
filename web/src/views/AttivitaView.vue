<script setup>
import { ref, computed, onMounted } from 'vue'
import { call } from '../api'
import { caricaUtenti, nomeDi } from '../utenti'
import Vuoto from '../components/Vuoto.vue'

const righe = ref([])
const loading = ref(true)
const errore = ref('')
const chi = ref('')
const cosa = ref('')
const azione = ref('')
const cerca = ref('')
const VERBI = { crea: 'ha aggiunto', modifica: 'ha modificato', elimina: 'ha eliminato' }
const ENTITA = {
  ordine: 'ordine', vendita: 'vendita al banco', cliente: 'cliente', prodotto: 'prodotto', variante: 'variante', materiale: 'materiale',
  prodmat: 'materiale del prodotto', movimento: 'movimento di cassa', spesa: 'spesa', evento: 'mercatino', foto: 'foto',
  dacomprare: 'voce da comprare', utente: 'utente', password: 'password', impostazione: 'impostazione', conti: 'conti', import: 'import'
}

function quando(iso) {
  const d = new Date(iso)
  const ora = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === new Date().toDateString()) return 'oggi ' + ora
  if (d.toDateString() === new Date(Date.now() - 864e5).toDateString()) return 'ieri ' + ora
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) + ' ' + ora
}

const persone = computed(() => [...new Set(righe.value.map((a) => a.utente_id))].map((id) => ({ id, nome: id === 'import' ? 'Import' : nomeDi.value(id) })).sort((a, b) => a.nome.localeCompare(b.nome, 'it')))
const tipi = computed(() => [...new Set(righe.value.map((a) => a.entita))].map((k) => ({ k, l: ENTITA[k] || k })).sort((a, b) => a.l.localeCompare(b.l, 'it')))
const filtrate = computed(() => {
  const q = cerca.value.trim().toLowerCase()
  return righe.value.filter((a) => (!chi.value || a.utente_id === chi.value) && (!cosa.value || a.entita === cosa.value) && (!azione.value || a.azione === azione.value)
    && (!q || (String(a.dettaglio) + ' ' + (ENTITA[a.entita] || a.entita) + ' ' + nomeDi.value(a.utente_id)).toLowerCase().includes(q)))
})
const filtriAttivi = computed(() => !!(chi.value || cosa.value || azione.value || cerca.value))
function togli() { chi.value = ''; cosa.value = ''; azione.value = ''; cerca.value = '' }

onMounted(async () => {
  try {
    const [r] = await Promise.all([call('attivita.list', { limit: 200 }), caricaUtenti()])
    righe.value = r
  } catch (e) { errore.value = e.message } finally { loading.value = false }
})
</script>

<template>
  <section>
    <h1 class="title">Attivit&agrave;</h1>
    <p class="muted hint">Chi ha fatto cosa, dal pi&ugrave; recente (ultime 200 operazioni).</p>
    <div class="grid2">
      <select v-model="chi" aria-label="Filtra per persona"><option value="">Tutte le persone</option><option v-for="p in persone" :key="p.id" :value="p.id">{{ p.nome }}</option></select>
      <select v-model="cosa" aria-label="Filtra per tipo"><option value="">Tutti i tipi</option><option v-for="t in tipi" :key="t.k" :value="t.k">{{ t.l }}</option></select>
      <select v-model="azione" aria-label="Filtra per azione"><option value="">Tutte le azioni</option><option value="crea">Aggiunte</option><option value="modifica">Modifiche</option><option value="elimina">Eliminazioni</option></select>
      <input v-model="cerca" type="search" class="search-in" placeholder="Cerca (es. MP-012, Marti)" aria-label="Cerca">
    </div>
    <p v-if="filtriAttivi && !loading" class="riepilogo-filtro">
      <span>{{ filtrate.length }} di {{ righe.length }} operazioni</span>
      <button class="link-btn" @click="togli">Togli filtri</button>
    </p>
    <div v-if="loading" class="col">
      <div v-for="i in 4" :key="i" class="skeleton" style="height: 48px"></div>
    </div>
    <p v-else-if="errore" class="error shake">{{ errore }}</p>
    <Vuoto v-else-if="!filtrate.length" :testo="filtriAttivi ? 'Nessuna operazione con questi filtri.' : 'Ancora nessuna attivit\u00e0.'" />
    <TransitionGroup v-else name="list" tag="ul" class="list">
      <li v-for="a in filtrate" :key="a.id" class="act">
        <p><strong>{{ a.utente_id === 'import' ? 'Import' : nomeDi(a.utente_id) }}</strong> {{ VERBI[a.azione] || a.azione }} {{ ENTITA[a.entita] || a.entita }}<br><span class="muted">{{ a.dettaglio }}</span></p>
        <time class="muted">{{ quando(a.quando) }}</time>
      </li>
    </TransitionGroup>
  </section>
</template>