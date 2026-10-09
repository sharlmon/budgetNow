<template>
  <div class="center"><SignUp :appearance="appearance" /></div>
</template>

<script setup lang="ts">
import { clerkVariables } from '../../utils/theme'
definePageMeta({ layout: 'auth' })
useHead({ title: 'Create account · BudgetNow' })
const appearance = computed(() => ({ variables: clerkVariables(activeTheme.value) })) // follows Light / Dark
</script>

<style scoped>
.center { display:flex; justify-content:center; }
</style>
