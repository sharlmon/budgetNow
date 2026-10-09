// Public pages anyone can open (also what search engines crawl). Everything else needs a signed-in user.
const OPEN = ['/', '/privacy', '/terms', '/guides']
const AUTH_PAGES = ['/sign-in', '/sign-up']
const under = (path: string, bases: string[]) => bases.some(b => path === b || path.startsWith(b + '/'))

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  const auth = useAppAuth()
  if (!auth.isLoaded.value) {
    await new Promise<void>((resolve) => {
      const stop = watch(auth.isLoaded, (v) => { if (v) { stop(); resolve() } }, { immediate: true })
    })
  }
  const isAuthPage = under(to.path, AUTH_PAGES)
  const isOpen = to.path === '/' || under(to.path, OPEN.filter(p => p !== '/')) || isAuthPage
  if (!auth.isSignedIn.value && !isOpen) return navigateTo('/sign-in')
  // Signed-in people go straight to their dashboard instead of the landing page or sign-in form.
  if (auth.isSignedIn.value && (to.path === '/' || isAuthPage)) return navigateTo('/home')
})
