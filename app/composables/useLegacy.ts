// Data saved by the earlier, on-device-only version of the app (before accounts).
const LEGACY_KEY = 'budgetnow:v1'
const DISMISSED = 'bn:legacy-dismissed'

export function useLegacy() {
  const { state } = useBudget()
  const { adoptRevs } = useSync()
  const found = useState<{ counts: string; raw: string } | null>('legacy', () => null)
  const dismissed = useState('legacy-dismissed', () => false)

  function detect() {
    if (!import.meta.client) return
    try {
      dismissed.value = localStorage.getItem(DISMISSED) === '1'
      const raw = localStorage.getItem(LEGACY_KEY)
      if (!raw) { found.value = null; return }
      const res = parseBackup(raw)
      if (!res.ok) { found.value = null; return }
      const d = res.data
      const n = d.incomes.length + d.expenses.length + d.debts.length + d.goals.length + d.bills.length
      found.value = n ? { raw, counts: `${d.incomes.length} income, ${d.expenses.length} expenses, ${d.debts.length} debts, ${d.goals.length} goals, ${d.bills.length} bills` } : null
    } catch { found.value = null }
  }

  function importNow() {
    if (!found.value) return
    const res = parseBackup(found.value.raw)
    if (!res.ok) return
    const has = state.value.incomes.length + state.value.expenses.length + state.value.debts.length + state.value.goals.length + state.value.bills.length > 0
    if (has && !confirm('This replaces what is currently in your account with the data from this device. Continue?')) return
    const snapshot = JSON.parse(JSON.stringify(state.value))
    state.value = adoptRevs(res.data) as typeof res.data
    try {
      const cur = localStorage.getItem('budgetnow:currency'), name = localStorage.getItem('budgetnow:name')
      if (cur && /^[A-Z]{3}$/.test(cur)) currency.value = cur
      if (name && !userName.value) userName.value = name.slice(0, 40)
    } catch { /* ignore */ }
    try { ['budgetnow:v1', 'budgetnow:currency', 'budgetnow:name', DISMISSED].forEach(k => localStorage.removeItem(k)) } catch { /* ignore */ }
    found.value = null
    showToast('Imported from this device', () => { state.value = snapshot })
  }

  function dismiss() {
    dismissed.value = true
    try { localStorage.setItem(DISMISSED, '1') } catch { /* ignore */ }
  }

  return { found, dismissed, detect, importNow, dismiss }
}
