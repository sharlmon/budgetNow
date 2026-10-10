// Public pages anyone can open (also what search engines crawl). Everything else needs a signed-in user.
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  const auth = useAppAuth()
  // Private screens open straight from this device's saved copy while Clerk is still loading (see useAppAuth); pages that decide
  // where to send you (landing, sign-in) wait for Clerk's real answer.
  const ready = needsVerifiedSession(to.path) ? auth.isVerified : auth.isLoaded
  if (!ready.value) {
    await new Promise<void>((resolve) => {
      const stop = watch(ready, (v) => { if (v) { stop(); resolve() } }, { immediate: true })
    })
  }
  if (!auth.isSignedIn.value && !isOpenPath(to.path)) return navigateTo('/sign-in')
  // Signed-in people go straight to their dashboard instead of the landing page or sign-in form.
  if (auth.isSignedIn.value && needsVerifiedSession(to.path)) return navigateTo('/home')
})
