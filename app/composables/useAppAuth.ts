const LAST_USER = 'bn:lastUser'

/**
 * One place for "who is signed in". Wraps Clerk, plus two special cases:
 * - local dev with DEV_AUTH_BYPASS=1 (no Clerk keys needed)
 * - offline: Clerk can't load without a network, so if this device has a previously signed-in user we keep
 *   working from that user's local copy and sync once the connection (and Clerk) is back.
 */
export function useAppAuth() {
  const cfg = useRuntimeConfig().public
  if (cfg.devAuth) {
    return {
      isLoaded: ref(true), isSignedIn: ref(true), userId: ref<string | null>('dev-user'), offline: ref(false),
      firstName: ref('Dev'), fullName: ref('Dev user'), email: ref('dev@example.com'), imageUrl: ref(''), signOut: async () => {}, manageAccount: () => {},
    }
  }

  const { isLoaded, isSignedIn, userId } = useAuth()
  const { user } = useUser()
  const clerk = useClerk()
  const offline = useState('auth-offline', () => false)

  if (import.meta.client) {
    const last = () => { try { return localStorage.getItem(LAST_USER) } catch { return null } }
    if (!navigator.onLine && last()) offline.value = true
    // Clerk can't finish loading with no connection; after a few seconds fall back to the local copy.
    setTimeout(() => { if (!isLoaded.value && last()) offline.value = true }, 4000)
    watch(isLoaded, (v) => { if (v) offline.value = false })
    window.addEventListener('online', () => { offline.value = false })
  }

  const effectiveUser = computed<string | null>(() => {
    if (userId.value) return userId.value
    if (offline.value && import.meta.client) { try { return localStorage.getItem(LAST_USER) } catch { return null } }
    return null
  })

  return {
    isLoaded: computed(() => isLoaded.value || offline.value),
    isSignedIn: computed(() => !!isSignedIn.value || (offline.value && !!effectiveUser.value)),
    userId: effectiveUser,
    offline,
    firstName: computed(() => user.value?.firstName ?? ''),
    fullName: computed(() => user.value?.fullName ?? ''),
    email: computed(() => user.value?.primaryEmailAddress?.emailAddress ?? ''),
    imageUrl: computed(() => user.value?.imageUrl ?? ''),
    signOut: async () => { await clerk.value?.signOut() },
    manageAccount: () => { clerk.value?.openUserProfile() },
  }
}
