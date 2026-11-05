<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db, pronto, azione, salva, nomeProdotto, nomeUtente, fotoUrl } from '../store'
import { me } from '../session'
import { call } from '../api'
import { riepilogoOrdine, euro, fmtData, oggi, telefonoWa, testoMessaggio } from '../logic/calcoli'
import { STATI, PAGAMENTI, METODI } from '../stati'
import { ridimensiona, base64ToFile, copia, condividi } from '../media'
import { notify } from '../toast'
import Seg from '../components/Seg.vue'
import Sheet from '../components/Sheet.vue'
import Icona from '../components/Icona.vue'

const route = useRoute()
const router = useRouter()
const id = route.params.id
const o = computed(() => db.Ordini.find((x) => x.id === id))
const r = computed(() => (o.value ? riepilogoOrdine(o.value, db) : null))
const cliente = computed(() => db.Clienti.find((c) => c.id === o.value?.cliente_id) || null)
const pagamenti = computed(() => db.Movimenti.filter((m) => m.ordine_id === id && m.tipo === 'INCASSO'))
const foto = computed(() => db.Foto.filter((f) => f.ordine_id === id))
const haFoto = computed(() => !!ultimaFoto.value || foto.value.length > 0)
const occupato = ref(false)
const ultimaFoto = ref(null)
const anteprima = ref('')
const salvaFoto = ref(localStorage.getItem('mp_salva_foto') === '1')
watch(salvaFoto, (v) => { try { localStorage.setItem('mp_salva_foto', v ? '1' : '0') } catch {} })

// ---- stato
const statoOpz = Object.entries(STATI).map(([value, s]) => ({ value, label: s.label }))
const tempo = reactive({ aperto: false, ore: '', minuti: '', dopo: '' })
const fmtTempo = (m) => (m >= 60 ? Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '') : m + ' min')
function apriTempo(dopo = '') {
  const m = Number(o.value.tempo_min) || 0
  Object.assign(tempo, { aperto: true, ore: m ? Math.floor(m / 60) || '' : '', minuti: m ? m % 60 || '' : '', dopo })
}
async function salvaTempo(minuti) {
  const tot = minuti != null ? minuti : (Number(tempo.ore) || 0) * 60 + (Number(tempo.minuti) || 0)
  tempo.aperto = false
  try { await azione('ordine.tempo', { id, tempo_min: tot || '' }); if (tot) notify('Tempo registrato: ' + fmtTempo(tot)) } catch (e) { notify(e.message, 'err') }
}
async function cambiaStato(stato) {
  if (stato === o.value.stato) return
  if (stato === 'pronto' && !Number(o.value.tempo_min)) apriTempo()
  occupato.value = true
  try { await azione('ordine.stato', { id, stato }); notify('Stato: ' + STATI[stato].label) } catch (e) { notify(e.message, 'err') } finally { occupato.value = false }
}

// ---- pagamento
const pag = reactive({ aperto: false, importo: '', metodo: 'contanti', utente_id: '', data: oggi() })
const chiOpz = computed(() => [{ value: 'cassa', label: 'Cassa comune' }, ...db.Utenti.filter((u) => u.attivo).map((u) => ({ value: u.id, label: u.nome }))])
function apriPagamento() { Object.assign(pag, { aperto: true, importo: r.value.residuo || '', metodo: 'contanti', utente_id: me.value.id, data: oggi() }) }
async function salvaPagamento() {
  occupato.value = true
  try {
    await salva('movimento', { tipo: 'INCASSO', ordine_id: id, importo: pag.importo, metodo: pag.metodo, utente_id: pag.utente_id, data: pag.data })
    pag.aperto = false
    notify('Pagamento registrato')
  } catch (e) { notify(e.message, 'err') } finally { occupato.value = false }
}

