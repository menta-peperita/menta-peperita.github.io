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
