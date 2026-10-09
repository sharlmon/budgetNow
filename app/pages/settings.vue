<template>
  <div>
    <div class="hdr rise"><NuxtLink to="/" class="circ" aria-label="Back"><Icon name="back" :size="22" /></NuxtLink><h1>Settings</h1></div>
    <div class="rise" style="margin-bottom:12px;--i:1"><InstallCard always /></div>
    <div class="card white rise" style="margin-bottom:12px;--i:1">
      <label class="muted sm" for="nm">Your name</label>
      <input id="nm" v-model="name" class="field" placeholder="What should we call you?" style="margin-top:8px" />
    </div>
    <div class="card white rise" style="margin-bottom:12px;--i:2">
      <label class="muted sm" for="cu">Currency</label>
      <select id="cu" v-model="cur" class="field" style="margin-top:8px"><option v-for="c in currencies" :key="c" :value="c">{{ c }}</option></select>
    </div>
    <div class="card white rise" style="margin-bottom:16px;--i:3">
      <h2>Your data</h2>
      <p class="muted sm" style="margin:6px 0 14px">Everything is stored privately in this browser only. Clearing site data erases it.</p>
      <button class="btn soft" @click="erase"><Icon name="trash" :size="16" /> Erase all data</button>
    </div>
    <p class="muted sm" style="text-align:center">BudgetNow · <a class="link" href="https://github.com/sharlmon/budgetNow" target="_blank">GitHub</a></p>
  </div>
</template>

<script setup lang="ts">
const { resetAll } = useBudget()
const currencies = ['USD', 'EUR', 'GBP', 'ZAR', 'NGN', 'KES', 'GHS', 'INR', 'CAD', 'AUD', 'JPY', 'AED']
const cur = computed({ get: () => currency.value, set: (v: string) => { currency.value = v } })
const name = computed({ get: () => userName.value, set: (v: string) => { userName.value = v } })
function erase() { if (confirm('Erase all income, expenses and debts? This cannot be undone.')) { resetAll(); showToast('All data erased') } }
</script>
