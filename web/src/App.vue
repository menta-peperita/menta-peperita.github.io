<script setup>
import { onMounted } from 'vue'
import { me, loadMe } from './session'
import LoginView from './views/LoginView.vue'
import AppShell from './components/AppShell.vue'
import Toast from './components/Toast.vue'

onMounted(loadMe)
</script>

<template>
  <Transition name="page" mode="out-in">
    <AppShell v-if="me" key="app" />
    <LoginView v-else key="login" />
  </Transition>
  <Toast />
</template>