// ---- foto
async function onFoto(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  occupato.value = true
  try {
    const img = await ridimensiona(file)
    ultimaFoto.value = base64ToFile(img.base64, img.mime, (o.value.numero || 'foto') + '.jpg')
    if (anteprima.value) URL.revokeObjectURL(anteprima.value)
    anteprima.value = URL.createObjectURL(ultimaFoto.value)
    if (salvaFoto.value) { await azione('foto.carica', { ordine_id: id, ...img }); notify('Foto salvata nell\u2019ordine') }
    else notify('Foto pronta per l\u2019invio (non salvata)')
  } catch (err) { notify(err.message, 'err') } finally { occupato.value = false }
}
async function fileFoto() {
  if (ultimaFoto.value) return ultimaFoto.value
  const f = foto.value[foto.value.length - 1]
  if (!f) return null
  const d = await call('foto.dati', { id: f.id })
  return (ultimaFoto.value = base64ToFile(d.base64, d.mime, (o.value.numero || 'foto') + '.jpg'))
}
async function eliminaFoto(f) {
  if (!confirm('Eliminare questa foto?')) return
  try { await azione('foto.elimina', { id: f.id }) } catch (e) { notify(e.message, 'err') }
}

// ---- messaggi
const tipoMsg = ref('pronto')
const testo = ref('')
const conFoto = ref(true)
const modelli = computed(() => ({ ricevuto: db.Impostazioni.messaggio_ricevuto, pronto: db.Impostazioni.messaggio_pronto, pagamento: db.Impostazioni.messaggio_pagamento }))
function rigenera() {
  if (!o.value || !r.value) return
  const v = {
    nome: (cliente.value?.nome || '').split(' ')[0], numero: o.value.numero,
    prodotti: r.value.righe.map((x) => x.quantita + ' ' + (nomeProdotto(x.prodotto_id) || x.descrizione)).join(', '),
    residuo: euro(r.value.residuo),
    consegna_frase: o.value.consegna_entro ? ' Te lo consegniamo entro il ' + fmtData(o.value.consegna_entro) + '.' : '',
    residuo_frase: r.value.residuo > 0 ? ' Resta da saldare ' + euro(r.value.residuo) + ': quando passi a ritirarlo?' : ' Quando passi a ritirarlo?'
  }
  testo.value = testoMessaggio(tipoMsg.value, v, modelli.value)
}
watch([tipoMsg, () => o.value, () => r.value?.residuo], rigenera, { immediate: true })

async function whatsapp() {
  try {
    const file = conFoto.value && haFoto.value ? await fileFoto() : null
    if (file && (await condividi({ testo: testo.value, file }))) return
    const tel = telefonoWa(cliente.value?.telefono)
    window.open('https://wa.me/' + tel + '?text=' + encodeURIComponent(testo.value), '_blank', 'noopener')
  } catch (e) { notify(e.message, 'err') }
}
async function instagram() {
  try {
    const ok = await copia(testo.value)
    notify(ok ? 'Messaggio copiato: incollalo nella chat' : 'Copia il messaggio a mano', ok ? 'ok' : 'err')
    const file = conFoto.value && haFoto.value ? await fileFoto() : null
    if (file && (await condividi({ file }))) return
    const h = String(cliente.value?.instagram || '').replace(/^@/, '')
    window.open(h ? 'https://ig.me/m/' + encodeURIComponent(h) : 'https://www.instagram.com/direct/inbox/', '_blank', 'noopener')
  } catch (e) { notify(e.message, 'err') }
}

async function eliminaOrdine() {
  if (!confirm('Eliminare l\u2019ordine ' + o.value.numero + '? Non si pu\u00f2 annullare.')) return
  try { await azione('ordine.elimina', { id }); notify('Ordine eliminato'); router.replace('/ordini') } catch (e) { notify(e.message, 'err') }
}
</script>

