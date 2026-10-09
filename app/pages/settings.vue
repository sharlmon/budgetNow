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
    <div class="card white rise" style="margin-bottom:12px;--i:3">
      <div class="row"><span class="bk"><Icon name="shield" :size="20" /></span><div class="grow"><h2>Backup &amp; restore</h2><div class="muted sm">{{ lastText }}</div></div></div>
      <p class="muted sm" style="margin:12px 0 14px">Your data lives only in this browser. Save a backup file now and then, and keep it somewhere safe (email it to yourself or put it in cloud storage). You can restore it on any device.</p>
      <div class="row">
        <button class="btn" :disabled="!hasData" @click="exportBackup"><Icon name="download" :size="17" /> Export</button>
        <button class="btn soft" @click="picker?.click()"><Icon name="upload" :size="17" /> Restore</button>
      </div>
      <input ref="picker" type="file" accept="application/json,.json" hidden @change="onPick" />
    </div>
    <div class="card white rise" style="margin-bottom:16px;--i:4">
      <h2>Erase data</h2>
      <p class="muted sm" style="margin:6px 0 14px">Removes all income, expenses, debts and goals from this browser.</p>
      <button class="btn soft" @click="erase"><Icon name="trash" :size="16" /> Erase all data</button>
    </div>
    <p class="muted sm" style="text-align:center">BudgetNow · <a class="link" href="https://github.com/sharlmon/budgetNow" target="_blank">GitHub</a></p>
  </div>
</template>

<script setup lang="ts">
const { resetAll } = useBudget()
const { hasData, daysSince, exportBackup, importFile } = useBackup()
const picker = ref<HTMLInputElement>()
const lastText = computed(() => (daysSince.value === null ? 'Never backed up' : daysSince.value === 0 ? 'Last backup: today' : `Last backup: ${daysSince.value} day${daysSince.value === 1 ? '' : 's'} ago`))
async function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  input.value = ''
  if (f) await importFile(f)
}
const currencies = ['USD', 'EUR', 'GBP', 'ZAR', 'NGN', 'KES', 'GHS', 'INR', 'CAD', 'AUD', 'JPY', 'AED']
const cur = computed({ get: () => currency.value, set: (v: string) => { currency.value = v } })
const name = computed({ get: () => userName.value, set: (v: string) => { userName.value = v } })
function erase() { if (confirm('Erase all income, expenses and debts? This cannot be undone.')) { resetAll(); showToast('All data erased') } }
</script>

<style scoped>
.bk { width:42px; height:42px; border-radius:14px; background:#e6f6ee; color:var(--good); display:grid; place-items:center; flex:none; }
</style>
