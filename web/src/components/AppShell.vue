<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { sezioni } from '../router'
import { me, esci } from '../session'
import { iniziali } from '../utenti'
import Icona from './Icona.vue'

const route = useRoute()
const versione = __VERSIONE__
const altroAperto = ref(false)
const principali = sezioni.filter((s) => s.principale)
const altre = sezioni.filter((s) => !s.principale)
const altroAttivo = computed(() => altre.some((s) => route.path.startsWith(s.path)))
watch(() => route.path, () => { altroAperto.value = false })
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <RouterLink to="/ordini" class="logo small">Menta P<span class="mirror"><span class="sway">E</span></span>perita</RouterLink>
      <nav class="side-nav" aria-label="Sezioni">
        <RouterLink v-for="s in sezioni" :key="s.path" :to="s.path" class="side-link tap">
          <Icona :nome="s.icona" /> {{ s.nome }}
        </RouterLink>
      </nav>
      <small class="muted versione">Versione {{ versione }}</small>
      <div class="side-user">
        <span class="avatar">{{ iniziali(me.nome) }}</span>
        <span class="side-user-txt"><strong>{{ me.nome }}</strong><small>{{ me.ruolo }}</small></span>
        <button class="icon-btn" aria-label="Esci" title="Esci" @click="esci"><Icona nome="esci" /></button>
      </div>
    </aside>

    <header class="topbar">
      <RouterLink to="/ordini" class="logo small">Menta P<span class="mirror"><span class="sway">E</span></span>perita</RouterLink>
      <RouterLink to="/utenti" class="avatar" :aria-label="'Utente ' + me.nome">{{ iniziali(me.nome) }}</RouterLink>
    </header>

    <main class="content">
      <RouterView v-slot="{ Component, route: r }">
        <Transition name="page" mode="out-in">
          <component :is="Component" :key="r.path" />
        </Transition>
      </RouterView>
    </main>

    <nav class="tabbar" aria-label="Sezioni">
      <RouterLink v-for="s in principali" :key="s.path" :to="s.path" class="tab">
        <Icona :nome="s.icona" /><span>{{ s.nome }}</span>
      </RouterLink>
      <button class="tab" :class="{ 'router-link-active': altroAttivo }" :aria-expanded="altroAperto" @click="altroAperto = !altroAperto">
        <Icona nome="altro" /><span>Altro</span>
      </button>
    </nav>

    <Transition name="fade">
      <div v-if="altroAperto" class="backdrop" @click="altroAperto = false"></div>
    </Transition>
    <Transition name="sheet">
      <div v-if="altroAperto" class="sheet" role="dialog" aria-label="Altre sezioni">
        <RouterLink v-for="s in altre" :key="s.path" :to="s.path" class="sheet-link tap">
          <Icona :nome="s.icona" /> {{ s.nome }}
        </RouterLink>
        <button class="sheet-link tap danger" @click="esci"><Icona nome="esci" /> Esci</button>
        <small class="muted versione">Versione {{ versione }}</small>
      </div>
    </Transition>
  </div>
</template>
