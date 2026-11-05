<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { fotoUrl } from '../store'

// Le foto appena caricate su Drive hanno l'anteprima pronta dopo qualche secondo: riprova da sola.
const props = defineProps({ driveId: String, w: { type: Number, default: 600 }, alt: { type: String, default: '' } })
const tentativo = ref(0)
const caricata = ref(false)
let t
const src = computed(() => fotoUrl(props.driveId, props.w) + (tentativo.value ? '&r=' + tentativo.value : ''))
watch(() => props.driveId, () => { tentativo.value = 0; caricata.value = false })
function errore() {
  if (tentativo.value >= 8) return
  clearTimeout(t)
  t = setTimeout(() => { tentativo.value++ }, 2500)
}
onBeforeUnmount(() => clearTimeout(t))
</script>

<template>
  <span class="foto-img" :class="{ ok: caricata }">
    <img v-if="driveId" :key="src" :src="src" :alt="alt" loading="lazy" referrerpolicy="no-referrer" @load="caricata = true" @error="errore">
    <span v-if="!caricata" class="skeleton"></span>
  </span>
</template>