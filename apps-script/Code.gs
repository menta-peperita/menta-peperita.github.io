/** Menta Peperita - API (Apps Script, collegato al Google Sheet). */
var VERSION = '1.0.0';
var TZ = 'Europe/Rome';
var RUOLI = ['Titolare', 'Aiuto'];
var STATI_ORDINE = ['lavorazione', 'pronto', 'consegnato', 'annullato'];
var TIPI_MOVIMENTO = ['INCASSO', 'VERSAMENTO', 'RIMBORSO', 'PRELIEVO'];
var DATE_COLS = ['data', 'consegna_entro'];

/** Schema: un foglio per tabella, riga 1 = intestazioni. setup() aggiunge solo cio' che manca. */
var SCHEMA = {
  Utenti: ['id', 'nome', 'email', 'ruolo', 'attivo', 'creato_il', 'creato_da', 'password_hash'],
  Sessioni: ['id', 'token_hash', 'utente_id', 'scade_il', 'dispositivo', 'creato_il'],
  Attivita: ['id', 'quando', 'utente_id', 'azione', 'entita', 'entita_id', 'dettaglio'],
  Contatori: ['nome', 'valore'],
  Impostazioni: ['chiave', 'valore'],
  Prodotti: ['id', 'nome', 'descrizione', 'prezzo', 'tempo_min', 'foto_id', 'pubblico', 'attivo', 'creato_il', 'creato_da'],
  Varianti: ['id', 'prodotto_id', 'gruppo', 'nome', 'sovrapprezzo', 'attivo'],
  Materiali: ['id', 'nome', 'unita', 'costo_unitario', 'scorta', 'soglia_minima', 'attivo'],
  ProdottiMateriali: ['id', 'prodotto_id', 'materiale_id', 'quantita'],
  Clienti: ['id', 'nome', 'instagram', 'telefono', 'note', 'creato_il', 'creato_da'],
  Ordini: ['id', 'numero', 'data', 'cliente_id', 'canale', 'stato', 'consegna_entro', 'assegnato_a', 'note', 'evento_id', 'consegnato_il', 'creato_il', 'creato_da'],
  RigheOrdine: ['id', 'ordine_id', 'prodotto_id', 'variante_id', 'descrizione', 'quantita', 'prezzo_unitario', 'costo_unitario'],
  Movimenti: ['id', 'data', 'tipo', 'importo', 'metodo', 'utente_id', 'ordine_id', 'spesa_id', 'evento_id', 'note', 'creato_il', 'creato_da'],
  Spese: ['id', 'data', 'descrizione', 'negozio', 'quantita', 'costo', 'pagato_da', 'stato_rimborso', 'evento_id', 'materiale_id', 'note', 'creato_il', 'creato_da'],
  Eventi: ['id', 'nome', 'luogo', 'data', 'checklist', 'note', 'creato_il', 'creato_da'],
  Foto: ['id', 'ordine_id', 'prodotto_id', 'drive_id', 'creato_il', 'creato_da'],
  DaComprare: ['id', 'descrizione', 'materiale_id', 'quantita', 'negozio', 'fatto', 'creato_il', 'creato_da']
};

/** Entita' salvabili con le azioni generiche. Tipi: testo, num, bool, data; "!" = obbligatorio. */
var ENTITA = {
  prodotto: { tab: 'Prodotti', pre: 'p', ref: 'prodotto_id', campi: { nome: 'testo!', descrizione: 'testo', prezzo: 'num', tempo_min: 'num', foto_id: 'testo', pubblico: 'bool', attivo: 'bool' }, def: { attivo: true, pubblico: true } },
  variante: { tab: 'Varianti', pre: 'v', ref: 'variante_id', campi: { prodotto_id: 'testo!', gruppo: 'testo', nome: 'testo!', sovrapprezzo: 'num', attivo: 'bool' }, def: { attivo: true } },
  materiale: { tab: 'Materiali', pre: 'm', ref: 'materiale_id', campi: { nome: 'testo!', unita: 'testo', costo_unitario: 'num', scorta: 'num', soglia_minima: 'num', attivo: 'bool' }, def: { attivo: true } },
  prodmat: { tab: 'ProdottiMateriali', pre: 'pm', campi: { prodotto_id: 'testo!', materiale_id: 'testo!', quantita: 'num!' } },
  cliente: { tab: 'Clienti', pre: 'c', ref: 'cliente_id', campi: { nome: 'testo!', instagram: 'testo', telefono: 'testo', note: 'testo' } },
  evento: { tab: 'Eventi', pre: 'e', ref: 'evento_id', campi: { nome: 'testo!', luogo: 'testo', data: 'data', checklist: 'testo', note: 'testo' } },
  spesa: { tab: 'Spese', pre: 's', ref: 'spesa_id', campi: { data: 'data!', descrizione: 'testo!', negozio: 'testo', quantita: 'num', costo: 'num!', pagato_da: 'testo!', stato_rimborso: 'testo', evento_id: 'testo', materiale_id: 'testo', note: 'testo' } },
  movimento: { tab: 'Movimenti', pre: 'mv', campi: { data: 'data!', tipo: 'testo!', importo: 'num!', metodo: 'testo', utente_id: 'testo!', ordine_id: 'testo', spesa_id: 'testo', evento_id: 'testo', note: 'testo' } },
  dacomprare: { tab: 'DaComprare', pre: 'dc', campi: { descrizione: 'testo!', materiale_id: 'testo', quantita: 'num', negozio: 'testo', fatto: 'bool' }, def: { fatto: false }, aiutoElimina: true }
};

// ================= Logica pura (testata con Node) =================

function normEmail(v) { return String(v == null ? '' : v).trim().toLowerCase(); }
function isTrue(v) { return v === true || String(v).toUpperCase() === 'TRUE'; }
function fmtVal(v) { return v === true ? 's\u00ec' : v === false ? 'no' : String(v == null ? '' : v); }
function round2(n) { return Math.round(Number(n) * 100) / 100; }

