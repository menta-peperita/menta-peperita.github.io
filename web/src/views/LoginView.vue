<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { initLogin, setSessione } from '../auth'
import { call } from '../api'
import { me, loading, error } from '../session'
import Seg from '../components/Seg.vue'

const versione = __VERSIONE__
const btn = ref(null)
const errLogin = ref('')
const modo = ref('codice')
const email = ref(localStorage.getItem('mp_email') || '')
const codice = ref('')
const password = ref('')
const inviato = ref(false)
const occupato = ref(false)
const info = ref('')
const dispositivo = navigator.userAgent.slice(0, 120)

onMounted(async () => {
  await nextTick()
  try { await initLogin(btn.value) } catch (e) { errLogin.value = e.message }
})

function entra(r) {
  try { localStorage.setItem('mp_email', email.value.trim()) } catch {}
  setSessione(r.sessione)
  me.value = r.utente
}

async function esegui(fn) {
  errLogin.value = ''
  info.value = ''
  occupato.value = true
  try { await fn() } catch (e) { errLogin.value = e.message } finally { occupato.value = false }
}
const inviaCodice = () => esegui(async () => {
  await call('auth.codice.invia', { email: email.value })
  inviato.value = true
  info.value = 'Se ' + email.value.trim() + ' \u00e8 tra gli utenti, ti \u00e8 arrivato un codice (controlla anche lo spam).'
})
const verifica = () => esegui(async () => entra(await call('auth.codice.verifica', { email: email.value, codice: codice.value, dispositivo })))
const conPassword = () => esegui(async () => entra(await call('auth.password', { email: email.value, password: password.value, dispositivo })))
</script>

<template>
  <main class="login">
    <img src="/icon-512.png" alt="Menta Peperita" width="180" height="180" class="breathe">
    <section class="card login-card stagger">
      <template v-if="loading">
        <div class="skeleton" style="width: 70%; height: 18px"></div>
        <div class="skeleton" style="width: 45%; height: 18px"></div>
      </template>
      <template v-else>
        <div ref="btn" class="gbtn"></div>
        <div class="oppure"><span>oppure</span></div>
        <Seg v-model="modo" :opzioni="[{ value: 'codice', label: 'Codice via email' }, { value: 'password', label: 'Password' }]" />
        <label class="field"><span>Email</span>
          <input v-model="email" type="email" autocomplete="email" autocapitalize="none" placeholder="nome@esempio.it" @input="inviato = false">
        </label>

        <template v-if="modo === 'codice'">
          <Transition name="pop" mode="out-in">
            <button v-if="!inviato" key="invia" class="btn full" :disabled="occupato || !email.trim()" @click="inviaCodice">{{ occupato ? 'Invio\u2026' : 'Mandami il codice' }}</button>
            <form v-else key="verifica" class="form" @submit.prevent="verifica">
              <label class="field"><span>Codice di 6 cifre</span>
                <input v-model="codice" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" class="codice" placeholder="000000">
              </label>
              <button class="btn full" :disabled="occupato || codice.length < 6">{{ occupato ? 'Verifica\u2026' : 'Entra' }}</button>
              <button type="button" class="btn ghost full" :disabled="occupato" @click="inviaCodice">Mandamene un altro</button>
            </form>
          </Transition>
        </template>
        <form v-else class="form" @submit.prevent="conPassword">
          <label class="field"><span>Password</span><input v-model="password" type="password" autocomplete="current-password"></label>
          <button class="btn full" :disabled="occupato || !email.trim() || !password">{{ occupato ? 'Accesso\u2026' : 'Entra' }}</button>
          <small class="muted">Non hai ancora una password? Entra con il codice via email e impostala da Utenti.</small>
        </form>

        <Transition name="pop"><p v-if="info" :key="info" class="muted" role="status">{{ info }}</p></Transition>
      </template>
      <Transition name="pop">
        <p v-if="error || errLogin" :key="error || errLogin" class="error shake" role="alert">{{ error || errLogin }}</p>
      </Transition>
    </section>
    <small class="muted">Versione {{ versione }}</small>
  </main>
</template>