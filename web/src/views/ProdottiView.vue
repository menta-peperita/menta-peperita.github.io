<script setup>
import { ref, reactive, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db, pronto, salva, elimina, azione, fotoUrl } from '../store'
import { me } from '../session'
import { margineProdotto, fabbisogno, euro, num } from '../logic/calcoli'
import { ridimensiona } from '../media'
import { notify } from '../toast'
import Seg from '../components/Seg.vue'
import Sheet from '../components/Sheet.vue'
import Vuoto from '../components/Vuoto.vue'
import Icona from '../components/Icona.vue'

const route = useRoute()
const router = useRouter()
const tab = computed({ get: () => route.query.tab || 'prodotti', set: (v) => router.replace({ query: { tab: v } }) })
const titolare = computed(() => me.value.ruolo === 'Titolare')
const occupato = ref(false)
const attivo = (x) => x.attivo === true || x.attivo === 'TRUE'
const fatto = (d) => d.fatto === true || d.fatto === 'TRUE'
const err = (e) => notify(e.message, 'err')

// ---------- Prodotti
const prodotti = computed(() => [...db.Prodotti].sort((a, b) => attivo(b) - attivo(a) || a.nome.localeCompare(b.nome, 'it'))
  .map((p) => ({ ...p, m: margineProdotto(p, db) })))
const pf = reactive({ aperto: false, id: '', nome: '', prezzo: '', tempo_min: '', descrizione: '', pubblico: true, attivo: true })
const varianti = computed(() => db.Varianti.filter((v) => v.prodotto_id === pf.id))
const materialiP = computed(() => db.ProdottiMateriali.filter((x) => x.prodotto_id === pf.id))
const margine = computed(() => (pf.id ? margineProdotto({ id: pf.id, prezzo: pf.prezzo }, db) : null))
const fotoAttuale = computed(() => db.Prodotti.find((p) => p.id === pf.id)?.foto_id)
const nv = reactive({ gruppo: 'Colore', nome: '', sovrapprezzo: '' })
const nm = reactive({ materiale_id: '', quantita: 1 })

function apriProdotto(p) {
  Object.assign(pf, p
    ? { aperto: true, id: p.id, nome: p.nome, prezzo: p.prezzo ?? '', tempo_min: p.tempo_min ?? '', descrizione: p.descrizione || '', pubblico: p.pubblico === true || p.pubblico === 'TRUE', attivo: attivo(p) }
    : { aperto: true, id: '', nome: '', prezzo: '', tempo_min: '', descrizione: '', pubblico: true, attivo: true })
}
async function salvaProdotto() {
  occupato.value = true
  try {
    const o = await salva('prodotto', { id: pf.id || undefined, nome: pf.nome, prezzo: pf.prezzo, tempo_min: pf.tempo_min, descrizione: pf.descrizione, pubblico: pf.pubblico, attivo: pf.attivo })
    notify(pf.id ? 'Prodotto aggiornato' : 'Prodotto creato: ora puoi aggiungere foto, varianti e materiali')
    pf.id = o.id
  } catch (e) { err(e) } finally { occupato.value = false }
}
async function eliminaProdotto() {
  if (!confirm('Eliminare ' + pf.nome + '?')) return
  try { await elimina('prodotto', pf.id); pf.aperto = false; notify('Prodotto eliminato') } catch (e) { err(e) }
}
async function aggiungiVariante() {
  try { await salva('variante', { prodotto_id: pf.id, ...nv }); nv.nome = ''; nv.sovrapprezzo = '' } catch (e) { err(e) }
}
async function aggiungiMateriale() {
  try { await salva('prodmat', { prodotto_id: pf.id, ...nm }); nm.materiale_id = ''; nm.quantita = 1 } catch (e) { err(e) }
}
async function togliFiglio(entita, id) { try { await elimina(entita, id) } catch (e) { err(e) } }
async function fotoProdotto(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  occupato.value = true
  try { await azione('foto.carica', { prodotto_id: pf.id, ...(await ridimensiona(file, 1000)) }); notify('Foto aggiornata') } catch (x) { err(x) } finally { occupato.value = false }
}