function maxSuffix(prefix, rows, field) {
  field = field || 'id';
  return rows.reduce(function (m, r) {
    var s = String(r[field] || '');
    if (s.indexOf(prefix) !== 0) return m;
    var n = parseInt(s.slice(prefix.length), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
}

function numeroOrdine(n) { return 'MP-' + (n < 1000 ? ('00' + n).slice(-3) : String(n)); }

/** Converte e valida i campi secondo la definizione. Restituisce { obj, errors }. */
function coerce(campi, input, isNew) {
  var obj = {}, errors = {};
  Object.keys(campi).forEach(function (k) {
    var tipo = campi[k].replace('!', ''), req = campi[k].indexOf('!') >= 0;
    var v = input[k];
    if (v === undefined && !isNew) return;
    if (tipo === 'bool') { if (v !== undefined) obj[k] = isTrue(v); return; }
    var s = v == null ? '' : String(v).trim();
    if (s === '') { if (req) errors[k] = 'Campo obbligatorio'; else obj[k] = ''; return; }
    if (tipo === 'num') {
      var n = Number(s.replace(',', '.'));
      if (isNaN(n)) errors[k] = 'Numero non valido'; else obj[k] = round2(n);
    } else if (tipo === 'data') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) errors[k] = 'Data non valida'; else obj[k] = s;
    } else obj[k] = s.slice(0, 1000);
  });
  return { obj: obj, errors: errors };
}

function validateUtente(input, utenti, me) {
  var e = {};
  var nome = String(input.nome || '').trim();
  var email = normEmail(input.email);
  var altri = utenti.filter(function (u) { return u.id !== input.id; });
  if (!nome) e.nome = 'Il nome \u00e8 obbligatorio';
  else if (altri.some(function (u) { return String(u.nome).trim().toLowerCase() === nome.toLowerCase(); })) e.nome = 'Esiste gi\u00e0 un utente con questo nome';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Email non valida';
  else if (altri.some(function (u) { return normEmail(u.email) === email; })) e.email = 'Questa email \u00e8 gi\u00e0 usata';
  if (RUOLI.indexOf(input.ruolo) < 0) e.ruolo = 'Ruolo non valido';
  if (input.id && input.id === me.id) {
    if (!isTrue(input.attivo)) e.attivo = 'Non puoi disattivare il tuo account';
    if (input.ruolo !== 'Titolare') e.ruolo = 'Non puoi toglierti il ruolo di Titolare';
  }
  return e;
}

function describeChanges(oldObj, newObj, fields) {
  return fields.filter(function (f) { return newObj[f] !== undefined && fmtVal(oldObj[f]) !== fmtVal(newObj[f]); })
    .map(function (f) { return f + ': ' + fmtVal(oldObj[f]) + ' \u2192 ' + fmtVal(newObj[f]); })
    .join(', ');
}

var USER_REF_COLS = ['utente_id', 'creato_da', 'assegnato_a', 'pagato_da'];

function countUserRefs(userId, tables) {
  var n = 0;
  Object.keys(tables).forEach(function (name) {
    tables[name].forEach(function (r) {
      if (name === 'Utenti' && r.id === userId) return;
      USER_REF_COLS.forEach(function (c) { if (r[c] === userId) n++; });
    });
  });
  return n;
}

function countRefs(col, id, tables) {
  var n = 0;
  Object.keys(tables).forEach(function (name) { tables[name].forEach(function (r) { if (r[col] === id) n++; }); });
  return n;
}

function publicUser(u) { return { id: u.id, nome: u.nome, email: normEmail(u.email), ruolo: u.ruolo === 'Socia' ? 'Titolare' : u.ruolo, attivo: isTrue(u.attivo), haPassword: !!u.password_hash }; }

var SESSIONE_GIORNI = 60;

function validatePassword(p) {
  p = String(p || '');
  if (p.length < 8) return 'La password deve avere almeno 8 caratteri';
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return 'Usa almeno una lettera e un numero';
  return '';
}

function sessioneValida(s, nowMs) { return !!s && !!s.scade_il && new Date(s.scade_il).getTime() > nowMs; }

/** Valida le righe di un ordine. */
function validateRighe(righe) {
  if (!righe || !righe.length) return 'Aggiungi almeno un prodotto';
  for (var i = 0; i < righe.length; i++) {
    var r = righe[i];
    if (!r.prodotto_id && !String(r.descrizione || '').trim()) return 'Riga ' + (i + 1) + ': scegli un prodotto';
    if (!(Number(r.quantita) > 0)) return 'Riga ' + (i + 1) + ': quantit\u00e0 non valida';
    if (r.prezzo_unitario !== '' && r.prezzo_unitario != null && isNaN(Number(r.prezzo_unitario))) return 'Riga ' + (i + 1) + ': prezzo non valido';
  }
  return '';
}

// ================= HTTP =================

var PUBLIC_ACTIONS = {
  catalogo: function () { return catalogo_(); },
  'auth.codice.invia': function (p) { return inviaCodice_(p); },
  'auth.codice.verifica': function (p) { return verificaCodice_(p); },
  'auth.password': function (p) { return loginPassword_(p); },
  'auth.esci': function (p) { return esci_(p); }
};

var ACTIONS = {
  whoami: function (p, me) { return me; },
  dati: function () { return datiTutti_(); },
  'utenti.list': function () { return readTable_('Utenti').rows.map(publicUser); },
  'utenti.save': function (p, me) { return saveUtente_(p, me); },
  'utenti.delete': function (p, me) { return deleteUtente_(p, me); },
  'attivita.list': function (p) {
    var lim = Math.min(Math.max(Number(p.limit) || 50, 1), 200);
    return readTable_('Attivita').rows.slice(-lim).reverse().map(clean_);
  },
  salva: function (p, me) { return salvaGenerico_(p.entita, p.dati || {}, me); },
  elimina: function (p, me) { return eliminaGenerico_(p.entita, p.id, me); },
  'ordine.salva': function (p, me) { return salvaOrdine_(p, me); },
  'ordine.stato': function (p, me) { return statoOrdine_(p, me); },
  'ordine.elimina': function (p, me) { return eliminaOrdine_(p, me); },
  'banco.vendita': function (p, me) { return venditaBanco_(p, me); },
  'spesa.rimborsa': function (p, me) { return rimborsaSpesa_(p, me); },
  'foto.carica': function (p, me) { return caricaFoto_(p, me); },
  'foto.elimina': function (p, me) { return eliminaFoto_(p, me); },
  'foto.dati': function (p) {
    var f = readTable_('Foto').rows.filter(function (r) { return r.id === p.id; })[0];
    if (!f) throw apiError_('NOT_FOUND', 'Foto non trovata');
    var b = DriveApp.getFileById(f.drive_id).getBlob();
    return { mime: b.getContentType(), base64: Utilities.base64Encode(b.getBytes()) };
  },
  'impostazioni.salva': function (p, me) { return salvaImpostazione_(p, me); },
  'auth.imposta_password': function (p, me) { return impostaPassword_(p, me); }
};

function doGet() { return json_({ ok: true, service: 'menta-peperita', version: VERSION }); }

function doPost(e) {
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (PUBLIC_ACTIONS[req.action]) return json_({ ok: true, data: PUBLIC_ACTIONS[req.action](req.payload || {}) });
    var me = req.sessione ? authSessione_(req.sessione) : authenticate_(req.idToken);
    var fn = ACTIONS[req.action];
    if (!fn) throw apiError_('UNKNOWN_ACTION', 'Azione sconosciuta: ' + req.action);
    return json_({ ok: true, data: fn(req.payload || {}, me) });
  } catch (err) {
    if (!err.code) console.error(err && err.stack || err);
    return json_({ ok: false, error: err.code || 'INTERNAL', message: err.code ? err.message : 'Errore interno: ' + (err && err.message), fields: err.fields || null });
  }
}

