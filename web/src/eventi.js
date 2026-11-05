import { db } from './store'
import { r2, num } from './logic/calcoli'

export const CHECKLIST_DEFAULT = ['Tovaglia ed espositori', 'Fondo cassa in contanti', 'QR Satispay stampato', 'Biglietti con Instagram', 'Catalogo stampato', 'Sacchetti']

export function checklistDi(e) {
  try { const v = JSON.parse(e.checklist || '[]'); if (Array.isArray(v)) return v } catch {}
  return []
}

export function checklistNuova() {
  let base = CHECKLIST_DEFAULT
  try { const v = JSON.parse(db.Impostazioni.checklist_mercatino || 'null'); if (Array.isArray(v) && v.length) base = v } catch {}
  return JSON.stringify(base.map((t) => ({ t, ok: false })))
}

export function riepilogoEvento(id) {
  const ordini = db.Ordini.filter((o) => o.evento_id === id && o.stato !== 'annullato')
  const ids = new Set(ordini.map((o) => o.id))
  const incassi = r2(db.Movimenti.filter((m) => m.tipo === 'INCASSO' && (m.evento_id === id || ids.has(m.ordine_id))).reduce((t, m) => t + Number(m.importo || 0), 0))
  const spese = r2(db.Spese.filter((s) => s.evento_id === id).reduce((t, s) => t + (num(s.costo) || 0), 0))
  const pezzi = db.RigheOrdine.filter((r) => ids.has(r.ordine_id)).reduce((t, r) => t + Number(r.quantita || 0), 0)
  return { vendite: ordini.length, pezzi, incassi, spese, risultato: r2(incassi - spese) }
}
