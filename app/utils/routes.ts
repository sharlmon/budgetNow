// Which pages anyone can open. Everything else needs a signed-in person.
const OPEN = ['/privacy', '/terms', '/guides']
const AUTH_PAGES = ['/sign-in', '/sign-up']
const under = (path: string, bases: string[]) => bases.some(b => path === b || path.startsWith(b + '/'))

export const isAuthPage = (path: string) => under(path, AUTH_PAGES)
/** The landing page, legal pages, guides and the sign-in and sign-up forms. */
export const isOpenPath = (path: string) => path === '/' || under(path, OPEN) || isAuthPage(path)
/**
 * Pages where the answer to "is this person signed in?" must come from Clerk itself rather than from this device's memory
 * of the last user: the landing page and the sign-in forms decide where to send you.
 */
export const needsVerifiedSession = (path: string) => path === '/' || isAuthPage(path)