function soloTitolare_(me) { if (me.ruolo !== 'Titolare') throw apiError_('FORBIDDEN', 'Operazione riservata ai titolari'); }

function datiTutti_() {
  var out = {};
  ['Prodotti', 'Varianti', 'Materiali', 'ProdottiMateriali', 'Clienti', 'Ordini', 'RigheOrdine', 'Movimenti', 'Spese', 'Eventi', 'Foto', 'DaComprare']
    .forEach(function (t) { out[t] = readTable_(t).rows.map(clean_); });
  out.Utenti = readTable_('Utenti').rows.map(publicUser);
  out.Impostazioni = impostazioni_();
  return out;
}

function impostazioni_() {
  var o = {};
  readTable_('Impostazioni').rows.forEach(function (r) { o[r.chiave] = String(r.valore); });
  return o;
}

// ---------- Utenti ----------

function saveUtente_(p, me) {
  soloTitolare_(me);
  return withLock_(function () {
    var t = readTable_('Utenti');
    var input = { id: String(p.id || ''), nome: String(p.nome || '').trim(), email: normEmail(p.email), ruolo: p.ruolo, attivo: p.attivo !== false };
    var errors = validateUtente(input, t.rows, me);
    if (Object.keys(errors).length) throw apiError_('VALIDATION', 'Controlla i campi evidenziati', errors);
    if (!input.id) {
      input.id = nextId_('u', 'Utenti');
      input.creato_il = new Date();
      input.creato_da = me.id;
      appendRow_('Utenti', input);
      log_(me, 'crea', 'utente', input.id, input.nome + ' (' + input.email + ', ' + input.ruolo + ')');
      return publicUser(input);
    }
    var old = t.rows.filter(function (r) { return r.id === input.id; })[0];
    if (!old) throw apiError_('NOT_FOUND', 'Utente non trovato');
    var changes = describeChanges(publicUser(old), input, ['nome', 'email', 'ruolo', 'attivo']);
    if (changes) { updateRow_('Utenti', old._row, input); log_(me, 'modifica', 'utente', input.id, changes); }
    return publicUser(input);
  });
}

function deleteUtente_(p, me) {
  soloTitolare_(me);
  if (!p.id) throw apiError_('VALIDATION', 'Utente non indicato');
  if (p.id === me.id) throw apiError_('FORBIDDEN', 'Non puoi eliminare il tuo account');
  return withLock_(function () {
    var t = readTable_('Utenti');
    var u = t.rows.filter(function (r) { return r.id === p.id; })[0];
    if (!u) throw apiError_('NOT_FOUND', 'Utente non trovato');
    var tables = {};
    Object.keys(SCHEMA).forEach(function (name) {
      if (name !== 'Sessioni' && SCHEMA[name].some(function (c) { return USER_REF_COLS.indexOf(c) >= 0; })) tables[name] = readTable_(name).rows;
    });
    var n = countUserRefs(u.id, tables);
    if (n) throw apiError_('IN_USE', u.nome + ' ha gi\u00e0 ' + n + (n === 1 ? ' dato collegato' : ' dati collegati') + ': disattivalo invece di eliminarlo, cos\u00ec lo storico resta corretto');
    t.sheet.deleteRow(u._row);
    deleteRows_('Sessioni', function (r) { return r.utente_id === u.id; });
    log_(me, 'elimina', 'utente', u.id, u.nome + ' (' + normEmail(u.email) + ')');
    return { id: u.id };
  });
}

// ---------- Generico ----------

function salvaGenerico_(entita, dati, me) {
  var def = ENTITA[entita];
  if (!def) throw apiError_('VALIDATION', 'Tipo di dato sconosciuto: ' + entita);
  if (entita === 'movimento' && TIPI_MOVIMENTO.indexOf(dati.tipo) < 0) throw apiError_('VALIDATION', 'Tipo movimento non valido');
  return withLock_(function () {
    var isNew = !dati.id;
    var c = coerce(def.campi, dati, isNew);
    if (Object.keys(c.errors).length) throw apiError_('VALIDATION', 'Controlla i campi evidenziati', c.errors);
    var obj = c.obj;
    if (isNew) {
      Object.keys(def.def || {}).forEach(function (k) { if (obj[k] === undefined) obj[k] = def.def[k]; });
      obj.id = nextId_(def.pre, def.tab);
      if (SCHEMA[def.tab].indexOf('creato_il') >= 0) { obj.creato_il = new Date(); obj.creato_da = me.id; }
      appendRow_(def.tab, obj);
      if (entita === 'spesa' && obj.materiale_id && Number(obj.quantita) > 0) aggiornaScorta_(obj.materiale_id, Number(obj.quantita), me);
      log_(me, 'crea', entita, obj.id, obj.nome || obj.descrizione || obj.tipo || '');
      return readById_(def.tab, obj.id);
    }
    var t = readTable_(def.tab);
    var old = t.rows.filter(function (r) { return r.id === dati.id; })[0];
    if (!old) throw apiError_('NOT_FOUND', 'Elemento non trovato');
    var changes = describeChanges(clean_(old), obj, Object.keys(obj));
    if (changes) { obj.id = old.id; updateRow_(def.tab, old._row, obj); log_(me, 'modifica', entita, old.id, (old.nome || old.descrizione || '') + ' \u00b7 ' + changes); }
    return readById_(def.tab, old.id);
  });
}

