<script setup>
defineProps({ testo: String })
</script>

<template>
  <div class="card center empty">
    <img src="/icon-192.png" alt="" width="72" height="72" class="breathe">
    <p class="muted">{{ testo }}</p>
    <slot />
  </div>
</template>
