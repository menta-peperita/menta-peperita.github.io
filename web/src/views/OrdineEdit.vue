<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db, pronto, azione } from '../store'
import { me } from '../session'
import { costoProdotto, totaleRighe, euro, oggi, num } from '../logic/calcoli'
import { CANALI } from '../stati'
import { notify } from '../toast'
import Seg from '../components/Seg.vue'
import Icona from '../components/Icona.vue'

const route = useRoute()
const router = useRouter()
const id = route.params.id || ''
const da = route.query.da || ''
const form = reactive({ id, data: oggi(), canale: 'Passaparola', stato: 'lavorazione', consegna_entro: '', assegnato_a: '', note: '', evento_id: '' })
const cliente = reactive({ id: '', nome: '', instagram: '', telefono: '' })
const righe = ref([])
const salvando = ref(false)
const errore = ref('')
const pronti = ref(false)

const prodottiAttivi = computed(() => db.Prodotti.filter((p) => p.attivo === true || p.attivo === 'TRUE'))
const variantiDi = (pid) => db.Varianti.filter((v) => v.prodotto_id === pid && v.attivo !== false)
const utentiAttivi = computed(() => db.Utenti.filter((u) => u.attivo))
const tot = computed(() => totaleRighe(righe.value))

function nuovaRiga() {
  const p = prodottiAttivi.value[0]
  return { prodotto_id: p?.id || '', variante_id: '', descrizione: '', quantita: 1, prezzo_unitario: p ? (num(p.prezzo) ?? '') : '', costo_unitario: p ? costoProdotto(p.id, db).costo : '' }
}

function aggiornaPrezzo(r) {
  const p = db.Prodotti.find((x) => x.id === r.prodotto_id)
  const v = db.Varianti.find((x) => x.id === r.variante_id)
  const base = num(p?.prezzo)
  r.prezzo_unitario = base == null ? '' : base + (num(v?.sovrapprezzo) || 0)
  r.costo_unitario = p ? costoProdotto(p.id, db).costo : ''
}

function cambiaProdotto(r) { r.variante_id = ''; if (r.prodotto_id) r.descrizione = ''; aggiornaPrezzo(r) }

function scegliCliente() {
  const c = db.Clienti.find((x) => x.nome.trim().toLowerCase() === cliente.nome.trim().toLowerCase())
  if (c) Object.assign(cliente, { id: c.id, nome: c.nome, instagram: c.instagram || '', telefono: c.telefono || '' })
  else cliente.id = ''
}

function inizializza() {
  if (pronti.value || !pronto.value) return
  const srcId = id || da
  const src = srcId && db.Ordini.find((o) => o.id === srcId)
  if (src) {
    if (id) Object.assign(form, { data: src.data, canale: src.canale, stato: src.stato, consegna_entro: src.consegna_entro || '', assegnato_a: src.assegnato_a || '', note: src.note || '', evento_id: src.evento_id || '' })
    else Object.assign(form, { canale: src.canale, note: src.note || '' })
    const c = db.Clienti.find((x) => x.id === src.cliente_id)
    if (c) Object.assign(cliente, { id: c.id, nome: c.nome, instagram: c.instagram || '', telefono: c.telefono || '' })
    righe.value = db.RigheOrdine.filter((r) => r.ordine_id === srcId).map((r) => ({ prodotto_id: r.prodotto_id, variante_id: r.variante_id || '', descrizione: r.descrizione || '', quantita: r.quantita, prezzo_unitario: r.prezzo_unitario, costo_unitario: r.costo_unitario }))
  }
  if (!righe.value.length) righe.value = [nuovaRiga()]
  if (!id && !form.assegnato_a) form.assegnato_a = ''
  pronti.value = true
}
watch(pronto, inizializza, { immediate: true })

async function salva() {
  errore.value = ''
  salvando.value = true
  try {
    const r = await azione('ordine.salva', { ordine: { ...form }, righe: righe.value, cliente: { ...cliente } })
    notify(id ? 'Ordine aggiornato' : 'Ordine salvato')
    router.replace('/ordini/' + r.id)
  } catch (e) { errore.value = e.message; notify(e.message, 'err') } finally { salvando.value = false }
}
</script>

