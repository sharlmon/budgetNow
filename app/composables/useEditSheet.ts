// Which entry the edit sheet is showing.
export const useEditSheet = () => useState('editSheet', () => ({ open: false, kind: 'expense' as 'expense' | 'income', id: '' }))