function eliminaGenerico_(entita, id, me) {
  var def = ENTITA[entita];
  if (!def) throw apiError_('VALIDATION', 'Tipo di dato sconosciuto: ' + entita);
  if (!def.aiutoElimina) soloTitolare_(me);
  return withLock_(function () {
    var t = readTable_(def.tab);
    var old = t.rows.filter(function (r) { return r.id === id; })[0];
    if (!old) throw apiError_('NOT_FOUND', 'Elemento non trovato');
    if (def.ref) {
      var tables = {};
      Object.keys(SCHEMA).forEach(function (n) { if (n !== def.tab && SCHEMA[n].indexOf(def.ref) >= 0) tables[n] = readTable_(n).rows; });
      if (entita === 'prodotto') delete tables.ProdottiMateriali, delete tables.Varianti, delete tables.Foto;
      var n = countRefs(def.ref, id, tables);
      if (n) throw apiError_('IN_USE', 'Non si pu\u00f2 eliminare: \u00e8 usato in ' + n + (n === 1 ? ' elemento' : ' elementi') + '. Disattivalo invece.');
    }
    if (entita === 'prodotto') {
      deleteRows_('ProdottiMateriali', function (r) { return r.prodotto_id === id; });
      deleteRows_('Varianti', function (r) { return r.prodotto_id === id; });
    }
    t.sheet.deleteRow(old._row);
    log_(me, 'elimina', entita, id, old.nome || old.descrizione || '');
    return { id: id };
  });
}

function aggiornaScorta_(materialeId, delta, me) {
  var t = readTable_('Materiali');
  var m = t.rows.filter(function (r) { return r.id === materialeId; })[0];
  if (!m) return;
  var nuova = round2((Number(m.scorta) || 0) + delta);
  updateRow_('Materiali', m._row, { scorta: nuova });
  log_(me, 'modifica', 'materiale', m.id, m.nome + ' \u00b7 scorta: ' + fmtVal(m.scorta) + ' \u2192 ' + nuova);
}

// ---------- Ordini ----------

function salvaOrdine_(p, me) {
  var o = p.ordine || {};
  var righe = p.righe || [];
  var err = validateRighe(righe);
  if (err) throw apiError_('VALIDATION', err);
  if (o.stato && STATI_ORDINE.indexOf(o.stato) < 0) throw apiError_('VALIDATION', 'Stato non valido');
  return withLock_(function () {
    var clienteId = salvaCliente_(p.cliente, me);
    var dati = {
      data: o.data || oggi_(), cliente_id: clienteId, canale: o.canale || '', stato: o.stato || 'lavorazione',
      consegna_entro: o.consegna_entro || '', assegnato_a: o.assegnato_a || '', note: String(o.note || '').trim(), evento_id: o.evento_id || ''
    };
    var id = o.id;
    if (!id) {
      id = nextId_('o', 'Ordini');
      dati.id = id;
      dati.numero = numeroOrdine(nextCounter_('numero_ordine', function () { return maxSuffix('MP-', readTable_('Ordini').rows, 'numero'); }));
      dati.creato_il = new Date(); dati.creato_da = me.id;
      appendRow_('Ordini', dati);
      log_(me, 'crea', 'ordine', id, dati.numero);
    } else {
      var old = readTable_('Ordini').rows.filter(function (r) { return r.id === id; })[0];
      if (!old) throw apiError_('NOT_FOUND', 'Ordine non trovato');
      updateRow_('Ordini', old._row, dati);
      deleteRows_('RigheOrdine', function (r) { return r.ordine_id === id; });
      log_(me, 'modifica', 'ordine', id, old.numero);
    }
    scriviRighe_(id, righe);
    return { id: id };
  });
}

function salvaCliente_(c, me) {
  if (!c || !String(c.nome || '').trim()) return '';
  var dati = { nome: String(c.nome).trim(), instagram: String(c.instagram || '').trim().replace(/^@+/, ''), telefono: String(c.telefono || '').trim() };
  var t = readTable_('Clienti');
  var old = c.id ? t.rows.filter(function (r) { return r.id === c.id; })[0] : null;
  if (old) {
    var ch = describeChanges(clean_(old), dati, ['nome', 'instagram', 'telefono']);
    if (ch) { updateRow_('Clienti', old._row, dati); log_(me, 'modifica', 'cliente', old.id, ch); }
    return old.id;
  }
  dati.id = nextId_('c', 'Clienti'); dati.creato_il = new Date(); dati.creato_da = me.id;
  appendRow_('Clienti', dati);
  log_(me, 'crea', 'cliente', dati.id, dati.nome);
  return dati.id;
}

function scriviRighe_(ordineId, righe) {
  var start = nextCounter_('RigheOrdine', function () { return maxSuffix('r', readTable_('RigheOrdine').rows); }, righe.length);
  var sh = ss_().getSheetByName('RigheOrdine');
  var h = headers_(sh);
  var rows = righe.map(function (r, i) {
    var o = {
      id: 'r' + (start - righe.length + 1 + i), ordine_id: ordineId, prodotto_id: r.prodotto_id || '', variante_id: r.variante_id || '',
      descrizione: String(r.descrizione || '').trim(), quantita: Number(r.quantita),
      prezzo_unitario: r.prezzo_unitario === '' || r.prezzo_unitario == null ? '' : round2(r.prezzo_unitario),
      costo_unitario: r.costo_unitario === '' || r.costo_unitario == null ? '' : round2(r.costo_unitario)
    };
    return h.map(function (k) { return o[k] === undefined ? '' : o[k]; });
  });
  if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, h.length).setValues(rows);
}

function statoOrdine_(p, me) {
  if (STATI_ORDINE.indexOf(p.stato) < 0) throw apiError_('VALIDATION', 'Stato non valido');
  return withLock_(function () {
    var old = readTable_('Ordini').rows.filter(function (r) { return r.id === p.id; })[0];
    if (!old) throw apiError_('NOT_FOUND', 'Ordine non trovato');
    updateRow_('Ordini', old._row, { stato: p.stato, consegnato_il: p.stato === 'consegnato' ? oggi_() : '' });
    log_(me, 'modifica', 'ordine', old.id, old.numero + ' \u00b7 stato: ' + old.stato + ' \u2192 ' + p.stato);
    return { id: old.id, stato: p.stato };
  });
}

function eliminaOrdine_(p, me) {
  soloTitolare_(me);
  return withLock_(function () {
    var old = readTable_('Ordini').rows.filter(function (r) { return r.id === p.id; })[0];
    if (!old) throw apiError_('NOT_FOUND', 'Ordine non trovato');
    var mov = readTable_('Movimenti').rows.filter(function (r) { return r.ordine_id === p.id; }).length;
    if (mov) throw apiError_('IN_USE', 'Questo ordine ha ' + mov + ' pagamenti registrati: annullalo invece di eliminarlo');
    readTable_('Foto').rows.filter(function (r) { return r.ordine_id === p.id; }).forEach(function (f) { try { DriveApp.getFileById(f.drive_id).setTrashed(true); } catch (e) {} });
    deleteRows_('Foto', function (r) { return r.ordine_id === p.id; });
    deleteRows_('RigheOrdine', function (r) { return r.ordine_id === p.id; });
    deleteRows_('Ordini', function (r) { return r.id === p.id; });
    log_(me, 'elimina', 'ordine', old.id, old.numero);
    return { id: old.id };
  });
}