// ---------- Materiali
const materiali = computed(() => [...db.Materiali].sort((a, b) => a.nome.localeCompare(b.nome, 'it')).map((m) => {
  const scorta = num(m.scorta)
  const soglia = num(m.soglia_minima)
  const serve = fabbisogno(m.id, db)
  return { ...m, serve, sotto: scorta != null && ((soglia != null && scorta < soglia) || scorta < serve) }
}))
const mf = reactive({ aperto: false, id: '', nome: '', unita: 'pz', costo_unitario: '', scorta: '', soglia_minima: '', attivo: true })
function apriMateriale(m) {
  Object.assign(mf, m
    ? { aperto: true, id: m.id, nome: m.nome, unita: m.unita || 'pz', costo_unitario: m.costo_unitario ?? '', scorta: m.scorta ?? '', soglia_minima: m.soglia_minima ?? '', attivo: attivo(m) }
    : { aperto: true, id: '', nome: '', unita: 'pz', costo_unitario: '', scorta: '', soglia_minima: '', attivo: true })
}
async function salvaMateriale() {
  occupato.value = true
  try {
    const { aperto, ...dati } = mf
    await salva('materiale', { ...dati, id: mf.id || undefined })
    mf.aperto = false
    notify('Materiale salvato')
  } catch (e) { err(e) } finally { occupato.value = false }
}
async function eliminaMateriale() {
  if (!confirm('Eliminare ' + mf.nome + '?')) return
  try { await elimina('materiale', mf.id); mf.aperto = false } catch (e) { err(e) }
}

// ---------- Da comprare
const daComprare = computed(() => [...db.DaComprare].sort((a, b) => fatto(a) - fatto(b)))
const suggeriti = computed(() => materiali.value.filter((m) => m.sotto && attivo(m) && !db.DaComprare.some((d) => d.materiale_id === m.id && !fatto(d))))
const nuovo = ref('')
async function aggiungiDaComprare(m) {
  const desc = m ? m.nome : nuovo.value.trim()
  if (!desc) return
  try {
    await salva('dacomprare', { descrizione: desc, materiale_id: m?.id || '', quantita: m ? Math.max(1, (num(m.soglia_minima) || 0) + m.serve - (num(m.scorta) || 0)) : '' })
    nuovo.value = ''
  } catch (e) { err(e) }
}
async function spunta(d) { try { await salva('dacomprare', { id: d.id, fatto: !fatto(d) }) } catch (e) { err(e) } }
</script>

