/** Menta Peperita – API. Bound al Google Sheet. */
const VERSION = '0.1.0';
const PROPS = PropertiesService.getScriptProperties();
const SHEET_UTENTI = 'Utenti';
const UTENTI_HEADERS = ['id', 'nome', 'email', 'ruolo', 'attivo'];

const ACTIONS = {
  whoami: (payload, user) => user
};

function doGet() {
  return json_({ ok: true, service: 'menta-peperita', version: VERSION });
}

function doPost(e) {
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const user = authenticate_(req.idToken);
    const fn = ACTIONS[req.action];
    if (!fn) throw apiError_('UNKNOWN_ACTION', 'Azione sconosciuta: ' + req.action);
    return json_({ ok: true, data: fn(req.payload || {}, user) });
  } catch (err) {
    if (!err.code) console.error(err);
    return json_({ ok: false, error: err.code || 'INTERNAL', message: err.code ? err.message : 'Errore interno' });
  }
}

/** Verifica il token Google e che l'email sia tra gli utenti attivi. */
function authenticate_(idToken) {
  if (!idToken) throw apiError_('NO_TOKEN', 'Accesso richiesto');
  const cache = CacheService.getScriptCache();
  const key = 'tk_' + Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, idToken));
  let email = cache.get(key);
  if (!email) {
    const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' +
      encodeURIComponent(idToken), { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) throw apiError_('BAD_TOKEN', 'Sessione scaduta, rientra');
    const t = JSON.parse(res.getContentText());
    const clientId = PROPS.getProperty('CLIENT_ID');
    if (!clientId) throw apiError_('NOT_CONFIGURED', 'CLIENT_ID mancante nelle proprietà dello script');
    if (t.aud !== clientId) throw apiError_('BAD_TOKEN', 'Token non valido per questa app');
    if (t.iss !== 'accounts.google.com' && t.iss !== 'https://accounts.google.com') throw apiError_('BAD_TOKEN', 'Emittente non valido');
    if (String(t.email_verified) !== 'true') throw apiError_('BAD_TOKEN', 'Email Google non verificata');
    email = String(t.email).toLowerCase();
    const ttl = Math.min(3000, Number(t.exp) - Math.floor(Date.now() / 1000) - 60);
    if (ttl > 0) cache.put(key, email, ttl);
  }
  const user = findActiveUser_(email);
  if (!user) throw apiError_('NOT_ALLOWED', email + ' non è tra gli utenti abilitati');
  return user;
}

function findActiveUser_(email) {
  const rows = readTable_(SHEET_UTENTI);
  const u = rows.find((r) => String(r.email).toLowerCase() === email && (r.attivo === true || r.attivo === 'TRUE'));
  return u ? { id: u.id, nome: u.nome, email: email, ruolo: u.ruolo } : null;
}

/** Legge un foglio come array di oggetti (riga 1 = intestazioni). */
function readTable_(name) {
  const sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) throw apiError_('NOT_CONFIGURED', 'Foglio ' + name + ' mancante: esegui setup()');
  const values = sh.getDataRange().getValues();
  const headers = values.shift();
  return values.filter((r) => r.some((c) => c !== '')).map((r) =>
    headers.reduce((o, h, i) => { o[h] = r[i]; return o; }, {}));
}

/** Da eseguire una volta dall'editor: crea i fogli e registra te come primo utente. */
function setup() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEET_UTENTI);
  if (!sh) {
    sh = ss.insertSheet(SHEET_UTENTI);
    sh.getRange(1, 1, 1, UTENTI_HEADERS.length).setValues([UTENTI_HEADERS]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  if (sh.getLastRow() < 2) {
    const email = Session.getActiveUser().getEmail();
    if (!email) throw new Error('Email non disponibile: esegui setup() dall\'editor con il tuo account');
    sh.appendRow(['u1', email.split('@')[0], email.toLowerCase(), 'Socia', true]);
  }
  return 'Setup completato';
}

function apiError_(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
