# Menta Peperita - gestionale

App per un piccolo laboratorio artigianale (ordini, prodotti, cassa, spese, mercatini). Costo zero, dati sul Google Drive dell'account Menta Peperita.
Lingua dell'interfaccia e dei messaggi: italiano. Utenti finali non tecnici.

## Architettura
- `web/` Vue 3 + Vite + vue-router, PWA. Pubblicata da GitHub Actions su https://menta-peperita.github.io (repo org `menta-peperita/menta-peperita.github.io`, branch `main`).
- `apps-script/Code.gs` API su Google Apps Script, collegata al Google Sheet "Menta Peperita DB" (account Menta Peperita). Un solo file.
- Chiamate: POST text/plain (niente preflight CORS). Accesso: ID token Google, oppure sessione 60 gg (codice via email o password).
- Database = un foglio per tabella (vedi `SCHEMA` in Code.gs). `setup()` aggiunge fogli/colonne mancanti e si puo' rieseguire.
- Logica di calcolo pura in `web/src/logic/calcoli.js`; logica pura API in testa a Code.gs.

## Comandi
```
cd web
npm ci
npm run dev     # http://localhost:5173 (serve web/.env con VITE_API_URL e VITE_GOOGLE_CLIENT_ID)
npm test        # test logica API + calcoli
npm run build
```

## Regole
- Versioni npm fissate, pubblicate da almeno 14 giorni.
- Animazioni solo da `web/src/motion.css` (transform/opacity), rispettare prefers-reduced-motion.
- Testi Vue: entita' HTML nei template, `\uXXXX` nelle stringhe JS (evita problemi di codifica su Windows).
- Riferimenti a utenti per id, mai per nome. Ruoli: Titolare / Aiuto.
- Ogni scrittura nell'API dentro `withLock_` e con `log_` (registro Attivita).
- Nomi classe CSS globali unici (un `.tab` duplicato ha gia' rotto la barra in basso).
- Commit con autore "Menta Peperita" e email noreply GitHub (gia' configurati nel repo).

## Rilascio (passaggi manuali)
1. Se cambia `apps-script/Code.gs` (o `appsscript.json`): incollarlo nell'editor Apps Script dell'account Menta Peperita, eseguire `setup` se cambia lo schema, poi Esegui il deployment > Gestisci deployment > matita > Nuova versione (l'URL resta lo stesso).
2. `git push` su `main`: GitHub Actions pubblica in ~2 minuti. La versione visibile nell'app e' il commit corto.

## Stato
Fasi 0-9 completate (vedi `plans/piano.md`). Ultime aggiunte: login codice/password, costi per prodotto e tempo misurato, indicatore di caricamento, galleria foto prodotto e carosello nel catalogo.