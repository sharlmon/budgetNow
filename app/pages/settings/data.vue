<template>
  <div>
    <SettingsHeader title="Backup and data" />
    <div class="card white rise" style="margin-bottom:12px;--i:1">
      <div class="row"><span class="bk"><Icon name="shield" :size="20" /></span><div class="grow"><h2>Backup &amp; restore</h2><div class="muted sm">{{ lastText }}</div></div></div>
      <p class="muted sm" style="margin:12px 0 14px">Your data is already saved to your account. You can also keep a file copy of your own, or restore one. A backup file is plain text, so store it somewhere private.</p>
      <div class="row">
        <button class="btn" :disabled="!hasData" @click="exportBackup"><Icon name="download" :size="17" /> Export</button>
        <button class="btn soft" @click="picker?.click()"><Icon name="upload" :size="17" /> Restore</button>
      </div>
      <input ref="picker" type="file" accept="application/json,.json" hidden @change="onPick" />
    </div>
    <div class="card white rise" style="margin-bottom:16px;--i:2">
      <h2>Erase data</h2>
      <p class="muted sm" style="margin:6px 0 14px">Permanently deletes all your income, expenses, debts, goals, bills and accounts from your account and every device.</p>
      <button class="btn soft" @click="erase"><Icon name="trash" :size="16" /> Erase all data</button>
    </div>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({ title: 'Backup and data' })
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
function erase() { if (confirm('Permanently erase all your data from your account and every device? This cannot be undone.')) { resetAll(); showToast('All data erased') } }
</script>

<style scoped>
.bk { width:42px; height:42px; border-radius:14px; background:var(--goodbg); color:var(--good); display:grid; place-items:center; flex:none; }
</style>
