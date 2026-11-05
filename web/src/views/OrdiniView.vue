<script setup>
import { ref, computed } from 'vue'
import { db, pronto, nomeProdotto, nomeUtente } from '../store'
import { riepilogoOrdine, euro, fmtData, oggi } from '../logic/calcoli'
import { STATI, PAGAMENTI } from '../stati'
import Seg from '../components/Seg.vue'
import Vuoto from '../components/Vuoto.vue'
import Icona from '../components/Icona.vue'

const filtro = ref('aperti')
const cerca = ref('')
const match = (k, o) => k === 'tutti' || (k === 'aperti' ? ['lavorazione', 'pronto'].includes(o.stato) : o.stato === k)
const filtri = computed(() => [['aperti', 'Aperti'], ['pronto', 'Pronti'], ['consegnato', 'Consegnati'], ['tutti', 'Tutti']]
  .map(([value, l]) => ({ value, label: l + ' \u00b7 ' + db.Ordini.filter((o) => match(value, o)).length })))

const lista = computed(() => {
  const q = cerca.value.trim().toLowerCase()
  const oggiS = oggi()
  return db.Ordini.filter((o) => match(filtro.value, o))
    .map((o) => {
      const r = riepilogoOrdine(o, db)
      return {
        ...o, r,
        cliente: db.Clienti.find((c) => c.id === o.cliente_id)?.nome || (o.evento_id ? 'Vendita al banco' : 'Senza nome'),
        prodotti: r.righe.map((x) => x.quantita + ' \u00d7 ' + (nomeProdotto(x.prodotto_id) || x.descrizione)).join(', '),
        ritardo: o.consegna_entro && o.consegna_entro < oggiS && ['lavorazione', 'pronto'].includes(o.stato)
      }
    })
    .filter((o) => !q || (o.cliente + ' ' + o.numero + ' ' + o.prodotti).toLowerCase().includes(q))
    .sort((a, b) => String(b.data).localeCompare(String(a.data)) || String(b.numero).localeCompare(String(a.numero)))
})
</script>

<template>
  <section>
    <div class="head-row">
      <h1 class="title">Ordini</h1>
      <RouterLink to="/ordini/nuovo" class="btn"><Icona nome="piu" :size="18" /> Nuovo</RouterLink>
    </div>
    <Seg v-model="filtro" :opzioni="filtri" class="scroll-x" />
    <input v-model="cerca" type="search" class="search" placeholder="Cerca cliente, numero o prodotto" aria-label="Cerca">
    <div v-if="!pronto" class="col"><div v-for="i in 4" :key="i" class="skeleton" style="height: 96px"></div></div>
    <Vuoto v-else-if="!lista.length" testo="Nessun ordine in questa vista." />
    <TransitionGroup v-else name="list" tag="ul" class="list">
      <li v-for="o in lista" :key="o.id">
        <RouterLink :to="'/ordini/' + o.id" class="card tap order">
          <div class="head-row">
            <small class="muted"><strong>{{ o.numero }}</strong> &middot; {{ fmtData(o.data) }}<template v-if="o.canale"> &middot; {{ o.canale }}</template></small>
            <span class="badge" :class="STATI[o.stato]?.cls">{{ STATI[o.stato]?.label || o.stato }}</span>
          </div>
          <strong class="big">{{ o.cliente }}</strong>
          <span class="muted">{{ o.prodotti }}</span>
          <div class="head-row">
            <strong>{{ o.r.definito || o.r.totale ? euro(o.r.totale) : '' }}</strong>
            <span class="badge" :class="PAGAMENTI[o.r.pagamento].cls">{{ PAGAMENTI[o.r.pagamento].label }}<template v-if="o.r.pagamento === 'acconto'"> &middot; mancano {{ euro(o.r.residuo) }}</template></span>
          </div>
          <small v-if="o.consegna_entro || o.assegnato_a" :class="o.ritardo ? 'error' : 'muted'">
            <template v-if="o.consegna_entro">Consegna entro {{ fmtData(o.consegna_entro) }}<template v-if="o.ritardo"> &middot; in ritardo</template></template>
            <template v-if="o.assegnato_a"> &middot; lo fa {{ nomeUtente(o.assegnato_a) }}</template>
          </small>
        </RouterLink>
      </li>
    </TransitionGroup>
  </section>
</template>
