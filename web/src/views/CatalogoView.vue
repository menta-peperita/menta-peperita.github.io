<script setup>
import { ref, onMounted } from 'vue'
import { call } from '../api'
import { fotoUrl } from '../store'
import { euro, num, telefonoWa } from '../logic/calcoli'

const dati = ref(null)
const errore = ref('')
onMounted(async () => {
  document.title = 'Catalogo \u00b7 Menta Peperita'
  try { dati.value = await call('catalogo') } catch (e) { errore.value = e.message }
})
</script>

<template>
  <main class="catalogo">
    <header class="center-col">
      <img src="/icon-512.png" alt="Menta Peperita" width="160" height="160" class="breathe">
      <p class="muted">Fatto a mano e personalizzato per te</p>
    </header>
    <p v-if="errore" class="error">{{ errore }}</p>
    <div v-else-if="!dati" class="cat-grid"><div v-for="i in 4" :key="i" class="skeleton" style="aspect-ratio: 1"></div></div>
    <template v-else>
      <div class="cat-grid stagger">
        <article v-for="p in dati.prodotti" :key="p.nome" class="cat-item">
          <div class="cat-img" :style="p.foto_id ? { backgroundImage: 'url(' + fotoUrl(p.foto_id, 600) + ')' } : null"></div>
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
  </main>
</template>
