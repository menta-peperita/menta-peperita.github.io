import { createRouter, createWebHistory } from 'vue-router'

// principale = voce nella barra in basso su telefono; le altre stanno in "Altro"
export const sezioni = [
  { path: '/ordini', nome: 'Ordini', icona: 'ordini', principale: true },
  { path: '/prodotti', nome: 'Prodotti', icona: 'prodotti', principale: true },
  { path: '/cassa', nome: 'Cassa', icona: 'cassa', principale: true },
  { path: '/mercatini', nome: 'Mercatini', icona: 'mercatini', principale: true },
  { path: '/spese', nome: 'Spese', icona: 'spese' },
  { path: '/statistiche', nome: 'Statistiche', icona: 'statistiche' },
  { path: '/utenti', nome: 'Utenti', icona: 'utenti' },
  { path: '/attivita', nome: 'Attivit\u00e0', icona: 'attivita' },
  { path: '/impostazioni', nome: 'Impostazioni', icona: 'impostazioni' }
]

const v = (n) => () => import(`./views/${n}.vue`)
const routes = [
  { path: '/', redirect: '/ordini' },
  { path: '/ordini', component: v('OrdiniView') },
  { path: '/ordini/nuovo', component: v('OrdineEdit') },
  { path: '/ordini/:id', component: v('OrdineDettaglio') },
  { path: '/ordini/:id/modifica', component: v('OrdineEdit') },
  { path: '/prodotti', component: v('ProdottiView') },
  { path: '/cassa', component: v('CassaView') },
  { path: '/spese', component: v('SpeseView') },
  { path: '/mercatini', component: v('MercatiniView') },
  { path: '/mercatini/:id', component: v('EventoView') },
  { path: '/mercatini/:id/banco', component: v('BancoView') },
  { path: '/statistiche', component: v('StatisticheView') },
  { path: '/utenti', component: v('UtentiView') },
  { path: '/attivita', component: v('AttivitaView') },
  { path: '/impostazioni', component: v('ImpostazioniView') },
  { path: '/catalogo', component: v('CatalogoView'), meta: { pubblica: true } },
  { path: '/:pathMatch(.*)*', redirect: '/ordini' }
]

export default createRouter({ history: createWebHistory(), routes, scrollBehavior: () => ({ top: 0 }) })
