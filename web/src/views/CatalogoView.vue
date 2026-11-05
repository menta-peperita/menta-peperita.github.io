<script setup>
import { ref, onMounted } from 'vue'
import { call } from '../api'
import { euro, num, telefonoWa } from '../logic/calcoli'
import FotoImg from '../components/FotoImg.vue'

const dati = ref(null)
const errore = ref('')
const indice = ref({})
const zoom = ref(null)

onMounted(async () => {
  document.title = 'Catalogo \u00b7 Menta Peperita'
  try { dati.value = await call('catalogo') } catch (e) { errore.value = e.message }
})
function onScroll(e, nome) {
  const el = e.target
  indice.value = { ...indice.value, [nome]: Math.round(el.scrollLeft / el.clientWidth) }
}
function vai(e, i) {
  const c = e.target.closest('.carosello-wrap').querySelector('.carosello')
  c.scrollTo({ left: i * c.clientWidth, behavior: 'smooth' })
}
</script>

<template>
  <main class="catalogo">
    <header class="center-col">
      <img src="/icon-512.png" alt="Menta Peperita" width="150" height="150" class="breathe">
      <p class="muted">Fatto a mano e personalizzato per te</p>
    </header>
    <p v-if="errore" class="error">{{ errore }}</p>
    <div v-else-if="!dati" class="cat-grid"><div v-for="i in 4" :key="i" class="skeleton" style="aspect-ratio: 1"></div></div>
    <template v-else>
      <div class="cat-grid stagger">
        <article v-for="p in dati.prodotti" :key="p.nome" class="cat-item">
          <div v-if="(p.foto || []).length" class="carosello-wrap">
            <div class="carosello" @scroll.passive="onScroll($event, p.nome)">
              <button v-for="f in p.foto" :key="f" class="slide" :aria-label="'Ingrandisci foto di ' + p.nome" @click="zoom = f"><FotoImg :drive-id="f" :w="700" :alt="p.nome" /></button>
            </div>
            <div v-if="p.foto.length > 1" class="dots">
              <button v-for="(f, i) in p.foto" :key="f" :class="{ on: (indice[p.nome] || 0) === i }" :aria-label="'Foto ' + (i + 1)" @click="vai($event, i)"></button>
            </div>
          </div>
          <div v-else class="cat-img"></div>
          <strong>{{ p.nome }}</strong>
          <small v-if="p.descrizione" class="muted">{{ p.descrizione }}</small>
          <span class="pos">{{ num(p.prezzo) == null ? 'Prezzo su richiesta' : euro(p.prezzo) }}</span>
        </article>
      </div>
      <div class="card center contatti">
        <strong>Vuoi ordinare o personalizzare?</strong>
        <a v-if="dati.instagram" class="btn full" :href="'https://ig.me/m/' + dati.instagram.replace(/^@/, '')" target="_blank" rel="noopener">Scrivici su Instagram</a>
        <a v-if="dati.whatsapp" class="btn ghost full" :href="'https://wa.me/' + telefonoWa(dati.whatsapp)" target="_blank" rel="noopener">WhatsApp</a>
      </div>
    </template>
    <Transition name="fade">
      <div v-if="zoom" class="zoom" role="dialog" aria-label="Foto ingrandita" @click="zoom = null">
        <FotoImg :drive-id="zoom" :w="1400" />
      </div>
    </Transition>
  </main>
</template>