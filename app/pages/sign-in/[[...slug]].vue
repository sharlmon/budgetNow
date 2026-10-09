<template>
  <div class="center"><SignIn :appearance="appearance" /></div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })
useHead({ title: 'Sign in · BudgetNow' })
const appearance = { variables: { colorPrimary: '#ef6a3a', borderRadius: '0.9rem', fontFamily: 'Inter, system-ui, sans-serif' } }
</script>

<style scoped>
.center { display:flex; justify-content:center; }
</style>
