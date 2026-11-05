<script setup>
import { toast } from '../toast'
</script>

<template>
  <Transition name="toast">
    <p v-if="toast" :key="toast.id" class="toast" :class="toast.tipo" role="status">{{ toast.msg }}</p>
  </Transition>
</template>
