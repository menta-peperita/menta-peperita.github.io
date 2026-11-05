<script setup>
import { reactive, ref, watch, computed } from 'vue'
import { db, pronto } from '../store'
import { me } from '../session'
import { call } from '../api'
import { MODELLI } from '../logic/calcoli'
import { CHECKLIST_DEFAULT } from '../eventi'
import { copia } from '../media'
import { notify } from '../toast'
import Icona from '../components/Icona.vue'

const titolare = computed(() => me.value.ruolo === 'Titolare')
const f = reactive({ costo_orario: '', instagram: '', whatsapp: '', messaggio_ricevuto: '', messaggio_pronto: '', messaggio_pagamento: '', checklist: '' })
const salvando = ref(false)
const linkCatalogo = location.origin + '/catalogo'
watch(pronto, () => {
  const i = db.Impostazioni
  let cl = CHECKLIST_DEFAULT
  try { const v = JSON.parse(i.checklist_mercatino || 'null'); if (Array.isArray(v)) cl = v } catch {}
  Object.assign(f, { costo_orario: i.costo_orario || '', instagram: i.instagram || '', whatsapp: i.whatsapp || '', messaggio_ricevuto: i.messaggio_ricevuto || MODELLI.ricevuto, messaggio_pronto: i.messaggio_pronto || MODELLI.pronto, messaggio_pagamento: i.messaggio_pagamento || MODELLI.pagamento, checklist: cl.join('\n') })
}, { immediate: true })

async function salva() {
  salvando.value = true
  try {
    const valori = { ...f, checklist_mercatino: JSON.stringify(f.checklist.split('\n').map((x) => x.trim()).filter(Boolean)) }
    delete valori.checklist
    for (const [chiave, valore] of Object.entries(valori)) {
      if (String(db.Impostazioni[chiave] ?? '') === valore) continue
      await call('impostazioni.salva', { chiave, valore })
      db.Impostazioni[chiave] = valore
    }
    notify('Impostazioni salvate')
  } catch (e) { notify(e.message, 'err') } finally { salvando.value = false }
}
async function copiaLink() { notify((await copia(linkCatalogo)) ? 'Link copiato' : linkCatalogo) }
</script>

<template>
  <section>
    <h1 class="title">Impostazioni</h1>
    <p v-if="!titolare" class="muted hint">Solo i titolari possono modificare queste impostazioni.</p>
    <form class="form stagger" @submit.prevent="salva">
      <div class="card">
        <h2 class="h2">Costi</h2>
        <label class="field"><span>Costo orario del vostro lavoro &euro;/ora</span><input v-model="f.costo_orario" type="text" inputmode="decimal" placeholder="es. 10" :disabled="!titolare"></label>
        <small class="muted">Serve a calcolare il costo pieno dei prodotti (materiali + tempo) in Statistiche. Lascia vuoto se non vi interessa.</small>
      </div>
      <div class="card">
        <h2 class="h2">Catalogo pubblico</h2>
        <p class="muted">Una pagina con prodotti e prezzi da mandare a chi chiede &ldquo;cosa fate?&rdquo;. Mostra solo i prodotti con &ldquo;Mostra nel catalogo&rdquo;.</p>
        <div class="add-row"><input :value="linkCatalogo" readonly aria-label="Link catalogo"><button type="button" class="btn ghost" @click="copiaLink"><Icona nome="copia" :size="18" /></button></div>
        <div class="grid2">
          <label class="field"><span>Instagram</span><input v-model="f.instagram" type="text" placeholder="mentapeperita" :disabled="!titolare"></label>
          <label class="field"><span>WhatsApp</span><input v-model="f.whatsapp" type="tel" placeholder="333 1234567" :disabled="!titolare"></label>
        </div>
      </div>
      <div class="card">
        <h2 class="h2">Messaggi ai clienti</h2>
        <small class="muted">Parole sostituite in automatico: {nome} {numero} {prodotti} {residuo} {consegna_frase} {residuo_frase}</small>
        <label class="field"><span>Ordine ricevuto</span><textarea v-model="f.messaggio_ricevuto" rows="3" :disabled="!titolare"></textarea></label>
        <label class="field"><span>Ordine pronto</span><textarea v-model="f.messaggio_pronto" rows="3" :disabled="!titolare"></textarea></label>
        <label class="field"><span>Promemoria pagamento</span><textarea v-model="f.messaggio_pagamento" rows="3" :disabled="!titolare"></textarea></label>
      </div>
      <div class="card">
        <h2 class="h2">Lista &ldquo;cosa portare&rdquo; ai mercatini</h2>
        <label class="field"><span>Una voce per riga (vale per i nuovi mercatini)</span><textarea v-model="f.checklist" rows="6" :disabled="!titolare"></textarea></label>
      </div>
      <button v-if="titolare" class="btn full" :disabled="salvando">{{ salvando ? 'Salvataggio\u2026' : 'Salva' }}</button>
    </form>
  </section>
</template>
