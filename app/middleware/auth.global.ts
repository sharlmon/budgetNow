const PUBLIC = ['/sign-in', '/sign-up']

// Everything except the sign-in / sign-up pages needs a signed-in user.
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  const auth = useAppAuth()
  if (!auth.isLoaded.value) {
    await new Promise<void>((resolve) => {
      const stop = watch(auth.isLoaded, (v) => { if (v) { stop(); resolve() } }, { immediate: true })
    })
  }
  const isPublic = PUBLIC.some(p => to.path === p || to.path.startsWith(p + '/'))
  if (!auth.isSignedIn.value && !isPublic) return navigateTo('/sign-in')
  if (auth.isSignedIn.value && isPublic) return navigateTo('/')
})
