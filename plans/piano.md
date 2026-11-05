# Piano – App gestionale Menta Peperita

## Architettura
Vue 3 + Vite (PWA) su GitHub Pages → API Google Apps Script (bound al Google Sheet) → Sheet (DB) + cartella Drive (foto).

## Fasi
| # | Fase | Verificata quando |
|---|---|---|
| 0 | Spike: login Google, API, Pages, condivisione foto | login e "chi sono" dal telefono; esito share iOS/Android |
| 1 | Fondamenta: schema fogli, utenti, log attività, layout responsive | build + test verdi |
| 2 | Prodotti: listino, varianti, materiali, costi | test margine |
| 3 | Ordini: lista, nuovo, dettaglio, contatti, consegna, assegnazione, duplica | test numerazione concorrente |
| 4 | Soldi: cassa a movimenti, acconti, metodi, spese, promemoria | saldi = foglio attuale |
| 5 | Foto e messaggi | prova su iPhone e Android |
| 6 | Mercatini: eventi, checklist, modalità banco, riepilogo | vendita in ≤ 3 tocchi |
| 7 | Magazzino: scorte, soglie, lista Da comprare | soglia → voce in lista |
| 8 | Statistiche, divisione utili, export, catalogo pubblico | numeri = foglio |
| 9 | Import foglio attuale, backup mensile, guida | import senza righe perse |

## Decision log
| Decisione | Scelta | Perché |
|---|---|---|
| DB | Google Sheet via Apps Script, account Menta Peperita | gratis, stabile, dati sul vostro Drive |
| Hosting | GitHub Pages, org `menta-peperita`, repo `menta-peperita.github.io` | gratis, URL stabile (serve al login Google) |
| Auth | ID token Google verificato dall'API + email nel foglio Utenti | nessun segreto nel frontend |
| Chiamate API | POST text/plain | evita il preflight CORS di Apps Script |
| Riferimenti utente | per id, non per nome | rinominare non rompe lo storico |
| Animazioni | `web/src/motion.css` + `<Transition>` Vue, solo transform/opacity | fluide, rispettano "riduci movimento" |
| Messaggi Instagram | copia testo negli appunti + menu di condivisione con la foto; l'utente sceglie chat e incolla | Instagram ignora il testo condiviso e non accetta messaggi precompilati dal web |
| Commit | autore "Menta Peperita" | nessuna email personale pubblica |
| Versioni npm | fissate, pubblicate da ≥ 14 giorni | sicurezza supply chain |

## Sempre / Mai
- Sempre: costo zero; dati solo su Sheet/Drive; chi ha fatto cosa registrato; animazioni da `motion.css` su ogni schermata.
- Mai: pagamenti online, offline completo, chiavi o dati nel repository.

## Avanzamento
| Fase | Stato |
|---|---|
| 0 | completata: login PC e telefono, API, Pages; Instagram via appunti |
