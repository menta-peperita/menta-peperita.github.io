// Calcoli puri (nessun Vue, nessuna rete): testati con node --test.
export const r2 = (n) => Math.round(Number(n) * 100) / 100
export const num = (v) => (v === '' || v == null || isNaN(Number(v)) ? null : Number(v))
export const euro = (n) => (n == null ? '\u2014' : '\u20ac ' + Number(n).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 2 }))
export const oggi = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
export const fmtData = (d) => (d ? String(d).slice(8, 10) + '/' + String(d).slice(5, 7) : '')

export function costoProdotto(pid, db) {
  const righe = db.ProdottiMateriali.filter((pm) => pm.prodotto_id === pid)
  let costo = 0
  let completo = righe.length > 0
  for (const pm of righe) {
    const c = num(db.Materiali.find((m) => m.id === pm.materiale_id)?.costo_unitario)
    if (c == null) completo = false
    else costo += c * Number(pm.quantita || 0)
  }
  return { costo: r2(costo), completo }
}

export function margineProdotto(p, db) {
  const prezzo = num(p.prezzo)
  const { costo, completo } = costoProdotto(p.id, db)
  return { prezzo, costo, completo, margine: prezzo == null ? null : r2(prezzo - costo) }
}

export const righeDi = (oid, db) => db.RigheOrdine.filter((r) => r.ordine_id === oid)

export function totaleRighe(righe) {
  let totale = 0
  let definito = true
  for (const r of righe) {
    const p = num(r.prezzo_unitario)
    if (p == null) definito = false
    else totale += p * Number(r.quantita || 0)
  }
  return { totale: r2(totale), definito }
}

export function riepilogoOrdine(o, db) {
  const righe = righeDi(o.id, db)
  const { totale, definito } = totaleRighe(righe)
  const incassato = r2(db.Movimenti.filter((m) => m.ordine_id === o.id && m.tipo === 'INCASSO').reduce((s, m) => s + Number(m.importo || 0), 0))
  const residuo = Math.max(0, r2(totale - incassato))
  let pagamento
  if (!definito && totale === 0) pagamento = incassato > 0 ? 'acconto' : 'da_definire'
  else if (residuo <= 0.009) pagamento = 'pagato'
  else if (incassato > 0) pagamento = 'acconto'
  else pagamento = 'da_incassare'
  return { righe, totale, definito, incassato, residuo, pagamento }
}

/** Cassa comune e conti per persona. utente_id 'cassa' = soldi entrati direttamente in cassa. */
export function calcolaCassa(db) {
  const persone = {}
  const P = (id) => (persone[id] ||= { id, inMano: 0, credito: 0 })
  let cassa = 0
  for (const m of db.Movimenti) {
    const imp = Number(m.importo || 0)
    if (m.tipo === 'INCASSO') { if (m.utente_id === 'cassa') cassa += imp; else P(m.utente_id).inMano += imp }
    else if (m.tipo === 'VERSAMENTO') { cassa += imp; P(m.utente_id).inMano -= imp }
    else if (m.tipo === 'RIMBORSO') { cassa -= imp; P(m.utente_id).credito -= imp }
    else if (m.tipo === 'PRELIEVO') cassa -= imp
  }
  for (const s of db.Spese) {
    const c = Number(s.costo || 0)
    if (s.pagato_da === 'cassa') cassa -= c
    else if (s.pagato_da) P(s.pagato_da).credito += c
  }
  return {
    cassa: r2(cassa),
    persone: Object.values(persone).map((p) => ({ ...p, inMano: r2(p.inMano), credito: r2(p.credito) })).filter((p) => p.inMano || p.credito)
  }
}

