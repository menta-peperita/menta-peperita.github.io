<script setup>
defineProps({ titolo: String, fase: Number })
</script>

<template>
  <section class="page-in">
    <h1 class="title">{{ titolo }}</h1>
    <div class="card center empty stagger">
      <img src="/icon-192.png" alt="" width="96" height="96" class="breathe">
      <p><strong>In arrivo</strong></p>
      <p class="muted">Questa sezione arriva con la fase {{ fase }} dello sviluppo.</p>
    </div>
  </section>
</template>
