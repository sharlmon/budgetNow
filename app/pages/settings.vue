<template>
  <div>
    <div class="hdr"><NuxtLink to="/" class="circ" aria-label="Back">‹</NuxtLink><h1>Settings</h1></div>
    <div class="card white" style="margin-bottom:12px">
      <label class="muted sm">Your name</label>
      <input v-model="name" class="field" placeholder="What should we call you?" style="margin-top:6px" />
    </div>
    <div class="card white" style="margin-bottom:12px">
      <label class="muted sm">Currency</label>
      <select v-model="cur" class="field" style="margin-top:6px"><option v-for="c in currencies" :key="c" :value="c">{{ c }}</option></select>
    </div>
    <div class="card white" style="margin-bottom:12px">
      <strong>Your data</strong>
      <p class="muted sm">Everything is stored privately in this browser only. Clearing site data erases it.</p>
      <button class="btn soft" @click="erase">Erase all data</button>
    </div>
    <p class="muted sm" style="text-align:center">BudgetNow · <a class="link" href="https://github.com/sharlmon/budgetNow" target="_blank">GitHub</a></p>
  </div>
</template>

<script setup lang="ts">
const { resetAll } = useBudget()
const currencies = ['USD', 'EUR', 'GBP', 'ZAR', 'NGN', 'KES', 'GHS', 'INR', 'CAD', 'AUD', 'JPY', 'AED']
const cur = computed({ get: () => currency.value, set: (v: string) => { currency.value = v } })
const name = computed({ get: () => userName.value, set: (v: string) => { userName.value = v } })
function erase() { if (confirm('Erase all income, expenses and debts? This cannot be undone.')) resetAll() }
</script>
