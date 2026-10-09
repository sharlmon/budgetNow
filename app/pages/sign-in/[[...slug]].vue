<template>
  <div class="center"><SignIn :appearance="appearance" /></div>
</template>

<script setup lang="ts">
import { clerkVariables } from '../../utils/theme'
definePageMeta({ layout: 'auth' })
useHead({ title: 'Sign in · BudgetNow' })
const appearance = computed(() => ({ variables: clerkVariables(activeTheme.value) })) // follows Light / Dark
</script>

<style scoped>
.center { display:flex; justify-content:center; }
</style>
