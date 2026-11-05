<script setup>
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { me, loadMe } from './session'
import { carica, pronto } from './store'
import LoginView from './views/LoginView.vue'
import AppShell from './components/AppShell.vue'
import Toast from './components/Toast.vue'
import Caricamento from './components/Caricamento.vue'

const route = useRoute()
onMounted(loadMe)
watch(me, (u) => { if (u && !pronto.value) carica() })
</script>

<template>
  <RouterView v-if="route.meta.pubblica" />
  <Transition v-else name="page" mode="out-in">
    <AppShell v-if="me" key="app" />
    <LoginView v-else key="login" />
  </Transition>
  <Caricamento />
  <Toast />
</template>
