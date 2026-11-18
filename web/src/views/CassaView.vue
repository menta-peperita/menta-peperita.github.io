<script setup>
import { ref, reactive, computed } from 'vue'
import { db, pronto, salva, elimina, azione, nomeUtente, carica } from '../store'
import { me } from '../session'
import { calcolaCassa, contiPersone, euro, fmtData, oggi } from '../logic/calcoli'
import { METODI } from '../stati'
import { notify } from '../toast'
import Seg from '../components/Seg.vue'
import Sheet from '../components/Sheet.vue'
import Vuoto from '../components/Vuoto.vue'
import Icona from '../components/Icona.vue'

const c = computed(() => calcolaCassa(db))
const conti = computed(() => contiPersone(db))
const inGiro = computed(() => conti.value.reduce((t, p) => t + Math.abs(p.netto), 0))
const aperto = ref('')
const TIPI = { INCASSO: 'Incasso', VERSAMENTO: 'Versato in cassa', RIMBORSO: 'Rimborso spesa', PRELIEVO: 'Prelievo utili' }
const chi = ref('')
const tipo = ref('')
const nomiMov = computed(() => {
  const ids = [...new Set(db.Movimenti.map((m) => m.utente_id).filter(Boolean))]
  return ids.map((id) => ({ value: id, label: id === 'cassa' ? 'Cassa comune' : nomeUtente(id) })).sort((a, b) => a.label.localeCompare(b.label, 'it'))
})
const filtrati = computed(() => db.Movimenti
  .filter((m) => (!chi.value || m.utente_id === chi.value) && (!tipo.value || m.tipo === tipo.value))
  .sort((a, b) => String(b.data).localeCompare(String(a.data)) || String(b.id).localeCompare(String(a.id), 'it', { numeric: true })))
const movimenti = computed(() => filtrati.value.slice(0, 150))
const sommaFiltrati = computed(() => filtrati.value.reduce((t, m) => t + Number(m.importo || 0), 0))
const effetto = (m) => (m.tipo === 'VERSAMENTO' || (m.tipo === 'INCASSO' && m.utente_id === 'cassa') ? 'in' : m.tipo === 'INCASSO' ? '' : 'out')
const numeroOrdine = (id) => db.Ordini.find((o) => o.id === id)?.numero || ''
const persone = computed(() => db.Utenti.map((u) => ({ value: u.id, label: u.nome })))
const titolare = computed(() => me.value.ruolo === 'Titolare')

function frase(p) {
  if (p.netto > 0) return nomeUtente(p.id) + ' deve versare ' + euro(p.netto) + ' in cassa'
  if (p.netto < 0) return 'La cassa deve dare ' + euro(-p.netto) + ' a ' + nomeUtente(p.id)
  return nomeUtente(p.id) + ': incassi e spese si compensano'
}

async function pareggia(p) {
  const righe = []
  if (p.inMano > 0) righe.push('\u2022 versa in cassa ' + euro(p.inMano))
  if (p.speseAperte.length) righe.push('\u2022 rimborso di ' + p.speseAperte.length + (p.speseAperte.length === 1 ? ' spesa' : ' spese') + ' per ' + euro(p.credito))
  righe.push(p.netto >= 0 ? 'In pratica ' + nomeUtente(p.id) + ' mette in cassa ' + euro(p.netto) + '.' : 'In pratica la cassa d\u00e0 ' + euro(-p.netto) + ' a ' + nomeUtente(p.id) + '.')
  if (!confirm('Mettere in pari ' + nomeUtente(p.id) + '?\n\n' + righe.join('\n'))) return
  try {
    await azione('conti.pareggia', { utente_id: p.id, versamento: p.inMano > 0 ? p.inMano : 0, spese: p.speseAperte.map((s) => s.id) })
    notify(nomeUtente(p.id) + ' \u00e8 in pari')
  } catch (e) { notify(e.message, 'err') }
}