<template>
  <section>
    <div class="head-row">
      <h1 class="title">Prodotti</h1>
      <button v-if="tab === 'prodotti'" class="btn" @click="apriProdotto()"><Icona nome="piu" :size="18" /> Nuovo</button>
      <button v-if="tab === 'materiali'" class="btn" @click="apriMateriale()"><Icona nome="piu" :size="18" /> Nuovo</button>
    </div>
    <Seg v-model="tab" :opzioni="[{ value: 'prodotti', label: 'Listino' }, { value: 'materiali', label: 'Materiali' }, { value: 'comprare', label: 'Da comprare' + (suggeriti.length ? ' \u00b7 ' + suggeriti.length : '') }]" />
    <div v-if="!pronto" class="col"><div v-for="i in 4" :key="i" class="skeleton" style="height: 72px"></div></div>

    <template v-else-if="tab === 'prodotti'">
      <Vuoto v-if="!prodotti.length" testo="Nessun prodotto: aggiungi il primo." />
      <TransitionGroup name="list" tag="ul" class="list">
        <li v-for="p in prodotti" :key="p.id">
          <button class="card tap row full-w" :class="{ off: !attivo(p) }" @click="apriProdotto(p)">
            <span class="thumb" :style="p.foto_id ? { backgroundImage: 'url(' + fotoUrl(p.foto_id, 200) + ')' } : null"><Icona v-if="!p.foto_id" nome="prodotti" /></span>
            <span class="row-main"><strong>{{ p.nome }}</strong>
              <small>{{ p.m.prezzo == null ? 'Prezzo da definire' : euro(p.m.prezzo) }}<template v-if="p.m.prezzo != null"> &middot; margine {{ euro(p.m.margine) }}{{ p.m.completo ? '' : ' (costi incompleti)' }}</template></small>
            </span>
            <span v-if="!attivo(p)" class="badge off">Disattivato</span>
          </button>
        </li>
      </TransitionGroup>
    </template>

    <template v-else-if="tab === 'materiali'">
      <Vuoto v-if="!materiali.length" testo="Aggiungi i materiali che usi per calcolare costi e scorte." />
      <TransitionGroup name="list" tag="ul" class="list">
        <li v-for="m in materiali" :key="m.id">
          <button class="card tap row full-w" :class="{ off: !attivo(m) }" @click="apriMateriale(m)">
            <span class="row-main"><strong>{{ m.nome }}</strong>
              <small>{{ m.costo_unitario === '' ? 'costo ?' : euro(m.costo_unitario) + '/' + (m.unita || 'pz') }} &middot; scorta {{ m.scorta === '' ? '?' : m.scorta }}<template v-if="m.serve"> &middot; servono {{ m.serve }}</template></small>
            </span>
            <span v-if="m.sotto" class="badge off">Da comprare</span>
          </button>
        </li>
      </TransitionGroup>
    </template>

    <template v-else>
      <div v-if="suggeriti.length" class="card">
        <h2 class="h2">Sotto scorta</h2>
        <div v-for="m in suggeriti" :key="m.id" class="head-row">
          <span>{{ m.nome }} <small class="muted">scorta {{ m.scorta }}, servono {{ m.serve }}</small></span>
          <button class="btn ghost" @click="aggiungiDaComprare(m)">Aggiungi</button>
        </div>
      </div>
      <form class="add-row" @submit.prevent="aggiungiDaComprare()">
        <input v-model="nuovo" type="text" placeholder="Cosa comprare?" aria-label="Cosa comprare">
        <button class="btn" :disabled="!nuovo.trim()">Aggiungi</button>
      </form>
      <Vuoto v-if="!daComprare.length" testo="Lista vuota." />
      <TransitionGroup name="list" tag="ul" class="list">
        <li v-for="d in daComprare" :key="d.id" class="card row" :class="{ off: fatto(d) }">
          <label class="check grow"><input type="checkbox" :checked="fatto(d)" @change="spunta(d)">
            <span :class="{ barrato: fatto(d) }">{{ d.descrizione }}<small v-if="d.quantita" class="muted"> &times; {{ d.quantita }}</small><small v-if="d.negozio" class="muted"> &middot; {{ d.negozio }}</small></span>
          </label>
          <button class="icon-btn" aria-label="Togli" @click="togliFiglio('dacomprare', d.id)"><Icona nome="cestino" :size="18" /></button>
        </li>
      </TransitionGroup>
    </template>

    <Sheet :open="pf.aperto" :titolo="pf.id ? pf.nome : 'Nuovo prodotto'" @close="pf.aperto = false">
      <label class="field"><span>Nome</span><input v-model="pf.nome" type="text" required></label>
      <div class="grid2">
        <label class="field"><span>Prezzo &euro;</span><input v-model="pf.prezzo" type="text" inputmode="decimal" placeholder="da definire"></label>
        <label class="field"><span>Minuti per farlo</span><input v-model="pf.tempo_min" type="text" inputmode="numeric"></label>
      </div>
      <label class="field"><span>Descrizione (per il catalogo)</span><textarea v-model="pf.descrizione" rows="2"></textarea></label>
      <label class="check"><input v-model="pf.pubblico" type="checkbox"> Mostra nel catalogo pubblico</label>
      <label class="check"><input v-model="pf.attivo" type="checkbox"> Attivo (si pu&ograve; ordinare)</label>
      <button class="btn full" :disabled="occupato || !pf.nome.trim()" @click="salvaProdotto">Salva</button>
      <template v-if="pf.id">
        <div class="box">
          <div class="head-row"><strong>Foto</strong>
            <label class="btn ghost file"><Icona nome="foto" :size="18" /> {{ fotoAttuale ? 'Cambia' : 'Aggiungi' }}<input type="file" accept="image/*" @change="fotoProdotto"></label>
          </div>
          <img v-if="fotoAttuale" :src="fotoUrl(fotoAttuale, 400)" alt="" class="foto-prod">
        </div>
        <div class="box">
          <strong>Varianti</strong>
          <div v-for="v in varianti" :key="v.id" class="head-row"><span>{{ v.gruppo ? v.gruppo + ': ' : '' }}{{ v.nome }}<small v-if="v.sovrapprezzo" class="muted"> +{{ euro(v.sovrapprezzo) }}</small></span>
            <button class="icon-btn" aria-label="Togli variante" @click="togliFiglio('variante', v.id)"><Icona nome="cestino" :size="18" /></button></div>
          <div class="grid3">
            <input v-model="nv.gruppo" type="text" placeholder="Gruppo" aria-label="Gruppo">
            <input v-model="nv.nome" type="text" placeholder="Es. Verde" aria-label="Nome variante">
            <input v-model="nv.sovrapprezzo" type="text" inputmode="decimal" placeholder="+ &euro;" aria-label="Sovrapprezzo">
          </div>
          <button class="btn ghost" :disabled="!nv.nome.trim()" @click="aggiungiVariante">Aggiungi variante</button>
        </div>
        <div class="box">
          <strong>Materiali per un pezzo</strong>
          <div v-for="x in materialiP" :key="x.id" class="head-row"><span>{{ x.quantita }} &times; {{ db.Materiali.find((m) => m.id === x.materiale_id)?.nome }}</span>
            <button class="icon-btn" aria-label="Togli materiale" @click="togliFiglio('prodmat', x.id)"><Icona nome="cestino" :size="18" /></button></div>
          <div class="grid2">
            <select v-model="nm.materiale_id" aria-label="Materiale"><option value="">Scegli materiale</option><option v-for="m in db.Materiali" :key="m.id" :value="m.id">{{ m.nome }}</option></select>
            <input v-model="nm.quantita" type="text" inputmode="decimal" aria-label="Quantit&agrave;">
          </div>
          <button class="btn ghost" :disabled="!nm.materiale_id" @click="aggiungiMateriale">Aggiungi materiale</button>
          <div v-if="margine" class="tot"><span>Costo {{ euro(margine.costo) }}{{ margine.completo ? '' : ' (incompleto)' }}</span><strong>Margine {{ margine.margine == null ? '\u2014' : euro(margine.margine) }}</strong></div>
        </div>
        <button v-if="titolare" class="btn ghost danger full" @click="eliminaProdotto">Elimina prodotto</button>
      </template>
    </Sheet>

    <Sheet :open="mf.aperto" :titolo="mf.id ? mf.nome : 'Nuovo materiale'" @close="mf.aperto = false">
      <label class="field"><span>Nome</span><input v-model="mf.nome" type="text" required></label>
      <div class="grid2">
        <label class="field"><span>Costo per unit&agrave; &euro;</span><input v-model="mf.costo_unitario" type="text" inputmode="decimal"></label>
        <label class="field"><span>Unit&agrave;</span><input v-model="mf.unita" type="text" placeholder="pz, m, ml"></label>
        <label class="field"><span>Scorta attuale</span><input v-model="mf.scorta" type="text" inputmode="decimal"></label>
        <label class="field"><span>Soglia minima</span><input v-model="mf.soglia_minima" type="text" inputmode="decimal"></label>
      </div>
      <small class="muted">Quando registri una spesa collegata a questo materiale, la scorta aumenta da sola.</small>
      <label class="check"><input v-model="mf.attivo" type="checkbox"> Attivo</label>
      <button class="btn full" :disabled="occupato || !mf.nome.trim()" @click="salvaMateriale">Salva</button>
      <button v-if="mf.id && titolare" class="btn ghost danger full" @click="eliminaMateriale">Elimina materiale</button>
    </Sheet>
  </section>
</template>