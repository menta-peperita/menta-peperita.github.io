# Setup

## Dove sta cosa
| Cosa | Dove | Account |
|---|---|---|
| Codice | github.com/menta-peperita/menta-peperita.github.io | organizzazione GitHub |
| App pubblicata | https://menta-peperita.github.io | GitHub Pages |
| Login (Client ID) | Google Cloud, progetto `menta-peperita-handmade` | Menta Peperita |
| Database + API | Google Sheet `Menta Peperita DB` + Apps Script `Menta Peperita API` | Menta Peperita |

## Variabili GitHub (Settings > Secrets and variables > Actions > Variables)
- `VITE_API_URL` = URL `/exec` del deployment Apps Script
- `VITE_GOOGLE_CLIENT_ID` = Client ID OAuth

## Aggiornare l'API
1. Incolla il nuovo `apps-script/Code.gs` nell'editor Apps Script e salva.
2. Esegui il deployment > Gestisci deployment > matita > Versione: **Nuova versione**. L'URL resta uguale.

## Aggiungere un utente
Foglio `Utenti`: nuova riga `id | nome | email Google | ruolo | TRUE`, poi aggiungi la stessa email tra gli **Utenti di test** in Google Auth Platform.

## Sviluppo in locale
```powershell
cd web; copy .env.example .env   # compila i due valori
npm ci; npm run dev              # http://localhost:5173
```

## Test fase 0 (telefono)
- [x] Login dal PC: compare "Ciao …"
- [ ] Login dal telefono su https://menta-peperita.github.io
- [ ] "Scatta foto" apre la fotocamera
- [ ] "Condividi" con foto su iPhone: arrivano foto e testo su WhatsApp? E su Instagram?
- [ ] Stessa prova su Android
- [ ] Aggiungi a schermata Home: si apre a schermo intero con l'icona
