// Which account sheets are open, and the "hide amounts" choice (remembered on this device only).
import type { AccountKind } from '../utils/accounts'
export interface AccountSheetState { open: boolean; id: string | null; /** A name and type to start from when adding. */ preset?: { name: string; kind: AccountKind } }
export const useAccountSheet = () => useState<AccountSheetState>('accountSheet', () => ({ open: false, id: null }))
export const useMoveSheet = () => useState('moveSheet', () => ({ open: false, from: '' }))

const HIDE_KEY = 'bn:hideAmounts'
export function useHideAmounts() {
  const hidden = useState('hideAmounts', () => { try { return localStorage.getItem(HIDE_KEY) === '1' } catch { return false } })
  const toggle = () => { hidden.value = !hidden.value; try { localStorage.setItem(HIDE_KEY, hidden.value ? '1' : '0') } catch { /* private mode: it just will not be remembered */ } }
  return { hidden, toggle }
}