function venditaBanco_(p, me) {
  var err = validateRighe(p.righe);
  if (err) throw apiError_('VALIDATION', err);
  var tot = round2(p.righe.reduce(function (s, r) { return s + Number(r.quantita) * Number(r.prezzo_unitario || 0); }, 0));
  return withLock_(function () {
    var id = nextId_('o', 'Ordini');
    var numero = numeroOrdine(nextCounter_('numero_ordine', function () { return maxSuffix('MP-', readTable_('Ordini').rows, 'numero'); }));
    appendRow_('Ordini', { id: id, numero: numero, data: oggi_(), canale: 'Mercatino', stato: 'consegnato', consegnato_il: oggi_(), evento_id: p.evento_id || '', note: 'Vendita al banco', creato_il: new Date(), creato_da: me.id });
    scriviRighe_(id, p.righe);
    if (tot > 0) appendRow_('Movimenti', { id: nextId_('mv', 'Movimenti'), data: oggi_(), tipo: 'INCASSO', importo: tot, metodo: p.metodo || 'contanti', utente_id: me.id, ordine_id: id, evento_id: p.evento_id || '', creato_il: new Date(), creato_da: me.id });
    log_(me, 'crea', 'vendita', id, numero + ' \u00b7 ' + fmtVal(tot) + ' \u20ac ' + (p.metodo || ''));
    return { id: id, numero: numero, totale: tot };
  });
}

function rimborsaSpesa_(p, me) {
  return withLock_(function () {
    var s = readTable_('Spese').rows.filter(function (r) { return r.id === p.id; })[0];
    if (!s) throw apiError_('NOT_FOUND', 'Spesa non trovata');
    if (s.pagato_da === 'cassa' || s.stato_rimborso === 'rimborsato') throw apiError_('VALIDATION', 'Questa spesa non \u00e8 da rimborsare');
    appendRow_('Movimenti', { id: nextId_('mv', 'Movimenti'), data: oggi_(), tipo: 'RIMBORSO', importo: round2(s.costo), metodo: p.metodo || 'contanti', utente_id: s.pagato_da, spesa_id: s.id, creato_il: new Date(), creato_da: me.id });
    updateRow_('Spese', s._row, { stato_rimborso: 'rimborsato' });
    log_(me, 'modifica', 'spesa', s.id, s.descrizione + ' \u00b7 rimborsata');
    return { id: s.id };
  });
}

// ---------- Foto e impostazioni ----------

function cartellaFoto_() {
  var id = impostazioni_().cartella_foto;
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var f = DriveApp.createFolder('Menta Peperita - Foto');
  setImpostazione_('cartella_foto', f.getId());
  return f;
}

function caricaFoto_(p, me) {
  if (!p.base64) throw apiError_('VALIDATION', 'Foto mancante');
  var blob = Utilities.newBlob(Utilities.base64Decode(p.base64), p.mime || 'image/jpeg', (p.ordine_id || p.prodotto_id || 'foto') + '-' + Date.now() + '.jpg');
  var file = cartellaFoto_().createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return withLock_(function () {
    var row = { id: nextId_('f', 'Foto'), ordine_id: p.ordine_id || '', prodotto_id: p.prodotto_id || '', drive_id: file.getId(), creato_il: new Date(), creato_da: me.id };
    appendRow_('Foto', row);
    if (p.prodotto_id) {
      var pr = readTable_('Prodotti').rows.filter(function (r) { return r.id === p.prodotto_id; })[0];
      if (pr) updateRow_('Prodotti', pr._row, { foto_id: file.getId() });
    }
    log_(me, 'crea', 'foto', row.id, p.ordine_id || p.prodotto_id || '');
    return clean_(row);
  });
}

function eliminaFoto_(p, me) {
  return withLock_(function () {
    var f = readTable_('Foto').rows.filter(function (r) { return r.id === p.id; })[0];
    if (!f) throw apiError_('NOT_FOUND', 'Foto non trovata');
    try { DriveApp.getFileById(f.drive_id).setTrashed(true); } catch (e) {}
    deleteRows_('Foto', function (r) { return r.id === p.id; });
    log_(me, 'elimina', 'foto', p.id, f.ordine_id || f.prodotto_id || '');
    return { id: p.id };
  });
}

function setImpostazione_(chiave, valore) {
  var t = readTable_('Impostazioni');
  var r = t.rows.filter(function (x) { return x.chiave === chiave; })[0];
  if (r) t.sheet.getRange(r._row, 2).setValue(valore); else t.sheet.appendRow([chiave, valore]);
}

var CHIAVI_PUBBLICHE = ['instagram', 'whatsapp', 'quote', 'messaggio_ricevuto', 'messaggio_pronto', 'messaggio_pagamento', 'checklist_mercatino'];

function salvaImpostazione_(p, me) {
  soloTitolare_(me);
  if (CHIAVI_PUBBLICHE.indexOf(p.chiave) < 0) throw apiError_('VALIDATION', 'Impostazione non modificabile');
  return withLock_(function () {
    setImpostazione_(p.chiave, String(p.valore == null ? '' : p.valore).slice(0, 5000));
    log_(me, 'modifica', 'impostazione', p.chiave, '');
    return { chiave: p.chiave };
  });
}

function catalogo_() {
  var imp = impostazioni_();
  return {
    instagram: imp.instagram || '', whatsapp: imp.whatsapp || '',
    prodotti: readTable_('Prodotti').rows.filter(function (r) { return isTrue(r.attivo) && isTrue(r.pubblico); })
      .map(function (r) { return { nome: r.nome, descrizione: r.descrizione, prezzo: r.prezzo, foto_id: r.foto_id }; })
  };
}

// ================= Accesso con codice via email o password =================

function sha256Hex_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}
function hashPassword_(password, salt, iter) {
  var h = salt + ':' + password;
  for (var i = 0; i < iter; i++) h = sha256Hex_(h + password);
  return h;
}
function nuovoHash_(password) {
  var salt = Utilities.getUuid().replace(/-/g, ''), iter = 1500;
  return 'v1$' + iter + '$' + salt + '$' + hashPassword_(password, salt, iter);
}
function verificaHash_(password, stored) {
  var p = String(stored || '').split('$');
  return p.length === 4 && hashPassword_(password, p[2], Number(p[1])) === p[3];
}
function utentePerEmail_(email) {
  return readTable_('Utenti').rows.filter(function (r) { return normEmail(r.email) === email && isTrue(r.attivo); })[0] || null;
}

