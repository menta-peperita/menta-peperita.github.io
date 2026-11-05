// Test della logica pura di Code.gs: node --test apps-script/test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const ctx = vm.createContext({})
vm.runInContext(readFileSync(new URL('../Code.gs', import.meta.url), 'utf8'), ctx)
const plain = (o) => JSON.parse(JSON.stringify(o))

const me = { id: 'u1', nome: 'Gio', email: 'gio@x.it', ruolo: 'Titolare' }
const utenti = [
  { id: 'u1', nome: 'Gio', email: 'gio@x.it', ruolo: 'Titolare', attivo: true },
  { id: 'u2', nome: 'Marti', email: 'Marti@x.it', ruolo: 'Titolare', attivo: 'TRUE' }
]
const v = (input) => plain(ctx.validateUtente(input, utenti, me))

test('nuovo utente valido', () => {
  assert.deepEqual(v({ nome: 'Patty', email: ' Patty@X.it ', ruolo: 'Aiuto', attivo: true }), {})
})
test('nome duplicato, anche con maiuscole diverse', () => {
  assert.ok(v({ nome: ' marti ', email: 'm2@x.it', ruolo: 'Titolare' }).nome)
})
test('email duplicata, anche con maiuscole diverse', () => {
  assert.ok(v({ nome: 'Nuova', email: 'MARTI@x.it', ruolo: 'Titolare' }).email)
})
test('email non valida e nome vuoto', () => {
  const e = v({ nome: '  ', email: 'non-una-email', ruolo: 'Titolare' })
  assert.ok(e.nome && e.email)
})
test('ruolo non valido', () => {
  assert.ok(v({ nome: 'X', email: 'x@x.it', ruolo: 'Capo' }).ruolo)
})
test('modificare se stessa non conta come duplicato', () => {
  assert.deepEqual(v({ id: 'u1', nome: 'Giorgia', email: 'gio@x.it', ruolo: 'Titolare', attivo: true }), {})
})
test('non si puo disattivare se stessa ne togliersi il ruolo', () => {
  const e = v({ id: 'u1', nome: 'Gio', email: 'gio@x.it', ruolo: 'Aiuto', attivo: false })
  assert.ok(e.attivo && e.ruolo)
})
test('si puo disattivare un altro utente', () => {
  assert.deepEqual(v({ id: 'u2', nome: 'Marti', email: 'marti@x.it', ruolo: 'Titolare', attivo: false }), {})
})
test('descrizione modifiche', () => {
  const d = ctx.describeChanges({ nome: 'Giu', email: 'a@x.it', attivo: true }, { nome: 'Giulia', email: 'a@x.it', attivo: false }, ['nome', 'email', 'attivo'])
  assert.equal(d, 'nome: Giu \u2192 Giulia, attivo: s\u00ec \u2192 no')
})
test('nessuna modifica = stringa vuota', () => {
  assert.equal(ctx.describeChanges({ nome: 'A', attivo: true }, { nome: 'A', attivo: 'TRUE' }, ['nome']), '')
})
test('id progressivi', () => {
  assert.equal(ctx.maxSuffix('u', [{ id: 'u1' }, { id: 'u10' }, { id: 'x99' }, { id: 'u2' }, {}]), 10)
  assert.equal(ctx.maxSuffix('u', []), 0)
})
test('valori booleani dal foglio', () => {
  assert.ok(ctx.isTrue(true) && ctx.isTrue('TRUE') && ctx.isTrue('true'))
  assert.ok(!ctx.isTrue(false) && !ctx.isTrue('FALSE') && !ctx.isTrue(''))
})
test('utente pubblico normalizza email e attivo', () => {
  assert.deepEqual(plain(ctx.publicUser({ id: 'u2', nome: 'M', email: ' M@X.it', ruolo: 'Socia', attivo: 'TRUE', _row: 3 })),
    { id: 'u2', nome: 'M', email: 'm@x.it', ruolo: 'Titolare', attivo: true })
})
test('utente senza dati collegati si puo eliminare', () => {
  const tables = {
    Utenti: [{ id: 'u1', creato_da: 'setup' }, { id: 'u3', creato_da: 'u1' }],
    Attivita: [{ id: 'a1', utente_id: 'u1', entita_id: 'u3' }]
  }
  assert.equal(ctx.countUserRefs('u3', tables), 0)
})
test('utente con dati collegati non si elimina', () => {
  const tables = {
    Utenti: [{ id: 'u1' }, { id: 'u2', creato_da: 'u1' }, { id: 'u4', creato_da: 'u2' }],
    Attivita: [{ utente_id: 'u2' }, { utente_id: 'u2' }],
    Ordini: [{ assegnato_a: 'u2', creato_da: 'u1' }],
    Spese: [{ pagato_da: 'u2' }]
  }
  assert.equal(ctx.countUserRefs('u2', tables), 5)
})
test('coerce: tipi, obbligatori, modifica parziale', () => {
  const campi = { nome: 'testo!', prezzo: 'num', attivo: 'bool', data: 'data' }
  let r = plain(ctx.coerce(campi, { nome: ' Tovaglietta ', prezzo: '8,5', attivo: 'TRUE', data: '2026-11-05' }, true))
  assert.deepEqual(r, { obj: { nome: 'Tovaglietta', prezzo: 8.5, attivo: true, data: '2026-11-05' }, errors: {} })
  r = plain(ctx.coerce(campi, { nome: '', prezzo: 'abc', data: '5/11' }, true))
  assert.ok(r.errors.nome && r.errors.prezzo && r.errors.data)
  r = plain(ctx.coerce(campi, { prezzo: '' }, false))
  assert.deepEqual(r.obj, { prezzo: '' })
})
test('numero ordine', () => {
  assert.equal(ctx.numeroOrdine(1), 'MP-001')
  assert.equal(ctx.numeroOrdine(42), 'MP-042')
  assert.equal(ctx.numeroOrdine(1234), 'MP-1234')
  assert.equal(ctx.maxSuffix('MP-', [{ numero: 'MP-007' }, { numero: 'MP-012' }], 'numero'), 12)
})
test('righe ordine', () => {
  assert.ok(ctx.validateRighe([]))
  assert.ok(ctx.validateRighe([{ prodotto_id: '', descrizione: '', quantita: 1 }]))
  assert.ok(ctx.validateRighe([{ prodotto_id: 'p1', quantita: 0 }]))
  assert.ok(ctx.validateRighe([{ prodotto_id: 'p1', quantita: 1, prezzo_unitario: 'x' }]))
  assert.equal(ctx.validateRighe([{ prodotto_id: 'p1', quantita: 2, prezzo_unitario: '' }, { descrizione: 'Altro', quantita: 1, prezzo_unitario: 5 }]), '')
})
test('riferimenti a un elemento', () => {
  assert.equal(ctx.countRefs('prodotto_id', 'p1', { RigheOrdine: [{ prodotto_id: 'p1' }, { prodotto_id: 'p2' }, { prodotto_id: 'p1' }] }), 2)
})
