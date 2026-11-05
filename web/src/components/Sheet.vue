<script setup>
import Icona from './Icona.vue'
defineProps({ open: Boolean, titolo: String })
const emit = defineEmits(['close'])
</script>

<template>
  <Teleport to="body">
    <Transition name="fade"><div v-if="open" class="backdrop" @click="emit('close')"></div></Transition>
    <Transition name="sheet">
      <div v-if="open" class="sheet form" role="dialog" :aria-label="titolo">
        <div class="head-row">
          <h2>{{ titolo }}</h2>
          <button type="button" class="icon-btn" aria-label="Chiudi" @click="emit('close')"><Icona nome="chiudi" /></button>
        </div>
        <slot />
      </div>
    </Transition>
  </Teleport>
</template>