function inviaCodice_(p) {
  var email = normEmail(p.email), cache = CacheService.getScriptCache();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw apiError_('VALIDATION', 'Email non valida');
  if (cache.get('cs_' + email)) throw apiError_('BUSY', 'Codice gi\u00e0 inviato: aspetta un minuto prima di chiederne un altro');
  cache.put('cs_' + email, '1', 60);
  var u = utentePerEmail_(email);
  if (u) {
    var codice = String(100000 + parseInt(Utilities.getUuid().replace(/-/g, '').slice(0, 12), 16) % 900000);
    cache.put('cod_' + email, JSON.stringify({ h: sha256Hex_(codice), t: 0 }), 600);
    MailApp.sendEmail({
      to: email, name: 'Menta Peperita', subject: 'Il tuo codice Menta Peperita: ' + codice,
      body: 'Ciao ' + u.nome + ',\n\nil codice per entrare nell\'app Menta Peperita \u00e8: ' + codice +
        '\n\nVale 10 minuti e si pu\u00f2 usare una volta sola.\nSe non l\'hai chiesto tu, ignora questa email.'
    });
  }
  return { inviato: true };
}

function verificaCodice_(p) {
  var email = normEmail(p.email), cache = CacheService.getScriptCache(), raw = cache.get('cod_' + email);
  if (!raw) throw apiError_('CODE_INVALID', 'Codice scaduto o mai richiesto: chiedine uno nuovo');
  var c = JSON.parse(raw);
  if (sha256Hex_(String(p.codice || '').replace(/\D/g, '')) !== c.h) {
    c.t++;
    if (c.t >= 5) { cache.remove('cod_' + email); throw apiError_('CODE_INVALID', 'Troppi tentativi: chiedi un nuovo codice'); }
    cache.put('cod_' + email, JSON.stringify(c), 600);
    throw apiError_('CODE_INVALID', 'Codice sbagliato, riprova');
  }
  cache.remove('cod_' + email);
  var u = utentePerEmail_(email);
  if (!u) throw apiError_('NOT_ALLOWED', email + ' non \u00e8 tra gli utenti abilitati');
  return creaSessione_(u, p.dispositivo);
}

function loginPassword_(p) {
  var email = normEmail(p.email), cache = CacheService.getScriptCache(), k = 'pw_' + email, n = Number(cache.get(k) || 0);
  if (n >= 5) throw apiError_('LOCKED', 'Troppi tentativi: riprova tra 15 minuti oppure entra con il codice via email');
  var u = utentePerEmail_(email);
  if (!u || !u.password_hash || !verificaHash_(String(p.password || ''), u.password_hash)) {
    cache.put(k, String(n + 1), 900);
    throw apiError_('BAD_LOGIN', 'Email o password non corretti');
  }
  cache.remove(k);
  return creaSessione_(u, p.dispositivo);
}

function creaSessione_(u, dispositivo) {
  var token = Utilities.getUuid() + Utilities.getUuid();
  var scade = new Date(Date.now() + SESSIONE_GIORNI * 864e5);
  withLock_(function () {
    appendRow_('Sessioni', { id: nextId_('ss', 'Sessioni'), token_hash: sha256Hex_(token), utente_id: u.id, scade_il: scade, dispositivo: String(dispositivo || '').slice(0, 120), creato_il: new Date() });
  });
  return { sessione: token, scade_il: scade.toISOString(), utente: publicUser(u) };
}

function authSessione_(token) {
  var h = sha256Hex_(token), cache = CacheService.getScriptCache(), uid = cache.get('ses_' + h);
  if (!uid) {
    var s = readTable_('Sessioni').rows.filter(function (r) { return r.token_hash === h; })[0];
    if (!sessioneValida(s, Date.now())) throw apiError_('SESSION_EXPIRED', 'Sessione scaduta, rientra');
    uid = s.utente_id;
    cache.put('ses_' + h, uid, 600);
  }
  var u = readTable_('Utenti').rows.filter(function (r) { return r.id === uid && isTrue(r.attivo); })[0];
  if (!u) throw apiError_('NOT_ALLOWED', 'Utente non abilitato');
  return publicUser(u);
}

function esci_(p) {
  if (!p.sessione) return { ok: true };
  var h = sha256Hex_(p.sessione);
  CacheService.getScriptCache().remove('ses_' + h);
  withLock_(function () { deleteRows_('Sessioni', function (r) { return r.token_hash === h; }); });
  return { ok: true };
}

function impostaPassword_(p, me) {
  var err = validatePassword(p.password);
  if (err) throw apiError_('VALIDATION', err, { password: err });
  return withLock_(function () {
    var u = readTable_('Utenti').rows.filter(function (r) { return r.id === me.id; })[0];
    updateRow_('Utenti', u._row, { password_hash: nuovoHash_(String(p.password)) });
    log_(me, 'modifica', 'password', me.id, 'password impostata');
    return { ok: true };
  });
}

// ================= Login =================

function authenticate_(idToken) {
  if (!idToken) throw apiError_('NO_TOKEN', 'Accesso richiesto');
  var cache = CacheService.getScriptCache();
  var key = 'tk_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, idToken));
  var email = cache.get(key);
  if (!email) {
    var res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) throw apiError_('BAD_TOKEN', 'Sessione scaduta, rientra');
    var t = JSON.parse(res.getContentText());
    var clientId = PropertiesService.getScriptProperties().getProperty('CLIENT_ID');
    if (!clientId) throw apiError_('NOT_CONFIGURED', 'CLIENT_ID mancante nelle propriet\u00e0 dello script');
    if (t.aud !== clientId) throw apiError_('BAD_TOKEN', 'Token non valido per questa app');
    if (t.iss !== 'accounts.google.com' && t.iss !== 'https://accounts.google.com') throw apiError_('BAD_TOKEN', 'Emittente non valido');
    if (String(t.email_verified) !== 'true') throw apiError_('BAD_TOKEN', 'Email Google non verificata');
    email = normEmail(t.email);
    var ttl = Math.min(3000, Number(t.exp) - Math.floor(Date.now() / 1000) - 60);
    if (ttl > 0) cache.put(key, email, ttl);
  }
  var u = readTable_('Utenti').rows.filter(function (r) { return normEmail(r.email) === email && isTrue(r.attivo); })[0];
  if (!u) throw apiError_('NOT_ALLOWED', email + ' non \u00e8 tra gli utenti abilitati');
  return publicUser(u);
}

