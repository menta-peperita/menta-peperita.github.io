<script setup>
import { ref, computed, watch } from 'vue'
import { db, pronto, salva, nomeUtente, nomeProdotto } from '../store'
import { me } from '../session'
import { call } from '../api'
import { statistiche, divisioneUtili, riepilogoOrdine, calcolaCassa, euro, oggi, r2 } from '../logic/calcoli'
import { scaricaCsv } from '../media'
import { notify } from '../toast'
import Seg from '../components/Seg.vue'

const periodo = ref('mese')
const range = computed(() => {
  const t = oggi()
  const y = t.slice(0, 4)
  const m = Number(t.slice(5, 7))
  const pad = (n) => String(n).padStart(2, '0')
  if (periodo.value === 'mese') return [y + '-' + pad(m) + '-01', y + '-' + pad(m) + '-31']
  if (periodo.value === 'scorso') { const yy = m === 1 ? Number(y) - 1 : y; const mm = m === 1 ? 12 : m - 1; return [yy + '-' + pad(mm) + '-01', yy + '-' + pad(mm) + '-31'] }
  if (periodo.value === 'anno') return [y + '-01-01', y + '-12-31']
  return ['', '']
})
const s = computed(() => statistiche(db, ...range.value))
const max = (arr) => Math.max(1, ...arr.map((x) => x.n))
const kpi = computed(() => [
  ['Ordini', s.value.ordini], ['Venduto', euro(s.value.venduto)], ['Incassato', euro(s.value.incassato)], ['Spese', euro(s.value.spese)],
  ['Utile (incassi \u2212 spese)', euro(s.value.utile)], ['Da incassare (tutti)', euro(s.value.daIncassare)]
])

// Divisione utili
const titolari = computed(() => db.Utenti.filter((u) => u.ruolo === 'Titolare'))
const quote = ref({})
function caricaQuote() {
  let q = null
  try { q = JSON.parse(db.Impostazioni.quote || 'null') } catch {}
  quote.value = q && typeof q === 'object' ? { ...q } : Object.fromEntries(titolari.value.filter((u) => u.attivo).map((u) => [u.id, 1]))
}
watch(() => [pronto.value, db.Impostazioni.quote], caricaQuote, { immediate: true })
const divisione = computed(() => divisioneUtili(s.value.utile, quote.value))
const cassa = computed(() => calcolaCassa(db).cassa)
async function salvaQuote() {
  try { await call('impostazioni.salva', { chiave: 'quote', valore: JSON.stringify(quote.value) }); db.Impostazioni.quote = JSON.stringify(quote.value); notify('Quote salvate') } catch (e) { notify(e.message, 'err') }
}
async function registraPrelievi() {
  const tot = r2(divisione.value.reduce((t, d) => t + d.importo, 0))
  if (!tot || !confirm('Registrare prelievi dalla cassa per ' + euro(tot) + '?')) return
  try {
    for (const d of divisione.value.filter((x) => x.importo > 0)) await salva('movimento', { tipo: 'PRELIEVO', utente_id: d.id, importo: d.importo, data: oggi(), metodo: 'contanti', note: 'Divisione utili' })
    notify('Prelievi registrati')
  } catch (e) { notify(e.message, 'err') }
}

