import { createRouter, createWebHistory } from 'vue-router'
import ProssimaFase from './views/ProssimaFase.vue'

// principale = voce nella barra in basso su telefono; le altre stanno in "Altro"
export const sezioni = [
  { path: '/ordini', nome: 'Ordini', icona: 'ordini', principale: true, fase: 3 },
  { path: '/prodotti', nome: 'Prodotti', icona: 'prodotti', principale: true, fase: 2 },
  { path: '/cassa', nome: 'Cassa', icona: 'cassa', principale: true, fase: 4 },
  { path: '/mercatini', nome: 'Mercatini', icona: 'mercatini', principale: true, fase: 6 },
  { path: '/spese', nome: 'Spese', icona: 'spese', fase: 4 },
  { path: '/statistiche', nome: 'Statistiche', icona: 'statistiche', fase: 8 },
  { path: '/utenti', nome: 'Utenti', icona: 'utenti' },
  { path: '/attivita', nome: 'Attivit\u00e0', icona: 'attivita' }
]

const routes = [
  { path: '/', redirect: '/ordini' },
  ...sezioni.filter((s) => s.fase).map((s) => ({ path: s.path, component: ProssimaFase, props: { titolo: s.nome, fase: s.fase } })),
  { path: '/utenti', component: () => import('./views/UtentiView.vue') },
  { path: '/attivita', component: () => import('./views/AttivitaView.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/ordini' }
]

export default createRouter({ history: createWebHistory(), routes, scrollBehavior: () => ({ top: 0 }) })
