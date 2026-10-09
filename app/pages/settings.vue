<template>
  <div>
    <h1 style="margin-bottom:14px">Settings</h1>
    <div class="card" style="margin-bottom:12px">
      <label class="muted" style="font-size:.85rem">Currency</label>
      <select v-model="cur" class="field" style="margin-top:6px">
        <option v-for="c in currencies" :key="c" :value="c">{{ c }}</option>
      </select>
    </div>
    <div class="card" style="margin-bottom:12px">
      <strong>Your data</strong>
      <p class="muted" style="font-size:.9rem">Everything is stored privately in this browser only. Clearing site data erases it.</p>
      <button class="btn soft" @click="erase">Erase all data</button>
    </div>
    <p class="muted center" style="text-align:center;font-size:.8rem">BudgetNow · <a class="link" href="https://github.com/sharlmon/budgetNow" target="_blank">GitHub</a></p>
  </div>
</template>

<script setup lang="ts">
const { resetAll } = useBudget()
const cur = computed({ get: () => currency.value, set: (v: string) => { currency.value = v } })
const currencies = ['USD', 'EUR', 'GBP', 'ZAR', 'NGN', 'KES', 'GHS', 'INR', 'CAD', 'AUD', 'JPY', 'AED']
function erase() { if (confirm('Erase all income, expenses and debts? This cannot be undone.')) resetAll() }
</script>