// ================= Accesso ai fogli =================

function ss_() { return SpreadsheetApp.getActive(); }
function oggi_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }

function headers_(sh) {
  var n = sh.getLastColumn();
  return n ? sh.getRange(1, 1, 1, n).getValues()[0] : [];
}

function readTable_(name) {
  var sh = ss_().getSheetByName(name);
  if (!sh) throw apiError_('NOT_CONFIGURED', 'Foglio ' + name + ' mancante: esegui setup()');
  var values = sh.getDataRange().getValues();
  var headers = values.shift() || [];
  var rows = [];
  values.forEach(function (r, i) {
    if (!r.some(function (c) { return c !== ''; })) return;
    var o = { _row: i + 2 };
    headers.forEach(function (h, j) {
      if (!h) return;
      var v = r[j];
      if (v instanceof Date) v = DATE_COLS.indexOf(h) >= 0 ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd') : v.toISOString();
      o[h] = v;
    });
    rows.push(o);
  });
  return { sheet: sh, headers: headers, rows: rows };
}

function readById_(name, id) { return clean_(readTable_(name).rows.filter(function (r) { return r.id === id; })[0] || {}); }

function appendRow_(name, obj) {
  var sh = ss_().getSheetByName(name);
  sh.appendRow(headers_(sh).map(function (h) { return obj[h] === undefined ? '' : obj[h]; }));
}

function updateRow_(name, row, obj) {
  var sh = ss_().getSheetByName(name);
  var h = headers_(sh);
  var range = sh.getRange(row, 1, 1, h.length);
  var cur = range.getValues()[0];
  range.setValues([h.map(function (k, j) { return obj[k] === undefined ? cur[j] : obj[k]; })]);
}

function deleteRows_(name, pred) {
  var t = readTable_(name);
  t.rows.filter(pred).map(function (r) { return r._row; }).sort(function (a, b) { return b - a; })
    .forEach(function (row) { t.sheet.deleteRow(row); });
}

/** Contatore per nome; seed calcolato la prima volta. step = quanti numeri riservare. Ritorna l'ultimo riservato. */
function nextCounter_(nome, seed, step) {
  step = step || 1;
  var t = readTable_('Contatori');
  var row = t.rows.filter(function (r) { return r.nome === nome; })[0];
  var next = (row ? Number(row.valore) : seed()) + step;
  if (row) t.sheet.getRange(row._row, 2).setValue(next); else t.sheet.appendRow([nome, next]);
  return next;
}

function nextId_(prefix, table) {
  return prefix + nextCounter_(table, function () { return maxSuffix(prefix, readTable_(table).rows); });
}

function log_(me, azione, entita, entitaId, dettaglio) {
  appendRow_('Attivita', {
    id: nextId_('a', 'Attivita'), quando: new Date(), utente_id: me.id,
    azione: azione, entita: entita, entita_id: entitaId, dettaglio: String(dettaglio || '').slice(0, 500)
  });
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw apiError_('BUSY', 'Qualcun altro sta salvando: riprova tra un attimo');
  try { var r = fn(); SpreadsheetApp.flush(); return r; } finally { lock.releaseLock(); }
}

function clean_(o) { var c = {}; Object.keys(o).forEach(function (k) { if (k !== '_row') c[k] = o[k]; }); return c; }
function apiError_(code, message, fields) { var e = new Error(message); e.code = code; e.fields = fields || null; return e; }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

// ================= Da eseguire dall'editor =================

/** Crea fogli e colonne mancanti. Si puo' ripetere senza perdere dati. */
function setup() {
  var ss = ss_();
  Object.keys(SCHEMA).forEach(function (name) {
    var cols = SCHEMA[name];
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    var have = headers_(sh).filter(String);
    var missing = cols.filter(function (c) { return have.indexOf(c) < 0; });
    if (missing.length) sh.getRange(1, have.length + 1, 1, missing.length).setValues([missing]);
    sh.getRange(1, 1, 1, have.length + missing.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  });
  var tu = readTable_('Utenti');
  var colRuolo = tu.headers.indexOf('ruolo') + 1;
  tu.rows.forEach(function (r) { if (r.ruolo === 'Socia') tu.sheet.getRange(r._row, colRuolo).setValue('Titolare'); });
  if (!readTable_('Utenti').rows.length) {
    var email = Session.getActiveUser().getEmail();
    if (!email) throw new Error('Email non disponibile: esegui setup() dall\'editor con il tuo account');
    appendRow_('Utenti', { id: 'u1', nome: email.split('@')[0], email: normEmail(email), ruolo: 'Titolare', attivo: true, creato_il: new Date(), creato_da: 'setup' });
  }
  ['Foglio1', 'Sheet1'].forEach(function (n) {
    var f = ss.getSheetByName(n);
    if (f && f.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(f);
  });
  cartellaFoto_();
  return 'Setup completato';
}

/** Copia di sicurezza del database nella cartella "Menta Peperita - Backup" (tiene le ultime 12). */
function backup() {
  var ss = ss_();
  var id = impostazioni_().cartella_backup, cartella = null;
  if (id) { try { cartella = DriveApp.getFolderById(id); } catch (e) {} }
  if (!cartella) { cartella = DriveApp.createFolder('Menta Peperita - Backup'); setImpostazione_('cartella_backup', cartella.getId()); }
  DriveApp.getFileById(ss.getId()).makeCopy(ss.getName() + ' - backup ' + oggi_(), cartella);
  var files = [], it = cartella.getFiles();
  while (it.hasNext()) files.push(it.next());
  files.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
  files.slice(12).forEach(function (f) { f.setTrashed(true); });
  return 'Backup fatto';
}

/** Attiva il backup automatico il giorno 1 di ogni mese (e ne fa subito uno). */
function attivaBackupMensile() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'backup') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('backup').timeBased().onMonthDay(1).atHour(3).create();
  return backup();
}

