<template>
  <Seg :model-value="current" :options="[{ value: 'goals', label: 'Goals' }, { value: 'debts', label: 'Debts' }]" @update:model-value="v => navigateTo('/' + v)" />
</template>

<script setup lang="ts">
const route = useRoute()
const current = computed(() => (route.path.startsWith('/debts') ? 'debts' : 'goals'))
</script>
