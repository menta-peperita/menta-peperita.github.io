<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { utenti, caricaUtenti, salvaUtente, eliminaUtente, iniziali } from '../utenti'
import { me } from '../session'
import { notify } from '../toast'
import { call } from '../api'
import Icona from '../components/Icona.vue'

const loading = ref(true)
const errore = ref('')
const aperto = ref(false)
const salvando = ref(false)
const form = reactive({ id: '', nome: '', email: '', ruolo: 'Titolare', attivo: true })
const errori = ref({})
const puoGestire = computed(() => me.value.ruolo === 'Titolare')
const ordinati = computed(() => [...utenti.value].sort((a, b) => (b.attivo - a.attivo) || a.nome.localeCompare(b.nome, 'it')))
const isMe = computed(() => form.id && form.id === me.value.id)
const pw = reactive({ nuova: '', conferma: '', errore: '', salvando: false })
async function salvaPassword() {
  pw.errore = ''
  if (pw.nuova !== pw.conferma) { pw.errore = 'Le due password non coincidono'; return }
  pw.salvando = true
  try {
    await call('auth.imposta_password', { password: pw.nuova })
    me.value = { ...me.value, haPassword: true }
    pw.nuova = ''; pw.conferma = ''
    notify('Password impostata')
  } catch (e) { pw.errore = e.message } finally { pw.salvando = false }
}

onMounted(async () => {
  try { await caricaUtenti(true) } catch (e) { errore.value = e.message } finally { loading.value = false }
})

function apri(u) {
  Object.assign(form, u ? { ...u } : { id: '', nome: '', email: '', ruolo: 'Titolare', attivo: true })
  errori.value = {}
  aperto.value = true
}

async function elimina() {
  if (!confirm('Eliminare ' + form.nome + '? Si pu\u00f2 fare solo se non ha mai usato l\u2019app.')) return
  salvando.value = true
  try {
    await eliminaUtente(form.id)
    aperto.value = false
    notify(form.nome + ' eliminato')
  } catch (e) { notify(e.message, 'err') } finally { salvando.value = false }
}

async function salva() {
  salvando.value = true
  errori.value = {}
  try {
    const nuovo = !form.id
    const u = await salvaUtente({ ...form })
    if (u.id === me.value.id) me.value = { ...me.value, nome: u.nome, email: u.email }
    aperto.value = false
    notify(nuovo ? u.nome + ' aggiunto' : 'Modifiche salvate')
  } catch (e) {
    if (e.fields) errori.value = e.fields
    notify(e.message, 'err')
  } finally { salvando.value = false }
}
</script>

<template>
  <section>
    <div class="head-row">
      <h1 class="title">Utenti</h1>
      <button v-if="puoGestire" class="btn" @click="apri()"><Icona nome="piu" :size="18" /> Nuovo</button>
    </div>
    <p class="muted hint">Possono entrare solo le email elencate qui: con Google, con un codice via email o con la password. Per entrare con Google l&rsquo;email va aggiunta anche tra gli utenti di test di Google; per codice e password non serve.</p>

    <form class="card form" @submit.prevent="salvaPassword">
      <div class="head-row"><h2 class="h2">La tua password</h2><span class="badge" :class="me.haPassword ? 'ok' : ''">{{ me.haPassword ? 'Impostata' : 'Non impostata' }}</span></div>
      <small class="muted">Serve per entrare con email e password. Almeno 8 caratteri, con lettere e numeri.</small>
      <div class="grid2">
        <input v-model="pw.nuova" type="password" autocomplete="new-password" placeholder="Nuova password" aria-label="Nuova password">
        <input v-model="pw.conferma" type="password" autocomplete="new-password" placeholder="Ripeti" aria-label="Ripeti password">
      </div>
      <small v-if="pw.errore" class="error">{{ pw.errore }}</small>
      <button class="btn ghost" :disabled="pw.salvando || !pw.nuova">{{ me.haPassword ? 'Cambia password' : 'Imposta password' }}</button>
    </form>

    <div v-if="loading" class="col">
      <div v-for="i in 3" :key="i" class="skeleton" style="height: 64px"></div>
    </div>
    <p v-else-if="errore" class="error shake">{{ errore }}</p>
    <TransitionGroup v-else name="list" tag="ul" class="list">
      <li v-for="u in ordinati" :key="u.id" class="row card" :class="{ off: !u.attivo }">
        <span class="avatar">{{ iniziali(u.nome) }}</span>
        <span class="row-main">
          <strong>{{ u.nome }} <span v-if="u.id === me.id" class="badge">tu</span></strong>
          <small>{{ u.email }}</small>
        </span>
        <span class="badge" :class="u.attivo ? 'ok' : 'off'">{{ u.attivo ? u.ruolo : 'Disattivato' }}</span>
        <button v-if="puoGestire" class="icon-btn" :aria-label="'Modifica ' + u.nome" @click="apri(u)"><Icona nome="matita" :size="18" /></button>
      </li>
    </TransitionGroup>

    <Transition name="fade"><div v-if="aperto" class="backdrop" @click="aperto = false"></div></Transition>
    <Transition name="sheet">
      <form v-if="aperto" class="sheet form" @submit.prevent="salva" :aria-label="form.id ? 'Modifica utente' : 'Nuovo utente'">
        <div class="head-row">
          <h2>{{ form.id ? 'Modifica utente' : 'Nuovo utente' }}</h2>
          <button type="button" class="icon-btn" aria-label="Chiudi" @click="aperto = false"><Icona nome="chiudi" /></button>
        </div>
        <label class="field">
          <span>Nome</span>
          <input v-model="form.nome" type="text" autocomplete="off" :class="{ invalid: errori.nome }" required>
          <small v-if="errori.nome" class="error">{{ errori.nome }}</small>
        </label>
        <label class="field">
          <span>Email Google</span>
          <input v-model="form.email" type="email" autocapitalize="none" autocomplete="off" placeholder="nome@gmail.com" :class="{ invalid: errori.email }" required>
          <small v-if="errori.email" class="error">{{ errori.email }}</small>
        </label>
        <fieldset class="field">
          <legend>Ruolo</legend>
          <div class="seg">
            <button v-for="r in ['Titolare', 'Aiuto']" :key="r" type="button" :aria-pressed="form.ruolo === r" :disabled="isMe" @click="form.ruolo = r">{{ r }}</button>
          </div>
          <small class="muted">I titolari possono gestire gli utenti; l&rsquo;aiuto no.</small>
          <small v-if="errori.ruolo" class="error">{{ errori.ruolo }}</small>
        </fieldset>
        <label v-if="form.id" class="check">
          <input v-model="form.attivo" type="checkbox" :disabled="isMe"> Attivo (pu&ograve; entrare nell&rsquo;app)
        </label>
        <small v-if="errori.attivo" class="error">{{ errori.attivo }}</small>
        <button class="btn full" :disabled="salvando">{{ salvando ? 'Salvataggio\u2026' : 'Salva' }}</button>
        <button v-if="form.id && !isMe" type="button" class="btn ghost danger full" :disabled="salvando" @click="elimina">Elimina utente</button>
        <small v-if="form.id && !isMe" class="muted">Si pu&ograve; eliminare solo chi non ha mai fatto nulla nell&rsquo;app. Altrimenti disattivalo: non entra pi&ugrave;, ma lo storico resta.</small>
      </form>
    </Transition>
  </section>
</template>
