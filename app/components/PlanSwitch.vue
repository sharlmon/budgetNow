<template>
  <Seg :model-value="current" :options="[{ value: 'plan', label: 'Overview' }, { value: 'goals', label: 'Goals' }, { value: 'bills', label: 'Bills' }, { value: 'debts', label: 'Debts' }]" @update:model-value="v => navigateTo('/' + v)" />
</template>

<script setup lang="ts">
const route = useRoute()
const current = computed(() => (route.path.startsWith('/debts') ? 'debts' : route.path.startsWith('/bills') ? 'bills' : route.path.startsWith('/goals') ? 'goals' : 'plan'))
</script>
