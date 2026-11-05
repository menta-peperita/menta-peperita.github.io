<script setup>
defineProps({ modelValue: [String, Number, Boolean], opzioni: Array, wrap: Boolean })
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="seg" :class="{ wrap }" role="group">
    <button v-for="o in opzioni" :key="String(o.value)" type="button" :aria-pressed="modelValue === o.value" @click="emit('update:modelValue', o.value)">{{ o.label }}</button>
  </div>
</template>
