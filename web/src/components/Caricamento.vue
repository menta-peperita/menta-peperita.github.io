<script setup>
import { ref, watch } from 'vue'
import { inCorso, etichetta } from '../api'

// Compare solo se l'operazione dura piu' di 200 ms, per non lampeggiare sulle azioni veloci
const visibile = ref(false)
let t
watch(inCorso, (n) => {
  clearTimeout(t)
  if (n > 0) t = setTimeout(() => { visibile.value = true }, 200)
  else visibile.value = false
})
</script>

<template>
  <Transition name="fade">
    <div v-if="visibile" class="loader" role="status" aria-live="polite">
      <div class="loader-bar"><span></span></div>
      <Transition name="pop" mode="out-in"><p :key="etichetta" class="loader-pill"><span class="spinner" aria-hidden="true"></span>{{ etichetta }}</p></Transition>
    </div>
  </Transition>
</template>