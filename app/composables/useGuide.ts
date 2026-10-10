import { guideProgress, guideSteps, guideVisible, nextStep } from '../utils/guide'

const KEY = (uid: string) => `bn:guide:hidden:${uid}`
const everSynced = ref(false) // true once the first sync of this session has finished

/** The setup guide: which steps are done, whether to show it, and hiding it (remembered per person on this device). */
export function useGuide() {
  const { state } = useBudget()
  const auth = useAppAuth()
  const dismissed = useState('guide-dismissed', () => false)

  const steps = computed(() => guideSteps({ accounts: state.value.accounts.length, incomes: state.value.incomes.length, bills: state.value.bills.length }))
  const progress = computed(() => guideProgress(steps.value))
  const visible = computed(() => guideVisible({ steps: steps.value, dismissed: dismissed.value, synced: everSynced.value }))
  const next = computed(() => nextStep(steps.value))

  function hide() {
    dismissed.value = true
    const uid = auth.userId.value
    try { if (uid) localStorage.setItem(KEY(uid), '1') } catch { /* it just will not be remembered */ }
  }
  function show() {
    dismissed.value = false
    const uid = auth.userId.value
    try { if (uid) localStorage.removeItem(KEY(uid)) } catch { /* ignore */ }
  }
  return { steps, progress, visible, next, dismissed, hide, show }
}

/**
 * Keeps the guide's state in step with who is signed in and with syncing, and says so when the last step is done. Call it once from
 * the app layout, which stays mounted on every private screen, so finishing a step on any page counts.
 */
export function useGuideWatcher() {
  const { progress, dismissed } = useGuide()
  const auth = useAppAuth()
  if (!import.meta.client) return
  watch(() => auth.userId.value, (uid) => {
    everSynced.value = false
    try { dismissed.value = !!uid && localStorage.getItem(KEY(uid)) === '1' } catch { dismissed.value = false }
  }, { immediate: true })
  watch(syncStatus, (s) => { if (s === 'synced') everSynced.value = true }, { immediate: true })
  // Finishing the last step is worth a word.
  watch(() => progress.value.done === progress.value.total, (now, was) => {
    if (now && was === false && everSynced.value && !dismissed.value) showToast("You're all set. Nice start!")
  })
}
