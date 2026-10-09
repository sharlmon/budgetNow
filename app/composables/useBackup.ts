const LAST_KEY = 'budgetnow:last-backup'
export const lastBackup = ref<string | null>(null)
if (import.meta.client) {
  try { lastBackup.value = localStorage.getItem(LAST_KEY) } catch { /* ignore */ }
}

export function useBackup() {
  const { state } = useBudget()
  const { adoptRevs } = useSync()

  const hasData = computed(() => state.value.incomes.length + state.value.expenses.length + state.value.debts.length + state.value.goals.length + state.value.bills.length > 0)
  const daysSince = computed(() => (lastBackup.value ? Math.floor((Date.now() - new Date(lastBackup.value).getTime()) / 86400000) : null))
  /** Gentle nudge: you have data, and it's never been backed up or the last backup is over 30 days old. */
  const needsBackup = computed(() => hasData.value && state.value.incomes.length + state.value.expenses.length >= 3 && (daysSince.value === null || daysSince.value > 30))

  function exportBackup() {
    const blob = new Blob([JSON.stringify(buildBackup(state.value, currency.value, userName.value, splitRule.value), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `budgetnow-backup-${today()}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    lastBackup.value = new Date().toISOString()
    try { localStorage.setItem(LAST_KEY, lastBackup.value) } catch { /* ignore */ }
    showToast('Backup saved to your downloads')
  }

  async function importFile(file: File) {
    if (file.size > MAX_BACKUP_BYTES) { alert('That file is too large to be a BudgetNow backup.'); return }
    const res = parseBackup(await file.text())
    if (!res.ok) { alert(res.error); return }
    const d = res.data
    const when = res.exportedAt ? ` from ${new Date(res.exportedAt).toLocaleDateString()}` : ''
    const summary = `${d.incomes.length} income, ${d.expenses.length} expenses, ${d.debts.length} debts, ${d.goals.length} goals, ${d.bills.length} bills`
    const skipNote = res.skipped ? `\n\n${res.skipped} unreadable record${res.skipped === 1 ? ' was' : 's were'} skipped.` : ''
    if (!confirm(`Replace everything in the app with this backup${when}?\n\n${summary}${skipNote}\n\nYou can undo right after.`)) return
    const snapshot = JSON.parse(JSON.stringify(state.value))
    const prevCurrency = currency.value, prevName = userName.value, prevSplit = { ...splitRule.value }
    state.value = adoptRevs(d) as typeof d
    if (res.currency) currency.value = res.currency
    if (res.name !== undefined && res.name) userName.value = res.name
    if (res.split) splitRule.value = res.split
    showToast('Backup restored', () => { state.value = snapshot; currency.value = prevCurrency; userName.value = prevName; splitRule.value = prevSplit })
  }

  return { hasData, daysSince, needsBackup, exportBackup, importFile }
}
