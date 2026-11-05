<script setup>
defineProps({ nome: { type: String, required: true }, size: { type: Number, default: 22 } })
const P = {
  ordini: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h4"/>',
  prodotti: '<path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
  cassa: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.2"/>',
  mercatini: '<path d="M4 9l2-5h12l2 5M4 9v11h16V9M4 9h16M9 20v-6h6v6"/>',
  spese: '<path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  statistiche: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  utenti: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c1-3.5 3.8-5.5 7-5.5s6 2 7 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2 .7 3.4 2.6 4 5.5"/>',
  attivita: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  altro: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  esci: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/>',
  matita: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  piu: '<path d="M12 5v14M5 12h14"/>',
  chiudi: '<path d="M6 6l12 12M18 6L6 18"/>'
}
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" v-html="P[nome]"></svg>
</template>
