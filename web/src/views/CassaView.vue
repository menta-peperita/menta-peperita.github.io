<script setup>
import { reactive, computed } from 'vue'
import { db, pronto, salva, nomeUtente } from '../store'
import { me } from '../session'
import { calcolaCassa, euro, fmtData, oggi } from '../logic/calcoli'
import { METODI } from '../stati'
import { notify } from '../toast'
import Seg from '../components/Seg.vue'
import Sheet from '../components/Sheet.vue'
import Vuoto from '../components/Vuoto.vue'
import Icona from '../components/Icona.vue'

const c = computed(() => calcolaCassa(db))
const TIPI = { INCASSO: 'Incasso', VERSAMENTO: 'Versato in cassa', RIMBORSO: 'Rimborso spesa', PRELIEVO: 'Prelievo utili' }
const movimenti = computed(() => [...db.Movimenti].sort((a, b) => String(b.data).localeCompare(String(a.data)) || String(b.id).localeCompare(String(a.id), 'it', { numeric: true })).slice(0, 80))
const effetto = (m) => (m.tipo === 'VERSAMENTO' || (m.tipo === 'INCASSO' && m.utente_id === 'cassa') ? 'in' : m.tipo === 'INCASSO' ? '' : 'out')
const numeroOrdine = (id) => db.Ordini.find((o) => o.id === id)?.numero || ''
const persone = computed(() => db.Utenti.map((u) => ({ value: u.id, label: u.nome })))

const mf = reactive({ aperto: false, tipo: 'VERSAMENTO', utente_id: '', importo: '', metodo: 'contanti', data: oggi(), note: '' })
function apri(tipo, utenteId, importo) {
  Object.assign(mf, { aperto: true, tipo, utente_id: utenteId || me.value.id, importo: importo || '', metodo: 'contanti', data: oggi(), note: '' })
}
async function salvaMov() {
  try {
    const { aperto, ...dati } = mf
    await salva('movimento', dati)
    mf.aperto = false
    notify('Movimento registrato')
  } catch (e) { notify(e.message, 'err') }
}
</script>

<template>
  <section>
    <div class="head-row">
      <h1 class="title">Cassa</h1>
      <button class="btn" @click="apri('VERSAMENTO')"><Icona nome="piu" :size="18" /> Movimento</button>
    </div>
    <div v-if="!pronto" class="col"><div v-for="i in 3" :key="i" class="skeleton" style="height: 80px"></div></div>
    <div v-else class="col stagger">
      <div class="card hero">
        <span>Saldo cassa comune</span>
        <strong class="huge">{{ euro(c.cassa) }}</strong>
        <small>Calcolato da incassi, versamenti, spese e rimborsi registrati.</small>
      </div>
      <div class="card">
        <h2 class="h2">Conti da sistemare</h2>
        <p v-if="!c.persone.length" class="muted">Tutto in pari.</p>
        <div v-for="p in c.persone" :key="p.id" class="col sm">
          <div v-if="p.inMano > 0" class="head-row">
            <span><strong>{{ nomeUtente(p.id) }}</strong> ha in mano <strong>{{ euro(p.inMano) }}</strong> da versare</span>
            <button class="btn ghost" @click="apri('VERSAMENTO', p.id, p.inMano)">Versa</button>
          </div>
          <div v-if="p.credito > 0" class="head-row">
            <span><strong>{{ nomeUtente(p.id) }}</strong> deve ricevere <strong>{{ euro(p.credito) }}</strong></span>
            <RouterLink to="/spese?filtro=rimborsare" class="btn ghost">Rimborsa</RouterLink>
          </div>
        </div>
      </div>
      <h2 class="h2">Movimenti</h2>
      <Vuoto v-if="!movimenti.length" testo="Ancora nessun movimento." />
      <TransitionGroup name="list" tag="ul" class="list">
        <li v-for="m in movimenti" :key="m.id" class="act">
          <p>
            <strong>{{ TIPI[m.tipo] || m.tipo }}</strong>
            <span class="muted"> &middot; {{ m.utente_id === 'cassa' ? 'in cassa' : nomeUtente(m.utente_id) }}<template v-if="m.ordine_id"> &middot; {{ numeroOrdine(m.ordine_id) }}</template><template v-if="m.metodo"> &middot; {{ m.metodo }}</template><template v-if="m.note"> &middot; {{ m.note }}</template></span><br>
            <small class="muted">{{ fmtData(m.data) }}</small>
          </p>
          <strong :class="effetto(m) === 'in' ? 'pos' : effetto(m) === 'out' ? 'neg' : ''">{{ effetto(m) === 'in' ? '+' : effetto(m) === 'out' ? '\u2212' : '' }}{{ euro(m.importo) }}</strong>
        </li>
      </TransitionGroup>
    </div>

    <Sheet :open="mf.aperto" titolo="Nuovo movimento" @close="mf.aperto = false">
      <fieldset class="field"><legend>Tipo</legend>
        <Seg v-model="mf.tipo" :opzioni="[{ value: 'VERSAMENTO', label: 'Versamento in cassa' }, { value: 'PRELIEVO', label: 'Prelievo utili' }, { value: 'INCASSO', label: 'Incasso senza ordine' }]" wrap />
      </fieldset>
      <label class="field"><span>{{ mf.tipo === 'VERSAMENTO' ? 'Chi versa' : mf.tipo === 'PRELIEVO' ? 'Chi riceve' : 'Chi ha ricevuto i soldi' }}</span>
        <select v-model="mf.utente_id">
          <option v-if="mf.tipo === 'INCASSO'" value="cassa">Cassa comune</option>
          <option v-for="p in persone" :key="p.value" :value="p.value">{{ p.label }}</option>
        </select>
      </label>
      <div class="grid2">
        <label class="field"><span>Importo &euro;</span><input v-model="mf.importo" type="text" inputmode="decimal"></label>
        <label class="field"><span>Data</span><input v-model="mf.data" type="date"></label>
      </div>
      <fieldset class="field"><legend>Metodo</legend><Seg v-model="mf.metodo" :opzioni="METODI" wrap /></fieldset>
      <label class="field"><span>Note</span><input v-model="mf.note" type="text"></label>
      <button class="btn full" :disabled="!mf.importo || !mf.utente_id" @click="salvaMov">Salva</button>
    </Sheet>
  </section>
</template>
