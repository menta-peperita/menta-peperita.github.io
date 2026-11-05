import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as c from './calcoli.js'

const base = () => ({
  Prodotti: [{ id: 'p1', nome: 'Tovaglietta', prezzo: 8 }, { id: 'p2', nome: 'Quadretto', prezzo: 10 }],
  Materiali: [{ id: 'm1', costo_unitario: 0.4 }, { id: 'm2', costo_unitario: '' }],
  ProdottiMateriali: [{ prodotto_id: 'p1', materiale_id: 'm1', quantita: 1 }, { prodotto_id: 'p2', materiale_id: 'm1', quantita: 2 }, { prodotto_id: 'p2', materiale_id: 'm2', quantita: 1 }],
  Ordini: [
    { id: 'o1', data: '2026-11-02', stato: 'lavorazione', canale: 'Passaparola' },
    { id: 'o2', data: '2026-11-02', stato: 'consegnato', canale: 'Mercatino' },
    { id: 'o3', data: '2026-10-20', stato: 'lavorazione', canale: 'Instagram' },
    { id: 'o4', data: '2026-11-03', stato: 'annullato', canale: 'Instagram' }
  ],
  RigheOrdine: [
    { ordine_id: 'o1', prodotto_id: 'p1', quantita: 5, prezzo_unitario: 7, costo_unitario: 0.4 },
    { ordine_id: 'o2', prodotto_id: 'p2', quantita: 1, prezzo_unitario: 10 },
    { ordine_id: 'o3', prodotto_id: 'p1', quantita: 34, prezzo_unitario: '' },
    { ordine_id: 'o4', prodotto_id: 'p1', quantita: 1, prezzo_unitario: 8 }
  ],
  Movimenti: [
    { tipo: 'INCASSO', importo: 20, utente_id: 'u2', ordine_id: 'o1', data: '2026-11-02' },
    { tipo: 'INCASSO', importo: 10, utente_id: 'cassa', ordine_id: 'o2', data: '2026-11-02' },
    { tipo: 'VERSAMENTO', importo: 15, utente_id: 'u2', data: '2026-11-03' },
    { tipo: 'RIMBORSO', importo: 8, utente_id: 'u2', data: '2026-11-01' }
  ],
  Spese: [
    { costo: 10, pagato_da: 'cassa', data: '2026-10-31' },
    { costo: 35, pagato_da: 'u1', data: '2026-10-31' },
    { costo: 8, pagato_da: 'u2', data: '2026-11-01' }
  ]
})

test('costo e margine prodotto', () => {
  const db = base()
  assert.deepEqual(c.margineProdotto(db.Prodotti[0], db), { prezzo: 8, costo: 0.4, completo: true, margine: 7.6 })
  const q = c.margineProdotto(db.Prodotti[1], db)
  assert.equal(q.costo, 0.8)
  assert.equal(q.completo, false)
})
test('riepilogo ordine: acconto, pagato, da definire', () => {
  const db = base()
  assert.deepEqual({ ...c.riepilogoOrdine(db.Ordini[0], db), righe: 0 }, { righe: 0, totale: 35, definito: true, incassato: 20, residuo: 15, pagamento: 'acconto' })
  assert.equal(c.riepilogoOrdine(db.Ordini[1], db).pagamento, 'pagato')
  assert.equal(c.riepilogoOrdine(db.Ordini[2], db).pagamento, 'da_definire')
})
test('cassa e conti per persona', () => {
  const r = c.calcolaCassa(base())
  assert.equal(r.cassa, 7) // +10 incasso diretto +15 versamento -8 rimborso -10 spesa cassa
  assert.deepEqual(r.persone.find((p) => p.id === 'u2'), { id: 'u2', inMano: 5, credito: 0 })
  assert.deepEqual(r.persone.find((p) => p.id === 'u1'), { id: 'u1', inMano: 0, credito: 35 })
})
test('fabbisogno materiale per ordini in lavorazione', () => {
  assert.equal(c.fabbisogno('m1', base()), 39) // o1 5 + o3 34 (o2 consegnato, o4 annullato esclusi)
})
test('statistiche di periodo escludono gli annullati', () => {
  const s = c.statistiche(base(), '2026-11-01', '2026-11-30')
  assert.equal(s.ordini, 2)
  assert.equal(s.venduto, 45)
  assert.equal(s.incassato, 30)
  assert.equal(s.spese, 8)
  assert.equal(s.utile, 22)
  assert.equal(s.daIncassare, 15)
  assert.deepEqual(s.pezzi[0], { nome: 'Tovaglietta', n: 5 })
})
test('divisione utili con centesimi', () => {
  assert.deepEqual(c.divisioneUtili(100, { a: 1, b: 1, c: 1 }), [{ id: 'a', importo: 33.34 }, { id: 'b', importo: 33.33 }, { id: 'c', importo: 33.33 }])
  assert.deepEqual(c.divisioneUtili(-5, { a: 1 }), [{ id: 'a', importo: 0 }])
})
test('telefono per WhatsApp', () => {
  assert.equal(c.telefonoWa('333 123 4567'), '393331234567')
  assert.equal(c.telefonoWa('+39 333-1234567'), '393331234567')
  assert.equal(c.telefonoWa('0041791234567'), '41791234567')
})
test('testo messaggio', () => {
  const t = c.testoMessaggio('pronto', { nome: 'Bea', numero: 'MP-002', prodotti: '5 Tovaglietta', residuo_frase: '' })
  assert.equal(t, 'Ciao Bea! Il tuo ordine MP-002 \u00e8 pronto: 5 Tovaglietta.')
})
test('costi per prodotto con tempo e costo orario', () => {
  const db = base()
  db.Prodotti[0].tempo_min = 30
  const r = c.costiProdotti(db, '2026-11-01', '2026-11-30', 10)
  const t = r.find((x) => x.id === 'p1')
  assert.equal(t.margine, 7.6)
  assert.equal(t.marginePerc, 95)
  assert.equal(t.guadagnoOra, 15.2)
  assert.equal(t.costoPieno, 5.4)
  assert.equal(t.sottoCosto, false)
  assert.equal(t.venduti, 5) // o1; o3 fuori periodo, o4 annullato
  assert.equal(t.margineTotale, 33) // (7 - 0.4) * 5
  db.Prodotti[0].prezzo = 5
  assert.equal(c.costiProdotti(db, '', '', 10).find((x) => x.id === 'p1').sottoCosto, true)
})
test('tempo misurato: solo ordini con un unico prodotto', () => {
  const db = base()
  db.Ordini[0].tempo_min = 60 // o1: 5 tovaglie -> 12 min
  db.Ordini[2].tempo_min = 340 // o3: 34 tovaglie -> 10 min
  db.Ordini[1].tempo_min = 999 // o2: quadretto, non conta per p1
  db.RigheOrdine.push({ ordine_id: 'o5', prodotto_id: 'p1', quantita: 1 }, { ordine_id: 'o5', prodotto_id: 'p2', quantita: 1 })
  db.Ordini.push({ id: 'o5', stato: 'pronto', tempo_min: 500 }) // misto: escluso
  assert.deepEqual(c.tempoMisurato('p1', db), { perPezzo: 10.26, ordini: 2 })
  const t = c.costiProdotti(db, '', '', null).find((x) => x.id === 'p1')
  assert.equal(t.fonteTempo, 'misurato')
  assert.equal(t.minuti, 10.26)
})
