// People who already use BudgetNow on this device should land in the app, not on the marketing page.

export const LAST_USER_KEY = 'bn:lastUser'

/**
 * Runs in the page <head> before the landing page paints. If this device has a signed-in user on record
 * (cleared on sign-out and account deletion) the home page "/" is swapped for the dashboard straight away,
 * instead of waiting for the sign-in service to load. Add ?landing to the address to see the public page anyway.
 * If the session has actually expired, the app sends the person on to the sign-in form.
 */
export const ENTRY_BOOT_SCRIPT = `(function(){try{if(location.pathname==='/'&&location.search.indexOf('landing')<0&&localStorage.getItem('${LAST_USER_KEY}')){location.replace('/home')}}catch(e){}})()`