/** Importa il vecchio foglio gestionale. Proprieta' script IMPORT_ID = ID del vecchio foglio. Solo se non ci sono ordini. */
function importaVecchioFoglio() {
  var srcId = PropertiesService.getScriptProperties().getProperty('IMPORT_ID');
  if (!srcId) throw new Error('Aggiungi la propriet\u00e0 IMPORT_ID con l\'ID del vecchio foglio');
  if (readTable_('Ordini').rows.length) throw new Error('Ci sono gi\u00e0 ordini: import annullato per non creare doppioni');
  var src = SpreadsheetApp.openById(srcId);
  var me = { id: 'import' };
  var conta = { ordini: 0, righe: 0, movimenti: 0, spese: 0, daComprare: 0, prodotti: 0, clienti: 0, persone: 0 };
  function tab(name) {
    var sh = src.getSheetByName(name);
    if (!sh) return [];
    var v = sh.getDataRange().getValues();
    var h = v.shift().map(function (x) { return String(x).trim(); });
    return v.filter(function (r) { return r.some(function (c) { return c !== '' && c !== false; }); })
      .map(function (r) { var o = {}; h.forEach(function (k, i) { o[k] = r[i]; }); return o; });
  }
  function d(v) { return v instanceof Date ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd') : ''; }
  function txt(v) { return v === true || v === false || v == null ? '' : String(v).trim(); }
  function stamp(o) { o.creato_il = new Date(); o.creato_da = 'import'; return o; }
  var persone = {};
  readTable_('Utenti').rows.forEach(function (u) { persone[String(u.nome).trim().toLowerCase()] = u.id; });
  function persona(nome) {
    nome = txt(nome); if (!nome) return '';
    if (/^cassa/i.test(nome)) return 'cassa';
    var k = nome.toLowerCase();
    if (!persone[k]) { persone[k] = nextId_('u', 'Utenti'); appendRow_('Utenti', stamp({ id: persone[k], nome: nome, email: '', ruolo: 'Titolare', attivo: false })); conta.persone++; }
    return persone[k];
  }
  var prodotti = {};
  readTable_('Prodotti').rows.forEach(function (p) { prodotti[String(p.nome).trim().toLowerCase()] = p.id; });
  function prodotto(nome) {
    nome = txt(nome); if (!nome) return '';
    var k = nome.toLowerCase();
    if (!prodotti[k]) { prodotti[k] = nextId_('p', 'Prodotti'); appendRow_('Prodotti', stamp({ id: prodotti[k], nome: nome, attivo: true, pubblico: true })); conta.prodotti++; }
    return prodotti[k];
  }
  var clienti = {};
  function cliente(nome) {
    nome = txt(nome); if (!nome) return '';
    var k = nome.toLowerCase();
    if (!clienti[k]) { clienti[k] = nextId_('c', 'Clienti'); appendRow_('Clienti', stamp({ id: clienti[k], nome: nome })); conta.clienti++; }
    return clienti[k];
  }
  function mov(o) { appendRow_('Movimenti', stamp(Object.assign({ id: nextId_('mv', 'Movimenti'), note: 'import' }, o))); conta.movimenti++; }
  return withLock_(function () {
    tab('Impostazioni').forEach(function (r) { prodotto(r['Prodotti']); persona(r['Cassa e persone']); });
    var gruppi = {}, numeri = [];
    tab('Ordini').forEach(function (r) {
      var n = txt(r['N\u00b0 ordine']); if (!n) return;
      if (!gruppi[n]) { gruppi[n] = []; numeri.push(n); }
      gruppi[n].push(r);
    });
    numeri.forEach(function (n) {
      var rr = gruppi[n], f = rr[0], id = nextId_('o', 'Ordini');
      var consegnato = rr.every(function (r) { return isTrue(r['Consegnato']); });
      var pronto = rr.every(function (r) { return isTrue(r['Realizzato']); });
      appendRow_('Ordini', stamp({
        id: id, numero: n, data: d(f['Data ordine']) || oggi_(), cliente_id: cliente(f['Nome cliente']), canale: txt(f['Provenienza']),
        stato: consegnato ? 'consegnato' : pronto ? 'pronto' : 'lavorazione', note: rr.map(function (r) { return txt(r['Note']); }).filter(String).join(' \u00b7 ')
      }));
      conta.ordini++;
      rr.forEach(function (r) {
        var q = Number(r['Quantit\u00e0']) || 1, imp = r['Importo (\u20ac)'];
        var conImporto = imp !== '' && imp != null && imp !== false && !isNaN(Number(imp));
        appendRow_('RigheOrdine', { id: nextId_('r', 'RigheOrdine'), ordine_id: id, prodotto_id: prodotto(r['Prodotto']), quantita: q, prezzo_unitario: conImporto ? round2(Number(imp) / q) : '' });
        conta.righe++;
        if (isTrue(r['Pagato']) && conImporto && Number(imp) > 0) {
          var chi = persona(r['Incassato da']) || 'cassa';
          mov({ data: d(f['Data ordine']) || oggi_(), tipo: 'INCASSO', importo: round2(imp), utente_id: chi, ordine_id: id });
          if (chi !== 'cassa' && isTrue(r['Versato in cassa'])) mov({ data: d(f['Data ordine']) || oggi_(), tipo: 'VERSAMENTO', importo: round2(imp), utente_id: chi, ordine_id: id });
        }
      });
    });
    var maxNum = maxSuffix('MP-', readTable_('Ordini').rows, 'numero');
    var tc = readTable_('Contatori'), rc = tc.rows.filter(function (r) { return r.nome === 'numero_ordine'; })[0];
    if (rc) tc.sheet.getRange(rc._row, 2).setValue(maxNum); else tc.sheet.appendRow(['numero_ordine', maxNum]);
    tab('Acquisti').forEach(function (r) {
      var desc = txt(r['Cosa comprare']); if (!desc) return;
      if (!isTrue(r['Acquistato'])) {
        appendRow_('DaComprare', stamp({ id: nextId_('dc', 'DaComprare'), descrizione: desc, quantita: Number(r['Quantit\u00e0']) || '', negozio: txt(r['Dove acquistare']), fatto: false }));
        conta.daComprare++; return;
      }
      var chi = persona(r['Pagato da']) || 'cassa', costo = round2(Number(r['Costo (\u20ac)']) || 0), sid = nextId_('s', 'Spese');
      var rimb = chi === 'cassa' ? '' : isTrue(r['Rimborsato']) ? 'rimborsato' : 'da_rimborsare';
      appendRow_('Spese', stamp({ id: sid, data: d(r['Data acquisto']) || oggi_(), descrizione: desc, negozio: txt(r['Dove acquistare']), quantita: Number(r['Quantit\u00e0']) || '', costo: costo, pagato_da: chi, stato_rimborso: rimb, note: txt(r['Note']) }));
      conta.spese++;
      if (rimb === 'rimborsato') mov({ data: d(r['Data acquisto']) || oggi_(), tipo: 'RIMBORSO', importo: costo, utente_id: chi, spesa_id: sid });
    });
    log_(me, 'crea', 'import', '', JSON.stringify(conta));
    return 'Import completato: ' + JSON.stringify(conta);
  });
}
