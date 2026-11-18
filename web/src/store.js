// Archivio dati unico: un solo caricamento ("dati"), aggiornamenti locali dopo ogni salvataggio.
import { reactive, ref } from 'vue'
import { call } from './api'
import { notify } from './toast'

export const db = reactive({
  Prodotti: [], Varianti: [], Materiali: [], ProdottiMateriali: [], Clienti: [], Ordini: [], RigheOrdine: [],
  Movimenti: [], Spese: [], Eventi: [], Foto: [], DaComprare: [], Utenti: [], Impostazioni: {}
})
export const pronto = ref(false)
export const caricando = ref(false)

const TAB = {
  prodotto: 'Prodotti', variante: 'Varianti', materiale: 'Materiali', prodmat: 'ProdottiMateriali', cliente: 'Clienti',
  evento: 'Eventi', spesa: 'Spese', movimento: 'Movimenti', dacomprare: 'DaComprare'
}

// Copia locale: all'apertura l'app mostra subito gli ultimi dati e li aggiorna in sottofondo
const CACHE = 'mp_db'
function salvaCache() {
  try { localStorage.setItem(CACHE, JSON.stringify(db)) } catch {}
}
export function svuotaCache() {
  try { localStorage.removeItem(CACHE) } catch {}
}
function applica(dati) {
  Object.assign(db, dati)
  pronto.value = true
  salvaCache()
}

export async function carica() {
  if (!pronto.value) {
    try { const c = JSON.parse(localStorage.getItem(CACHE) || 'null'); if (c && c.Ordini) { Object.assign(db, c); pronto.value = true } } catch {}
  }
  caricando.value = true
  try { applica(await call('dati')) }
  catch (e) { notify(e.message, 'err') }
  finally { caricando.value = false }
}

export async function salva(entita, dati) {
  const o = await call('salva', { entita, dati })
  const arr = db[TAB[entita]]
  const i = arr.findIndex((x) => x.id === o.id)
  if (i >= 0) arr.splice(i, 1, o); else arr.push(o)
  salvaCache()
  if (entita === 'spesa' && dati.materiale_id) carica()
  return o
}

export async function elimina(entita, id) {
  await call('elimina', { entita, id })
  db[TAB[entita]] = db[TAB[entita]].filter((x) => x.id !== id)
  salvaCache()
}

/** Azioni composte (ordini, banco, rimborsi, foto): dopo l'esito ricarica tutto. */
export async function azione(nome, payload) {
  const r = await call(nome, payload, true, { conDati: true })
  applica(r.dati)
  return r.risultato
}

export const nomeUtente = (id) => (id === 'cassa' ? 'Cassa' : db.Utenti.find((u) => u.id === id)?.nome || id || '')
export const nomeProdotto = (id) => db.Prodotti.find((p) => p.id === id)?.nome || ''
export const fotoUrl = (driveId, w = 600) => (driveId ? 'https://drive.google.com/thumbnail?id=' + driveId + '&sz=w' + w : '')
