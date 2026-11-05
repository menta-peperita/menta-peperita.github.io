/** Menta Peperita - API (Apps Script, collegato al Google Sheet). */
var VERSION = '0.2.0';
var RUOLI = ['Socia', 'Aiuto'];

/** Schema del database: un foglio per tabella, riga 1 = intestazioni. setup() aggiunge solo cio' che manca. */
var SCHEMA = {
  Utenti: ['id', 'nome', 'email', 'ruolo', 'attivo', 'creato_il', 'creato_da'],
  Attivita: ['id', 'quando', 'utente_id', 'azione', 'entita', 'entita_id', 'dettaglio'],
  Contatori: ['nome', 'valore'],
  Impostazioni: ['chiave', 'valore'],
  Prodotti: ['id', 'nome', 'prezzo', 'tempo_min', 'foto_id', 'attivo', 'creato_il', 'creato_da'],
  Varianti: ['id', 'prodotto_id', 'gruppo', 'nome', 'sovrapprezzo', 'attivo'],
  Materiali: ['id', 'nome', 'unita', 'costo_unitario', 'scorta', 'soglia_minima', 'attivo'],
  ProdottiMateriali: ['id', 'prodotto_id', 'materiale_id', 'quantita'],
  Clienti: ['id', 'nome', 'instagram', 'telefono', 'note', 'creato_il', 'creato_da'],
  Ordini: ['id', 'numero', 'data', 'cliente_id', 'canale', 'stato', 'consegna_entro', 'assegnato_a', 'note', 'evento_id', 'creato_il', 'creato_da'],
  RigheOrdine: ['id', 'ordine_id', 'prodotto_id', 'variante_id', 'descrizione', 'quantita', 'prezzo_unitario', 'costo_unitario'],
  Movimenti: ['id', 'data', 'tipo', 'importo', 'metodo', 'utente_id', 'ordine_id', 'spesa_id', 'evento_id', 'note', 'creato_il', 'creato_da'],
  Spese: ['id', 'data', 'descrizione', 'negozio', 'quantita', 'costo', 'pagato_da', 'stato_rimborso', 'evento_id', 'materiale_id', 'creato_il', 'creato_da'],
  Eventi: ['id', 'nome', 'luogo', 'data', 'checklist', 'note', 'creato_il', 'creato_da'],
  Foto: ['id', 'ordine_id', 'prodotto_id', 'drive_id', 'creato_il', 'creato_da'],
  DaComprare: ['id', 'descrizione', 'materiale_id', 'quantita', 'fatto', 'creato_il', 'creato_da']
};

// ---------------- Logica pura (nessuna API Google: testata con Node) ----------------

function normEmail(v) { return String(v == null ? '' : v).trim().toLowerCase(); }
function isTrue(v) { return v === true || String(v).toUpperCase() === 'TRUE'; }
function fmtVal(v) { return v === true ? 's\u00ec' : v === false ? 'no' : String(v == null ? '' : v); }

function maxSuffix(prefix, rows) {
  return rows.reduce(function (m, r) {
    var s = String(r.id || '');
    if (s.indexOf(prefix) !== 0) return m;
    var n = parseInt(s.slice(prefix.length), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
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
    if (!isTrue(input.attivo)) e.attivo = 'Non puoi disattivare te stessa';
    if (input.ruolo !== 'Socia') e.ruolo = 'Non puoi toglierti il ruolo di Socia';
  }
  return e;
}

function describeChanges(oldObj, newObj, fields) {
  return fields.filter(function (f) { return fmtVal(oldObj[f]) !== fmtVal(newObj[f]); })
    .map(function (f) { return f + ': ' + fmtVal(oldObj[f]) + ' \u2192 ' + fmtVal(newObj[f]); })
    .join(', ');
}

function publicUser(u) { return { id: u.id, nome: u.nome, email: normEmail(u.email), ruolo: u.ruolo, attivo: isTrue(u.attivo) }; }

// ---------------- HTTP ----------------

var ACTIONS = {
  whoami: function (p, me) { return me; },
  'utenti.list': function () { return readTable_('Utenti').rows.map(publicUser); },
  'utenti.save': function (p, me) { return saveUtente_(p, me); },
  'attivita.list': function (p) {
    var lim = Math.min(Math.max(Number(p.limit) || 50, 1), 200);
    return readTable_('Attivita').rows.slice(-lim).reverse().map(clean_);
  }
};

function doGet() { return json_({ ok: true, service: 'menta-peperita', version: VERSION }); }

function doPost(e) {
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var me = authenticate_(req.idToken);
    var fn = ACTIONS[req.action];
    if (!fn) throw apiError_('UNKNOWN_ACTION', 'Azione sconosciuta: ' + req.action);
    return json_({ ok: true, data: fn(req.payload || {}, me) });
  } catch (err) {
    if (!err.code) console.error(err && err.stack || err);
    return json_({ ok: false, error: err.code || 'INTERNAL', message: err.code ? err.message : 'Errore interno', fields: err.fields || null });
  }
}

function saveUtente_(p, me) {
  if (me.ruolo !== 'Socia') throw apiError_('FORBIDDEN', 'Solo le socie possono gestire gli utenti');
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
    if (changes) {
      updateRow_('Utenti', old._row, input);
      log_(me, 'modifica', 'utente', input.id, changes);
    }
    return publicUser(input);
  });
}

// ---------------- Login ----------------

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

// ---------------- Accesso ai fogli ----------------

function ss_() { return SpreadsheetApp.getActive(); }

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
    headers.forEach(function (h, j) { if (h) o[h] = r[j]; });
    rows.push(o);
  });
  return { sheet: sh, headers: headers, rows: rows };
}

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

/** Id progressivo per tabella (da chiamare dentro withLock_). */
function nextId_(prefix, table) {
  var t = readTable_('Contatori');
  var row = t.rows.filter(function (r) { return r.nome === table; })[0];
  var next = (row ? Number(row.valore) : maxSuffix(prefix, readTable_(table).rows)) + 1;
  if (row) t.sheet.getRange(row._row, 2).setValue(next); else t.sheet.appendRow([table, next]);
  return prefix + next;
}

function log_(me, azione, entita, entitaId, dettaglio) {
  appendRow_('Attivita', {
    id: nextId_('a', 'Attivita'), quando: new Date(), utente_id: me.id,
    azione: azione, entita: entita, entita_id: entitaId, dettaglio: String(dettaglio || '').slice(0, 500)
  });
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw apiError_('BUSY', 'Qualcun altro sta salvando: riprova tra un attimo');
  try { var r = fn(); SpreadsheetApp.flush(); return r; } finally { lock.releaseLock(); }
}

function clean_(o) { var c = {}; Object.keys(o).forEach(function (k) { if (k !== '_row') c[k] = o[k]; }); return c; }

function apiError_(code, message, fields) { var e = new Error(message); e.code = code; e.fields = fields || null; return e; }

function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

// ---------------- Setup (da eseguire dall'editor; si puo' ripetere) ----------------

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
  if (!readTable_('Utenti').rows.length) {
    var email = Session.getActiveUser().getEmail();
    if (!email) throw new Error('Email non disponibile: esegui setup() dall\'editor con il tuo account');
    appendRow_('Utenti', { id: 'u1', nome: email.split('@')[0], email: normEmail(email), ruolo: 'Socia', attivo: true, creato_il: new Date(), creato_da: 'setup' });
  }
  ['Foglio1', 'Sheet1'].forEach(function (n) {
    var f = ss.getSheetByName(n);
    if (f && f.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(f);
  });
  return 'Setup completato';
}