// Export
const inP = (d) => (!range.value[0] || d >= range.value[0]) && (!range.value[1] || d <= range.value[1])
function esporta() {
  const suff = (range.value[0] || 'tutto') + '.csv'
  scaricaCsv('ordini-' + suff, [['Numero', 'Data', 'Cliente', 'Canale', 'Stato', 'Prodotti', 'Totale', 'Incassato', 'Da incassare'],
    ...db.Ordini.filter((o) => inP(o.data)).map((o) => {
      const r = riepilogoOrdine(o, db)
      return [o.numero, o.data, db.Clienti.find((c) => c.id === o.cliente_id)?.nome || '', o.canale, o.stato, r.righe.map((x) => x.quantita + ' ' + (nomeProdotto(x.prodotto_id) || x.descrizione)).join(', '), r.totale, r.incassato, r.residuo]
    })])
  scaricaCsv('movimenti-' + suff, [['Data', 'Tipo', 'Importo', 'Metodo', 'Persona', 'Ordine', 'Note'],
    ...db.Movimenti.filter((m) => inP(m.data)).map((m) => [m.data, m.tipo, m.importo, m.metodo, nomeUtente(m.utente_id), db.Ordini.find((o) => o.id === m.ordine_id)?.numero || '', m.note])])
  scaricaCsv('spese-' + suff, [['Data', 'Descrizione', 'Negozio', 'Quantita', 'Costo', 'Pagato da', 'Rimborso'],
    ...db.Spese.filter((x) => inP(x.data)).map((x) => [x.data, x.descrizione, x.negozio, x.quantita, x.costo, nomeUtente(x.pagato_da), x.stato_rimborso])])
}
</script>

<template>
  <section>
    <h1 class="title">Statistiche</h1>
    <Seg v-model="periodo" :opzioni="[{ value: 'mese', label: 'Questo mese' }, { value: 'scorso', label: 'Mese scorso' }, { value: 'anno', label: 'Anno' }, { value: 'tutto', label: 'Tutto' }]" class="scroll-x" />
    <div v-if="!pronto" class="col"><div v-for="i in 3" :key="i" class="skeleton" style="height: 90px"></div></div>
    <div v-else class="col stagger">
      <div class="kpis">
        <div v-for="[l, v] in kpi" :key="l" class="card kpi"><small class="muted">{{ l }}</small><strong>{{ v }}</strong></div>
      </div>
      <div class="card">
        <h2 class="h2">Pezzi per prodotto</h2>
        <p v-if="!s.pezzi.length" class="muted">Nessun dato nel periodo.</p>
        <div v-for="x in s.pezzi" :key="x.nome" class="bar"><div class="head-row"><span>{{ x.nome }}</span><strong>{{ x.n }}</strong></div><div class="track"><div class="fill" :style="{ width: (x.n / max(s.pezzi)) * 100 + '%' }"></div></div></div>
      </div>
      <div class="card">
        <h2 class="h2">Da dove arrivano gli ordini</h2>
        <div v-for="x in s.canali" :key="x.nome" class="bar"><div class="head-row"><span>{{ x.nome }}</span><strong>{{ x.n }}</strong></div><div class="track"><div class="fill chili" :style="{ width: (x.n / max(s.canali)) * 100 + '%' }"></div></div></div>
        <small class="muted">Margine sui materiali nel periodo: {{ euro(s.margineMateriali) }}</small>
      </div>
      <div class="card">
        <h2 class="h2">Divisione utili</h2>
        <p class="muted">Utile del periodo {{ euro(s.utile) }} &middot; in cassa {{ euro(cassa) }}</p>
        <div v-for="u in titolari" :key="u.id" class="head-row">
          <span>{{ u.nome }}</span>
          <span class="quota"><input v-model.number="quote[u.id]" type="number" min="0" step="1" :disabled="me.ruolo !== 'Titolare'" :aria-label="'Quota di ' + u.nome"><strong>{{ euro(divisione.find((d) => d.id === u.id)?.importo || 0) }}</strong></span>
        </div>
        <small class="muted">Le quote sono pesi: 1 e 1 = met&agrave; ciascuno; 2 e 1 = due terzi e un terzo.</small>
        <div v-if="me.ruolo === 'Titolare'" class="grid2">
          <button class="btn ghost" @click="salvaQuote">Salva quote</button>
          <button class="btn" :disabled="s.utile <= 0" @click="registraPrelievi">Registra prelievi</button>
        </div>
      </div>
      <div class="card">
        <h2 class="h2">Esporta</h2>
        <p class="muted">Ordini, movimenti e spese del periodo in tre file CSV (si aprono con Excel o Fogli Google).</p>
        <button class="btn ghost" @click="esporta">Scarica CSV</button>
      </div>
    </div>
  </section>
</template>