<template>
  <section>
    <div class="head-row">
      <button class="icon-btn" aria-label="Indietro" @click="router.push('/ordini')"><Icona nome="indietro" /></button>
      <h1 class="title grow">{{ o?.numero || 'Ordine' }}</h1>
      <RouterLink v-if="o" :to="'/ordini/' + id + '/modifica'" class="icon-btn" aria-label="Modifica"><Icona nome="matita" /></RouterLink>
    </div>
    <div v-if="!pronto" class="col"><div v-for="i in 3" :key="i" class="skeleton" style="height: 90px"></div></div>
    <p v-else-if="!o" class="muted">Ordine non trovato.</p>
    <div v-else class="col stagger">
      <div class="card">
        <small class="muted">{{ fmtData(o.data) }}<template v-if="o.canale"> &middot; {{ o.canale }}</template><template v-if="o.creato_da"> &middot; inserito da {{ nomeUtente(o.creato_da) }}</template></small>
        <strong class="big">{{ cliente?.nome || (o.evento_id ? 'Vendita al banco' : 'Senza nome') }}</strong>
        <div v-if="cliente && (cliente.telefono || cliente.instagram)" class="chips">
          <a v-if="cliente.telefono" class="chip" :href="'tel:' + cliente.telefono"><Icona nome="telefono" :size="16" /> {{ cliente.telefono }}</a>
          <a v-if="cliente.instagram" class="chip" :href="'https://instagram.com/' + cliente.instagram" target="_blank" rel="noopener"><Icona nome="instagram" :size="16" /> @{{ cliente.instagram }}</a>
        </div>
        <Seg :model-value="o.stato" :opzioni="statoOpz" wrap @update:model-value="cambiaStato" />
        <small v-if="o.consegna_entro || o.assegnato_a" class="muted">
          <template v-if="o.consegna_entro">Consegna entro {{ fmtData(o.consegna_entro) }}</template>
          <template v-if="o.assegnato_a"> &middot; lo fa {{ nomeUtente(o.assegnato_a) }}</template>
        </small>
        <p v-if="o.note" class="note">{{ o.note }}</p>
        <button class="link-btn" @click="apriTempo()">{{ Number(o.tempo_min) ? 'Tempo di lavoro: ' + fmtTempo(Number(o.tempo_min)) + ' \u00b7 modifica' : 'Aggiungi il tempo di lavoro' }}</button>
      </div>

      <div class="card">
        <h2 class="h2">Prodotti</h2>
        <div v-for="(x, i) in r.righe" :key="i" class="head-row">
          <span>{{ x.quantita }} &times; {{ nomeProdotto(x.prodotto_id) || x.descrizione }}<span v-if="x.variante_id" class="muted"> &middot; {{ db.Varianti.find((v) => v.id === x.variante_id)?.nome }}</span></span>
          <span>{{ x.prezzo_unitario === '' ? 'da definire' : euro(x.prezzo_unitario * x.quantita) }}</span>
        </div>
        <div class="tot"><span>Totale</span><strong>{{ r.definito || r.totale ? euro(r.totale) : 'Da definire' }}</strong></div>
      </div>

      <div class="card">
        <div class="head-row"><h2 class="h2">Pagamenti</h2><span class="badge" :class="PAGAMENTI[r.pagamento].cls">{{ PAGAMENTI[r.pagamento].label }}</span></div>
        <TransitionGroup name="list" tag="div" class="col">
          <div v-for="m in pagamenti" :key="m.id" class="head-row">
            <span>{{ fmtData(m.data) }} &middot; {{ m.metodo || 'pagamento' }} &middot; a {{ nomeUtente(m.utente_id) }}</span>
            <strong>{{ euro(m.importo) }}</strong>
          </div>
        </TransitionGroup>
        <div v-if="r.residuo > 0" class="tot danger"><span>Resta da incassare</span><strong>{{ euro(r.residuo) }}</strong></div>
        <button class="btn ghost" @click="apriPagamento">Registra pagamento</button>
      </div>

      <div class="card">
        <h2 class="h2">Foto</h2>
        <TransitionGroup name="list" tag="div" class="foto-grid">
          <div v-if="anteprima" key="tmp" class="foto tmp" :style="{ backgroundImage: 'url(' + anteprima + ')' }" role="img" aria-label="Foto appena scattata"><span>{{ salvaFoto ? 'Salvata' : 'Solo invio' }}</span></div>
          <button v-for="f in foto" :key="f.id" class="foto" :style="{ backgroundImage: 'url(' + fotoUrl(f.drive_id, 400) + ')' }" :aria-label="'Elimina foto'" @click="eliminaFoto(f)"></button>
          <label key="add" class="foto add"><Icona nome="foto" /> Scatta<input type="file" accept="image/*" capture="environment" @change="onFoto"></label>
        </TransitionGroup>
        <label class="check"><input v-model="salvaFoto" type="checkbox"> Salva anche nell&rsquo;ordine (occupa spazio su Drive)</label>
        <small v-if="foto.length" class="muted">Tocca una foto salvata per eliminarla.</small>
      </div>

      <div class="card">
        <h2 class="h2">Messaggio al cliente</h2>
        <Seg v-model="tipoMsg" :opzioni="[{ value: 'ricevuto', label: 'Ricevuto' }, { value: 'pronto', label: '\u00c8 pronto' }, { value: 'pagamento', label: 'Promemoria' }]" wrap />
        <textarea v-model="testo" rows="4" aria-label="Testo del messaggio"></textarea>
        <label v-if="haFoto" class="check"><input v-model="conFoto" type="checkbox"> Allega la foto</label>
        <div class="grid2">
          <button class="btn" @click="whatsapp"><Icona nome="whatsapp" :size="18" /> WhatsApp</button>
          <button class="btn ghost" @click="instagram"><Icona nome="instagram" :size="18" /> Instagram</button>
        </div>
        <small class="muted">Instagram: il testo viene copiato, poi incollalo nella chat.</small>
      </div>

      <div class="grid2">
        <RouterLink :to="'/ordini/nuovo?da=' + id" class="btn ghost">Duplica</RouterLink>
        <button v-if="me.ruolo === 'Titolare'" class="btn ghost danger" @click="eliminaOrdine">Elimina</button>
      </div>
    </div>

    <Sheet :open="tempo.aperto" titolo="Quanto tempo ci avete messo?" @close="tempo.aperto = false">
      <p class="muted">Tempo totale per tutto l&rsquo;ordine, anche approssimativo. Serve a calcolare quanto rende ogni prodotto.</p>
      <div class="grid3q">
        <button v-for="m in [30, 60, 120, 180, 240, 360]" :key="m" type="button" class="btn ghost" @click="salvaTempo(m)">{{ fmtTempo(m) }}</button>
      </div>
      <div class="grid2">
        <label class="field"><span>Ore</span><input v-model="tempo.ore" type="text" inputmode="numeric"></label>
        <label class="field"><span>Minuti</span><input v-model="tempo.minuti" type="text" inputmode="numeric"></label>
      </div>
      <button class="btn full" :disabled="!tempo.ore && !tempo.minuti" @click="salvaTempo()">Salva</button>
      <button class="btn ghost full" @click="tempo.aperto = false">Salta</button>
    </Sheet>
    <Sheet :open="pag.aperto" titolo="Registra pagamento" @close="pag.aperto = false">
      <label class="field"><span>Importo &euro;</span><input v-model="pag.importo" type="text" inputmode="decimal" required></label>
      <fieldset class="field"><legend>Metodo</legend><Seg v-model="pag.metodo" :opzioni="METODI" wrap /></fieldset>
      <label class="field"><span>Chi ha ricevuto i soldi</span>
        <select v-model="pag.utente_id"><option v-for="c in chiOpz" :key="c.value" :value="c.value">{{ c.label }}</option></select>
      </label>
      <label class="field"><span>Data</span><input v-model="pag.data" type="date"></label>
      <button class="btn full" :disabled="occupato || !pag.importo" @click="salvaPagamento">Salva pagamento</button>
    </Sheet>
  </section>
</template>
