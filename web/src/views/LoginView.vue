<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { initLogin } from '../auth'
import { loading, error } from '../session'

const btn = ref(null)
const errLogin = ref('')
onMounted(async () => {
  await nextTick()
  try { await initLogin(btn.value) } catch (e) { errLogin.value = e.message }
})
</script>

<template>
  <main class="login">
    <img src="/icon-512.png" alt="Menta Peperita" width="200" height="200" class="breathe">
    <section class="card center stagger">
      <template v-if="loading">
        <div class="skeleton" style="width: 70%; height: 18px"></div>
        <div class="skeleton" style="width: 45%; height: 18px"></div>
      </template>
      <p v-show="!loading">Accedi con il tuo account Google.</p>
      <div v-show="!loading" ref="btn" class="gbtn"></div>
      <Transition name="pop">
        <p v-if="error || errLogin" :key="error || errLogin" class="error shake" role="alert">{{ error || errLogin }}</p>
      </Transition>
    </section>
  </main>
</template>
