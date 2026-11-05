<script setup>
import { reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { db, pronto, salva } from '../store'
import { euro, fmtData, oggi } from '../logic/calcoli'
import { checklistNuova, riepilogoEvento } from '../eventi'
import { notify } from '../toast'
import Sheet from '../components/Sheet.vue'
import Vuoto from '../components/Vuoto.vue'
import Icona from '../components/Icona.vue'

const router = useRouter()
const oggiS = oggi()
const prossimi = computed(() => db.Eventi.filter((e) => !e.data || e.data >= oggiS).sort((a, b) => String(a.data).localeCompare(String(b.data))))
const passati = computed(() => db.Eventi.filter((e) => e.data && e.data < oggiS).sort((a, b) => String(b.data).localeCompare(String(a.data))).map((e) => ({ ...e, r: riepilogoEvento(e.id) })))
const MESI = ['GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC']
const ef = reactive({ aperto: false, nome: '', luogo: '', data: '', note: '' })

async function crea() {
  try {
    const e = await salva('evento', { nome: ef.nome, luogo: ef.luogo, data: ef.data, note: ef.note, checklist: checklistNuova() })
    ef.aperto = false
    router.push('/mercatini/' + e.id)
  } catch (x) { notify(x.message, 'err') }
}
</script>

<template>
  <section>
    <div class="head-row">
      <h1 class="title">Mercatini</h1>
      <button class="btn" @click="Object.assign(ef, { aperto: true, nome: '', luogo: '', data: oggiS, note: '' })"><Icona nome="piu" :size="18" /> Evento</button>
    </div>
    <div v-if="!pronto" class="col"><div v-for="i in 3" :key="i" class="skeleton" style="height: 72px"></div></div>
    <template v-else>
      <Vuoto v-if="!db.Eventi.length" testo="Aggiungi il prossimo mercatino: avrai la lista di cosa portare e la cassa veloce." />
      <h2 v-if="prossimi.length" class="h2">Prossimi</h2>
      <TransitionGroup name="list" tag="ul" class="list">
        <li v-for="e in prossimi" :key="e.id">
          <RouterLink :to="'/mercatini/' + e.id" class="card tap row">
            <span class="cal"><small>{{ e.data ? MESI[Number(e.data.slice(5, 7)) - 1] : '' }}</small><strong>{{ e.data ? e.data.slice(8, 10) : '?' }}</strong></span>
            <span class="row-main"><strong>{{ e.nome }}</strong><small>{{ e.luogo }}</small></span>
          </RouterLink>
        </li>
      </TransitionGroup>
      <h2 v-if="passati.length" class="h2">Passati</h2>
      <TransitionGroup name="list" tag="ul" class="list">
        <li v-for="e in passati" :key="e.id">
          <RouterLink :to="'/mercatini/' + e.id" class="card tap row">
            <span class="cal muted"><small>{{ MESI[Number(e.data.slice(5, 7)) - 1] }}</small><strong>{{ e.data.slice(8, 10) }}</strong></span>
            <span class="row-main"><strong>{{ e.nome }}</strong><small>{{ e.r.vendite }} vendite &middot; incassi {{ euro(e.r.incassi) }}</small></span>
            <strong :class="e.r.risultato >= 0 ? 'pos' : 'neg'">{{ euro(e.r.risultato) }}</strong>
          </RouterLink>
        </li>
      </TransitionGroup>
    </template>

    <Sheet :open="ef.aperto" titolo="Nuovo mercatino" @close="ef.aperto = false">
      <label class="field"><span>Nome</span><input v-model="ef.nome" type="text" placeholder="Mercatino di Natale" required></label>
      <div class="grid2">
        <label class="field"><span>Data</span><input v-model="ef.data" type="date"></label>
        <label class="field"><span>Luogo</span><input v-model="ef.luogo" type="text"></label>
      </div>
      <label class="field"><span>Note</span><input v-model="ef.note" type="text"></label>
      <button class="btn full" :disabled="!ef.nome.trim()" @click="crea">Crea</button>
    </Sheet>
  </section>
</template>
