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
  chiudi: '<path d="M6 6l12 12M18 6L6 18"/>',
  impostazioni: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  foto: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  whatsapp: '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7L4 20z"/><path d="M9 9.5c.3 2 2.5 4.2 4.5 4.5l1-1.2 2 .9c-.2 1.3-1.3 2-2.5 1.8C11 15 9 13 8.5 10.5c-.2-1.2.5-2.3 1.8-2.5l.9 2-1.2 1"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8"/>',
  telefono: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  indietro: '<path d="M15 6l-6 6 6 6"/>',
  cestino: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  copia: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>'
}
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" v-html="P[nome]"></svg>
</template>
