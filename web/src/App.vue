<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'
import { token, isValid, initLogin, logout } from './auth'
import { call } from './api'

const btn = ref(null)
const me = ref(null)
const error = ref('')
const loading = ref(false)
const photo = ref(null)
const shareResult = ref('')
const canShareFiles = ref(false)
let toastTimer

async function loadMe() {
  if (!isValid()) return
  loading.value = true
  error.value = ''
  try { me.value = await call('whoami') }
  catch (e) { error.value = e.message; me.value = null }
  finally { loading.value = false }
}

async function startLogin() {
  await nextTick()
  try { await initLogin(btn.value) } catch (e) { error.value = e.message }
}

function onPhoto(e) {
  photo.value = e.target.files?.[0] || null
  canShareFiles.value = !!(photo.value && navigator.canShare?.({ files: [photo.value] }))
}

async function share() {
  const text = 'Ciao! Il tuo ordine Menta Peperita è pronto.'
  shareResult.value = ''
  try {
    if (photo.value && canShareFiles.value) {
      await navigator.share({ files: [photo.value], text })
      shareResult.value = 'Condivisione con foto: OK'
    } else if (navigator.share) {
      await navigator.share({ text })
      shareResult.value = 'Condivisione solo testo: OK'
    } else {
      window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener')
      shareResult.value = 'Menu di condivisione non disponibile: aperto WhatsApp con il testo'
    }
  } catch (e) {
    shareResult.value = e.name === 'AbortError' ? 'Condivisione annullata' : 'Errore: ' + e.message
  }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { shareResult.value = '' }, 3500)
}

function exit() { logout(); me.value = null; startLogin() }

watch(token, loadMe)
onMounted(() => { if (isValid()) loadMe(); else startLogin() })
</script>

<template>
  <main class="page">
    <h1 class="logo">Menta P<span class="mirror"><span class="sway">E</span></span>perita</h1>

    <Transition name="page" mode="out-in">
      <section v-if="!me" key="login" class="card center">
        <img src="/icon-192.png" alt="" width="120" height="120" class="breathe">
        <template v-if="loading">
          <div class="skeleton" style="width: 70%; height: 18px"></div>
          <div class="skeleton" style="width: 45%; height: 18px"></div>
        </template>
        <template v-else>
          <p>Accedi con il tuo account Google.</p>
          <div ref="btn"></div>
        </template>
        <Transition name="pop">
          <p v-if="error" :key="error" class="error shake" role="alert">{{ error }}</p>
        </Transition>
      </section>

      <div v-else key="home" class="stagger col">
        <section class="card">
          <h2>Ciao {{ me.nome }}</h2>
          <p class="muted">{{ me.email }} · {{ me.ruolo }}</p>
          <button class="btn ghost" @click="exit">Esci</button>
        </section>

        <section class="card">
          <h2>Prova foto e condivisione</h2>
          <label class="btn ghost file">
            Scatta foto
            <input type="file" accept="image/*" capture="environment" @change="onPhoto">
          </label>
          <Transition name="pop" mode="out-in">
            <p :key="photo ? 'si' : 'no'" class="muted">{{ photo ? 'Foto pronta · condivisione con foto ' + (canShareFiles ? 'supportata' : 'NON supportata') : 'Nessuna foto' }}</p>
          </Transition>
          <button class="btn" @click="share">Condividi</button>
        </section>
      </div>
    </Transition>

    <Transition name="toast">
      <p v-if="shareResult" :key="shareResult" class="toast" role="status">{{ shareResult }}</p>
    </Transition>
  </main>
</template>