const mf = reactive({ aperto: false, tipo: 'VERSAMENTO', utente_id: '', importo: '', metodo: 'contanti', data: oggi(), note: '' })
function apri(tipo, utenteId, importo) {
  Object.assign(mf, { aperto: true, tipo, utente_id: utenteId || me.value.id, importo: importo || '', metodo: 'contanti', data: oggi(), note: '' })
}
async function salvaMov() {
  try {
    const { aperto: _a, ...dati } = mf
    await salva('movimento', dati)
    mf.aperto = false
    notify('Movimento registrato')
  } catch (e) { notify(e.message, 'err') }
}
async function eliminaMov(m) {
  if (!confirm('Eliminare questo movimento (' + (TIPI[m.tipo] || m.tipo) + ' di ' + euro(m.importo) + ')?' + (m.tipo === 'RIMBORSO' ? '\nLa spesa torner\u00e0 da rimborsare.' : ''))) return
  try {
    await elimina('movimento', m.id)
    if (m.tipo === 'RIMBORSO') await carica()
    notify('Movimento eliminato')
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
        <div class="head-row">
          <h2 class="h2">Conti da sistemare</h2>
          <span class="badge" :class="conti.length ? 'warn' : 'ok'">{{ conti.length ? conti.length + ' aperti \u00b7 ' + euro(inGiro) : 'Tutto in pari' }}</span>
        </div>
        <p v-if="!conti.length" class="muted">Nessuno ha soldi da versare o spese da farsi rimborsare.</p>
        <TransitionGroup name="list" tag="div" class="col sm">
          <div v-for="p in conti" :key="p.id" class="conto" :class="p.netto > 0 ? 'dare' : p.netto < 0 ? 'avere' : ''">
            <button class="conto-head" :aria-expanded="aperto === p.id" @click="aperto = aperto === p.id ? '' : p.id">
              <span class="avatar">{{ nomeUtente(p.id).slice(0, 1).toUpperCase() }}</span>
              <span class="grow">{{ frase(p) }}</span>
              <strong :class="p.netto > 0 ? 'neg' : 'pos'">{{ euro(Math.abs(p.netto)) }}</strong>
            </button>
            <Transition name="pop">
              <div v-if="aperto === p.id" class="conto-det">
                <div v-if="p.inMano" class="head-row"><span>Incassi tenuti da {{ nomeUtente(p.id) }}</span><strong>{{ euro(p.inMano) }}</strong></div>
                <div v-for="s in p.speseAperte" :key="s.id" class="head-row"><span>Spesa da rimborsare &middot; {{ s.descrizione }} <small class="muted">{{ fmtData(s.data) }}</small></span><strong>{{ euro(s.costo) }}</strong></div>
                <div v-if="p.credito && !p.speseAperte.length" class="head-row"><span>Credito verso la cassa</span><strong>{{ euro(p.credito) }}</strong></div>
              </div>
            </Transition>
            <button class="btn full" @click="pareggia(p)">Metti in pari</button>
          </div>
        </TransitionGroup>
      </div>

      <h2 class="h2">Movimenti</h2>
      <div class="grid2">
        <select v-model="chi" aria-label="Filtra per persona">
          <option value="">Tutte le persone</option>
          <option v-for="n in nomiMov" :key="n.value" :value="n.value">{{ n.label }}</option>
        </select>
        <select v-model="tipo" aria-label="Filtra per tipo">
          <option value="">Tutti i tipi</option>
          <option v-for="(l, k) in TIPI" :key="k" :value="k">{{ l }}</option>
        </select>
      </div>
      <p v-if="chi || tipo" class="riepilogo-filtro">
        <span>{{ filtrati.length }} {{ filtrati.length === 1 ? 'movimento' : 'movimenti' }}</span>
        <span>Totale <strong>{{ euro(sommaFiltrati) }}</strong></span>
        <button class="link-btn" @click="chi = ''; tipo = ''">Togli filtri</button>
      </p>
      <Vuoto v-if="!movimenti.length" :testo="chi || tipo ? 'Nessun movimento con questi filtri.' : 'Ancora nessun movimento.'" />
      <TransitionGroup name="list" tag="ul" class="list">
        <li v-for="m in movimenti" :key="m.id" class="act">
          <p>
            <strong>{{ TIPI[m.tipo] || m.tipo }}</strong>
            <span class="muted"> &middot; {{ m.utente_id === 'cassa' ? 'in cassa' : nomeUtente(m.utente_id) }}<template v-if="m.ordine_id"> &middot; {{ numeroOrdine(m.ordine_id) }}</template><template v-if="m.metodo"> &middot; {{ m.metodo }}</template><template v-if="m.note"> &middot; {{ m.note }}</template></span><br>
            <small class="muted">{{ fmtData(m.data) }}</small>
          </p>
          <span class="azioni-riga">
            <strong :class="effetto(m) === 'in' ? 'pos' : effetto(m) === 'out' ? 'neg' : ''">{{ effetto(m) === 'in' ? '+' : effetto(m) === 'out' ? '\u2212' : '' }}{{ euro(m.importo) }}</strong>
            <button v-if="titolare" class="icon-btn" aria-label="Elimina movimento" @click="eliminaMov(m)"><Icona nome="cestino" :size="18" /></button>
          </span>
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