<template>
  <section>
    <div class="head-row">
      <button class="icon-btn" aria-label="Indietro" @click="router.back()"><Icona nome="indietro" /></button>
      <h1 class="title grow">{{ id ? 'Modifica ordine' : 'Nuovo ordine' }}</h1>
    </div>
    <div v-if="!pronti" class="col"><div v-for="i in 3" :key="i" class="skeleton" style="height: 80px"></div></div>
    <form v-else class="form stagger" @submit.prevent="salva">
      <div class="card">
        <label class="field">
          <span>Cliente</span>
          <input v-model="cliente.nome" list="clienti" type="text" autocomplete="off" placeholder="Nome e cognome" @change="scegliCliente">
          <datalist id="clienti"><option v-for="c in db.Clienti" :key="c.id" :value="c.nome" /></datalist>
          <small v-if="cliente.id" class="muted">Cliente gi&agrave; registrato: i contatti si aggiornano.</small>
        </label>
        <div class="grid2">
          <label class="field"><span>Instagram</span><input v-model="cliente.instagram" type="text" autocapitalize="none" placeholder="@profilo"></label>
          <label class="field"><span>Telefono</span><input v-model="cliente.telefono" type="tel" inputmode="tel" placeholder="333 1234567"></label>
        </div>
        <fieldset class="field"><legend>Da dove arriva</legend>
          <Seg v-model="form.canale" :opzioni="CANALI.map((c) => ({ value: c, label: c }))" wrap />
        </fieldset>
      </div>

      <div class="card">
        <h2 class="h2">Prodotti</h2>
        <TransitionGroup name="list" tag="div" class="col">
          <div v-for="(r, i) in righe" :key="i" class="riga">
            <div class="grid2">
              <label class="field"><span>Prodotto</span>
                <select v-model="r.prodotto_id" @change="cambiaProdotto(r)">
                  <option v-for="p in prodottiAttivi" :key="p.id" :value="p.id">{{ p.nome }}</option>
                  <option value="">Altro (scrivi tu)</option>
                </select>
              </label>
              <label v-if="r.prodotto_id && variantiDi(r.prodotto_id).length" class="field"><span>Variante</span>
                <select v-model="r.variante_id" @change="aggiornaPrezzo(r)">
                  <option value="">&mdash;</option>
                  <option v-for="v in variantiDi(r.prodotto_id)" :key="v.id" :value="v.id">{{ v.nome }}{{ v.sovrapprezzo ? ' (+' + euro(v.sovrapprezzo) + ')' : '' }}</option>
                </select>
              </label>
              <label v-if="!r.prodotto_id" class="field"><span>Descrizione</span><input v-model="r.descrizione" type="text"></label>
            </div>
            <div class="grid3">
              <label class="field"><span>Quantit&agrave;</span><input v-model.number="r.quantita" type="number" min="1" inputmode="numeric"></label>
              <label class="field"><span>Prezzo cad. &euro;</span><input v-model="r.prezzo_unitario" type="text" inputmode="decimal" placeholder="da definire"></label>
              <button v-if="righe.length > 1" type="button" class="icon-btn self-end" aria-label="Togli riga" @click="righe.splice(i, 1)"><Icona nome="cestino" /></button>
            </div>
          </div>
        </TransitionGroup>
        <button type="button" class="btn ghost" @click="righe.push(nuovaRiga())"><Icona nome="piu" :size="18" /> Aggiungi prodotto</button>
        <div class="tot"><span>Totale</span><strong>{{ tot.definito || tot.totale ? euro(tot.totale) : 'Da definire' }}</strong></div>
      </div>

      <div class="card">
        <div class="grid2">
          <label class="field"><span>Data ordine</span><input v-model="form.data" type="date" required></label>
          <label class="field"><span>Consegna entro</span><input v-model="form.consegna_entro" type="date"></label>
        </div>
        <label class="field"><span>Chi lo realizza</span>
          <select v-model="form.assegnato_a">
            <option value="">Da decidere</option>
            <option v-for="u in utentiAttivi" :key="u.id" :value="u.id">{{ u.nome }}{{ u.id === me.id ? ' (tu)' : '' }}</option>
          </select>
        </label>
        <label class="field"><span>Note e personalizzazione</span><textarea v-model="form.note" rows="3" placeholder="Frase, colore, nome&hellip;"></textarea></label>
      </div>
      <p v-if="errore" class="error shake">{{ errore }}</p>
      <button class="btn full" :disabled="salvando">{{ salvando ? 'Salvataggio\u2026' : 'Salva ordine' }}</button>
    </form>
  </section>
</template>
