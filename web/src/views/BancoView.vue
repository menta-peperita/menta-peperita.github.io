<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db, pronto, azione } from '../store'
import { euro, num, r2, costoProdotto } from '../logic/calcoli'
import { riepilogoEvento } from '../eventi'
import { notify } from '../toast'
import Seg from '../components/Seg.vue'
import Icona from '../components/Icona.vue'

const route = useRoute()
const router = useRouter()
const id = route.params.id
const e = computed(() => db.Eventi.find((x) => x.id === id))
const carrello = ref({})
const metodo = ref('contanti')
const invio = ref(false)
const prodotti = computed(() => db.Prodotti.filter((p) => (p.attivo === true || p.attivo === 'TRUE') && num(p.prezzo) != null))
const senzaPrezzo = computed(() => db.Prodotti.filter((p) => (p.attivo === true || p.attivo === 'TRUE') && num(p.prezzo) == null).length)
const righe = computed(() => prodotti.value.filter((p) => carrello.value[p.id]).map((p) => ({ p, q: carrello.value[p.id] })))
const totale = computed(() => r2(righe.value.reduce((t, x) => t + x.q * num(x.p.prezzo), 0)))
const r = computed(() => riepilogoEvento(id))

function piu(p) { carrello.value = { ...carrello.value, [p.id]: (carrello.value[p.id] || 0) + 1 } }
function meno(p) {
  const q = (carrello.value[p.id] || 0) - 1
  const c = { ...carrello.value }
  if (q > 0) c[p.id] = q; else delete c[p.id]
  carrello.value = c
}
async function registra() {
  if (!righe.value.length || invio.value) return
  invio.value = true
  try {
    const out = await azione('banco.vendita', {
      evento_id: id, metodo: metodo.value,
      righe: righe.value.map(({ p, q }) => ({ prodotto_id: p.id, quantita: q, prezzo_unitario: num(p.prezzo), costo_unitario: costoProdotto(p.id, db).costo }))
    })
    carrello.value = {}
    notify('Vendita ' + out.numero + ' da ' + euro(out.totale) + ' registrata')
  } catch (x) { notify(x.message, 'err') } finally { invio.value = false }
}
</script>

<template>
  <section class="banco">
    <div class="head-row">
      <button class="icon-btn" aria-label="Indietro" @click="router.push('/mercatini/' + id)"><Icona nome="indietro" /></button>
      <h1 class="title grow">Cassa veloce</h1>
    </div>
    <p class="muted">{{ e?.nome }} &middot; {{ r.vendite }} vendite &middot; {{ euro(r.incassi) }}</p>
    <div v-if="!pronto" class="col"><div class="skeleton" style="height: 200px"></div></div>
    <template v-else>
      <p v-if="senzaPrezzo" class="muted hint">{{ senzaPrezzo }} prodotti senza prezzo non compaiono: impostalo in Prodotti.</p>
      <div class="tiles">
        <button v-for="p in prodotti" :key="p.id" class="tile tap" :class="{ on: carrello[p.id] }" @click="piu(p)">
          <strong>{{ p.nome }}</strong>
          <span class="head-row"><span class="pos">{{ euro(p.prezzo) }}</span><Transition name="pop" mode="out-in"><span v-if="carrello[p.id]" :key="carrello[p.id]" class="badge ok">&times; {{ carrello[p.id] }}</span></Transition></span>
        </button>
      </div>
      <div class="card banco-tot">
        <TransitionGroup name="list" tag="div" class="col sm">
          <div v-for="x in righe" :key="x.p.id" class="head-row">
            <span>{{ x.q }} &times; {{ x.p.nome }}</span>
            <button class="icon-btn" :aria-label="'Togli un ' + x.p.nome" @click="meno(x.p)">&minus;</button>
          </div>
        </TransitionGroup>
        <div class="tot"><span>{{ righe.length ? 'Totale' : 'Tocca i prodotti venduti' }}</span><strong class="huge">{{ euro(totale) }}</strong></div>
        <Seg v-model="metodo" :opzioni="[{ value: 'contanti', label: 'Contanti' }, { value: 'satispay', label: 'Satispay' }, { value: 'carta', label: 'Carta' }]" />
        <button class="btn full big-btn" :disabled="!righe.length || invio" @click="registra">{{ invio ? 'Registro\u2026' : 'Registra vendita' }}</button>
      </div>
    </template>
  </section>
</template>