/** Quanto materiale serve per gli ordini non ancora pronti. */
export function fabbisogno(materialeId, db) {
  const aperti = new Set(db.Ordini.filter((o) => o.stato === 'lavorazione').map((o) => o.id))
  let tot = 0
  for (const r of db.RigheOrdine) {
    if (!aperti.has(r.ordine_id)) continue
    const pm = db.ProdottiMateriali.find((x) => x.prodotto_id === r.prodotto_id && x.materiale_id === materialeId)
    if (pm) tot += Number(pm.quantita || 0) * Number(r.quantita || 0)
  }
  return r2(tot)
}

export function statistiche(db, da, a) {
  const inP = (d) => (!da || d >= da) && (!a || d <= a)
  const ordini = db.Ordini.filter((o) => o.stato !== 'annullato' && inP(o.data))
  const pezzi = {}
  const canali = {}
  let venduto = 0
  let costiMateriali = 0
  for (const o of ordini) {
    const c = o.canale || 'Altro'
    canali[c] = (canali[c] || 0) + 1
    for (const r of righeDi(o.id, db)) {
      const nome = db.Prodotti.find((p) => p.id === r.prodotto_id)?.nome || r.descrizione || 'Altro'
      const q = Number(r.quantita || 0)
      pezzi[nome] = (pezzi[nome] || 0) + q
      venduto += (num(r.prezzo_unitario) || 0) * q
      costiMateriali += (num(r.costo_unitario) || 0) * q
    }
  }
  const incassato = db.Movimenti.filter((m) => m.tipo === 'INCASSO' && inP(m.data)).reduce((s, m) => s + Number(m.importo || 0), 0)
  const spese = db.Spese.filter((s) => inP(s.data)).reduce((t, s) => t + Number(s.costo || 0), 0)
  const daIncassare = db.Ordini.filter((o) => o.stato !== 'annullato').reduce((t, o) => t + riepilogoOrdine(o, db).residuo, 0)
  const ord = (o) => Object.entries(o).sort((x, y) => y[1] - x[1]).map(([nome, n]) => ({ nome, n }))
  return {
    ordini: ordini.length, venduto: r2(venduto), incassato: r2(incassato), spese: r2(spese),
    utile: r2(incassato - spese), daIncassare: r2(daIncassare), margineMateriali: r2(venduto - costiMateriali),
    pezzi: ord(pezzi), canali: ord(canali)
  }
}

/** quote: { idUtente: percentuale }. Arrotonda e assegna i centesimi residui al primo. */
export function divisioneUtili(utile, quote) {
  const ids = Object.keys(quote).filter((k) => Number(quote[k]) > 0)
  const totPerc = ids.reduce((s, k) => s + Number(quote[k]), 0)
  if (!ids.length || !totPerc || utile <= 0) return ids.map((id) => ({ id, importo: 0 }))
  const out = ids.map((id) => ({ id, importo: Math.floor((utile * Number(quote[id])) / totPerc * 100) / 100 }))
  out[0].importo = r2(out[0].importo + (utile - out.reduce((s, x) => s + x.importo, 0)))
  return out
}

export function telefonoWa(t) {
  let d = String(t || '').replace(/[^\d+]/g, '')
  if (d.startsWith('+')) d = d.slice(1)
  else if (d.startsWith('00')) d = d.slice(2)
  else if (/^3\d{8,9}$/.test(d)) d = '39' + d
  return d
}

export const MODELLI = {
  ricevuto: 'Ciao {nome}! Abbiamo ricevuto il tuo ordine {numero}: {prodotti}.{consegna_frase} Grazie!',
  pronto: 'Ciao {nome}! Il tuo ordine {numero} \u00e8 pronto: {prodotti}.{residuo_frase}',
  pagamento: 'Ciao {nome}! Ti ricordiamo il saldo di {residuo} per l\u2019ordine {numero}. Grazie mille!'
}

export function testoMessaggio(tipo, v, modelli = {}) {
  return (modelli[tipo] || MODELLI[tipo]).replace(/\{(\w+)\}/g, (_, k) => (v[k] == null ? '' : String(v[k])))
}
