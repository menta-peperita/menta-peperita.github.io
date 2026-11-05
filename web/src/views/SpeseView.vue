<script setup>
import { ref, reactive, computed } from 'vue'
import { useRoute } from 'vue-router'
import { db, pronto, salva, elimina, azione, nomeUtente } from '../store'
import { me } from '../session'
import { euro, fmtData, oggi, r2 } from '../logic/calcoli'
import { notify } from '../toast'
import Seg from '../components/Seg.vue'
import Sheet from '../components/Sheet.vue'
import Vuoto from '../components/Vuoto.vue'
import Icona from '../components/Icona.vue'

const route = useRoute()
const filtro = ref(route.query.filtro === 'rimborsare' ? 'rimborsare' : 'tutte')
const STATO = { da_rimborsare: { label: 'Da rimborsare', cls: 'off' }, rimborsato: { label: 'Rimborsata', cls: 'ok' } }
const lista = computed(() => db.Spese.filter((s) => filtro.value === 'tutte' || s.stato_rimborso === 'da_rimborsare')
  .sort((a, b) => String(b.data).localeCompare(String(a.data))))
const totale = computed(() => r2(lista.value.reduce((t, s) => t + Number(s.costo || 0), 0)))
const pagatori = computed(() => [{ value: 'cassa', label: 'Cassa comune' }, ...db.Utenti.map((u) => ({ value: u.id, label: u.nome }))])
const vuota = () => ({ aperto: true, id: '', data: oggi(), descrizione: '', negozio: '', quantita: '', costo: '', pagato_da: 'cassa', evento_id: '', materiale_id: '', note: '' })
const sf = reactive({ aperto: false })
const occupato = ref(false)

function apri(s) {
  Object.assign(sf, vuota(), s ? { id: s.id, data: s.data, descrizione: s.descrizione, negozio: s.negozio || '', quantita: s.quantita ?? '', costo: s.costo ?? '', pagato_da: s.pagato_da || 'cassa', evento_id: s.evento_id || '', materiale_id: s.materiale_id || '', note: s.note || '' } : {})
}
async function salvaSpesa() {
  occupato.value = true
  try {
    const { aperto, ...dati } = sf
    const vecchia = db.Spese.find((x) => x.id === sf.id)
    if (dati.pagato_da === 'cassa') dati.stato_rimborso = ''
    else if (!vecchia || vecchia.pagato_da !== dati.pagato_da) dati.stato_rimborso = 'da_rimborsare'
    if (!dati.id) delete dati.id
    else delete dati.materiale_id
    await salva('spesa', dati)
    sf.aperto = false
    notify('Spesa salvata')
  } catch (e) { notify(e.message, 'err') } finally { occupato.value = false }
}
async function rimborsa(s) {
  if (!confirm('Rimborsare ' + euro(s.costo) + ' a ' + nomeUtente(s.pagato_da) + ' dalla cassa comune?')) return
  try { await azione('spesa.rimborsa', { id: s.id }); notify('Rimborso registrato') } catch (e) { notify(e.message, 'err') }
}
async function eliminaSpesa() {
  if (!confirm('Eliminare questa spesa?')) return
  try { await elimina('spesa', sf.id); sf.aperto = false } catch (e) { notify(e.message, 'err') }
}
</script>

<template>
  <section>
    <div class="head-row">
      <h1 class="title">Spese</h1>
      <button class="btn" @click="apri()"><Icona nome="piu" :size="18" /> Nuova</button>
    </div>
    <Seg v-model="filtro" :opzioni="[{ value: 'tutte', label: 'Tutte' }, { value: 'rimborsare', label: 'Da rimborsare \u00b7 ' + db.Spese.filter((s) => s.stato_rimborso === 'da_rimborsare').length }]" />
    <div v-if="!pronto" class="col"><div v-for="i in 3" :key="i" class="skeleton" style="height: 72px"></div></div>
    <template v-else>
      <p class="muted hint">Totale: <strong>{{ euro(totale) }}</strong></p>
      <Vuoto v-if="!lista.length" testo="Nessuna spesa." />
      <TransitionGroup name="list" tag="ul" class="list">
        <li v-for="s in lista" :key="s.id" class="card">
          <button class="row-btn" @click="apri(s)">
            <div class="head-row"><strong>{{ s.descrizione }}<small v-if="s.quantita" class="muted"> &times; {{ s.quantita }}</small></strong><strong>{{ euro(s.costo) }}</strong></div>
            <small class="muted">{{ fmtData(s.data) }}<template v-if="s.negozio"> &middot; {{ s.negozio }}</template> &middot; pagato da {{ nomeUtente(s.pagato_da) }}<template v-if="s.evento_id"> &middot; {{ db.Eventi.find((e) => e.id === s.evento_id)?.nome }}</template></small>
          </button>
          <div v-if="STATO[s.stato_rimborso]" class="head-row">
            <span class="badge" :class="STATO[s.stato_rimborso].cls">{{ STATO[s.stato_rimborso].label }}</span>
            <button v-if="s.stato_rimborso === 'da_rimborsare'" class="btn ghost" @click="rimborsa(s)">Rimborsa</button>
          </div>
        </li>
      </TransitionGroup>
    </template>

    <Sheet :open="sf.aperto" :titolo="sf.id ? 'Modifica spesa' : 'Nuova spesa'" @close="sf.aperto = false">
      <label class="field"><span>Cosa</span><input v-model="sf.descrizione" type="text" required></label>
      <div class="grid2">
        <label class="field"><span>Costo &euro;</span><input v-model="sf.costo" type="text" inputmode="decimal" required></label>
        <label class="field"><span>Quantit&agrave;</span><input v-model="sf.quantita" type="text" inputmode="decimal"></label>
        <label class="field"><span>Dove</span><input v-model="sf.negozio" type="text" placeholder="Pepco, Action&hellip;"></label>
        <label class="field"><span>Data</span><input v-model="sf.data" type="date"></label>
      </div>
      <label class="field"><span>Pagato da</span><select v-model="sf.pagato_da"><option v-for="p in pagatori" :key="p.value" :value="p.value">{{ p.label }}</option></select></label>
      <small v-if="sf.pagato_da !== 'cassa'" class="muted">Risulter&agrave; da rimborsare dalla cassa comune.</small>
      <label class="field"><span>Mercatino (facoltativo)</span><select v-model="sf.evento_id"><option value="">&mdash;</option><option v-for="e in db.Eventi" :key="e.id" :value="e.id">{{ e.nome }} {{ fmtData(e.data) }}</option></select></label>
      <label v-if="!sf.id" class="field"><span>Materiale comprato (aggiorna la scorta)</span><select v-model="sf.materiale_id"><option value="">&mdash;</option><option v-for="m in db.Materiali" :key="m.id" :value="m.id">{{ m.nome }}</option></select></label>
      <label class="field"><span>Note</span><input v-model="sf.note" type="text"></label>
      <button class="btn full" :disabled="occupato || !sf.descrizione || !sf.costo" @click="salvaSpesa">Salva</button>
      <button v-if="sf.id && me.ruolo === 'Titolare'" class="btn ghost danger full" @click="eliminaSpesa">Elimina spesa</button>
    </Sheet>
  </section>
</template>
