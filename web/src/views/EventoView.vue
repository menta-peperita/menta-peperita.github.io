<script setup>
import { ref, reactive, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db, pronto, salva, elimina } from '../store'
import { me } from '../session'
import { euro, fmtData } from '../logic/calcoli'
import { checklistDi, riepilogoEvento } from '../eventi'
import { notify } from '../toast'
import Sheet from '../components/Sheet.vue'
import Icona from '../components/Icona.vue'

const route = useRoute()
const router = useRouter()
const id = route.params.id
const e = computed(() => db.Eventi.find((x) => x.id === id))
const lista = computed(() => (e.value ? checklistDi(e.value) : []))
const r = computed(() => riepilogoEvento(id))
const nuovoItem = ref('')
const ef = reactive({ aperto: false, nome: '', luogo: '', data: '', note: '' })

async function salvaLista(l) { try { await salva('evento', { id, checklist: JSON.stringify(l) }) } catch (x) { notify(x.message, 'err') } }
function spunta(i) { const l = lista.value.map((x) => ({ ...x })); l[i].ok = !l[i].ok; salvaLista(l) }
function aggiungi() { if (!nuovoItem.value.trim()) return; salvaLista([...lista.value, { t: nuovoItem.value.trim(), ok: false }]); nuovoItem.value = '' }
function togli(i) { const l = [...lista.value]; l.splice(i, 1); salvaLista(l) }
async function salvaEvento() {
  try { const { aperto, ...d } = ef; await salva('evento', { id, ...d }); ef.aperto = false } catch (x) { notify(x.message, 'err') }
}
async function eliminaEvento() {
  if (!confirm('Eliminare ' + e.value.nome + '?')) return
  try { await elimina('evento', id); router.replace('/mercatini') } catch (x) { notify(x.message, 'err') }
}
</script>

<template>
  <section>
    <div class="head-row">
      <button class="icon-btn" aria-label="Indietro" @click="router.push('/mercatini')"><Icona nome="indietro" /></button>
      <h1 class="title grow">{{ e?.nome || 'Mercatino' }}</h1>
      <button v-if="e" class="icon-btn" aria-label="Modifica" @click="Object.assign(ef, { aperto: true, nome: e.nome, luogo: e.luogo || '', data: e.data || '', note: e.note || '' })"><Icona nome="matita" /></button>
    </div>
    <div v-if="!pronto" class="col"><div v-for="i in 3" :key="i" class="skeleton" style="height: 80px"></div></div>
    <p v-else-if="!e" class="muted">Mercatino non trovato.</p>
    <div v-else class="col stagger">
      <p class="muted">{{ fmtData(e.data) }}<template v-if="e.luogo"> &middot; {{ e.luogo }}</template><template v-if="e.note"> &middot; {{ e.note }}</template></p>
      <RouterLink :to="'/mercatini/' + id + '/banco'" class="btn full big-btn"><Icona nome="cassa" /> Apri la cassa veloce</RouterLink>
      <div class="card">
        <h2 class="h2">Com&rsquo;&egrave; andata</h2>
        <div class="head-row"><span>Vendite</span><strong>{{ r.vendite }} ({{ r.pezzi }} pezzi)</strong></div>
        <div class="head-row"><span>Incassi</span><strong class="pos">{{ euro(r.incassi) }}</strong></div>
        <div class="head-row"><span>Spese del mercatino</span><strong class="neg">{{ euro(r.spese) }}</strong></div>
        <div class="tot"><span>Risultato</span><strong :class="r.risultato >= 0 ? 'pos' : 'neg'">{{ euro(r.risultato) }}</strong></div>
        <small class="muted">Le spese si collegano al mercatino dalla sezione Spese.</small>
      </div>
      <div class="card">
        <h2 class="h2">Cosa portare &middot; {{ lista.filter((x) => x.ok).length }}/{{ lista.length }}</h2>
        <TransitionGroup name="list" tag="div" class="col sm">
          <div v-for="(x, i) in lista" :key="x.t + i" class="head-row">
            <label class="check grow"><input type="checkbox" :checked="x.ok" @change="spunta(i)"><span :class="{ barrato: x.ok }">{{ x.t }}</span></label>
            <button class="icon-btn" aria-label="Togli" @click="togli(i)"><Icona nome="cestino" :size="18" /></button>
          </div>
        </TransitionGroup>
        <form class="add-row" @submit.prevent="aggiungi"><input v-model="nuovoItem" type="text" placeholder="Aggiungi alla lista" aria-label="Aggiungi alla lista"><button class="btn" :disabled="!nuovoItem.trim()">+</button></form>
      </div>
      <button v-if="me.ruolo === 'Titolare'" class="btn ghost danger" @click="eliminaEvento">Elimina mercatino</button>
    </div>
    <Sheet :open="ef.aperto" titolo="Modifica mercatino" @close="ef.aperto = false">
      <label class="field"><span>Nome</span><input v-model="ef.nome" type="text"></label>
      <div class="grid2"><label class="field"><span>Data</span><input v-model="ef.data" type="date"></label><label class="field"><span>Luogo</span><input v-model="ef.luogo" type="text"></label></div>
      <label class="field"><span>Note</span><input v-model="ef.note" type="text"></label>
      <button class="btn full" @click="salvaEvento">Salva</button>
    </Sheet>
  </section>
</template>
