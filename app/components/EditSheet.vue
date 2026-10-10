<template>
  <Teleport to="body">
    <Transition name="es">
      <div v-if="ui.open && entry" class="scrim" @click.self="close">
        <div class="sheet" role="dialog" aria-modal="true" :aria-label="`Edit ${ui.kind}`" @keydown.esc="close">
          <button class="x" aria-label="Close" @click="close"><Icon name="x" :size="18" /></button>
          <h3>Edit {{ ui.kind }}</h3>

          <label class="muted sm" for="ed-label">{{ ui.kind === 'income' ? 'Label' : 'What was it for?' }}</label>
          <input id="ed-label" v-model="label" class="field" maxlength="120" />

          <label class="muted sm" for="ed-amount">Amount</label>
          <AmountInput id="ed-amount" v-model="amount" placeholder="0" />

          <label class="muted sm" for="ed-date">Date</label>
          <input id="ed-date" v-model="date" type="date" class="field" />

          <template v-if="ui.kind === 'expense' && !debtName">
            <span class="muted sm" id="ed-cat">Category</span>
            <div class="chips" role="group" aria-labelledby="ed-cat">
              <button v-for="c in cats" :key="c.key" :class="{ on: category === c.key }" :style="category === c.key ? { borderColor: c.color, background: c.color + '24' } : {}" :aria-pressed="category === c.key" @click="category = c.key"><Icon :name="c.icon" :size="16" :style="{ color: c.color }" /> {{ c.label }}</button>
            </div>
          </template>

          <template v-if="state.accounts.length">
            <label class="muted sm" for="ed-acct">{{ ui.kind === 'income' ? 'Went into' : 'Paid from' }}</label>
            <select id="ed-acct" v-model="accountId" class="field">
              <option value="">No account</option>
              <option v-for="a in state.accounts" :key="a.id" :value="a.id">{{ a.name }} · {{ money(a.balance) }}</option>
            </select>
          </template>

          <p v-if="debtName" class="note">This is a payment towards {{ debtName }}. Changing the amount adjusts what is left on that debt.</p>
          <p v-if="ui.kind === 'income' && amountChanged" class="note">The split will scale to the new amount, keeping the same proportions.</p>
          <p v-if="error" class="err" role="alert">{{ error }}</p>

          <button class="btn" :disabled="!canSave" @click="save">Save changes</button>
          <button class="del" @click="remove"><Icon name="trash" :size="16" /> Delete this {{ ui.kind }}</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const ui = useEditSheet()
const { state, updateExpense, updateIncome, removeExpense, removeIncome } = useBudget()
const cats = CATEGORIES.filter(c => c.key !== 'debt')

const entry = computed(() => (ui.value.kind === 'expense' ? state.value.expenses.find(e => e.id === ui.value.id) : state.value.incomes.find(i => i.id === ui.value.id)))
const debtName = computed(() => { const e = entry.value as Expense | undefined; return ui.value.kind === 'expense' && e?.debtId ? state.value.debts.find(d => d.id === e.debtId)?.name ?? 'a debt' : '' })

const label = ref(''); const amount = ref(0); const date = ref(''); const category = ref<Category>('needs'); const accountId = ref(''); const error = ref('')
watch(() => [ui.value.open, ui.value.id] as const, ([open]) => {
  const e = entry.value
  if (!open || !e) return
  label.value = e.label; amount.value = e.amount; date.value = e.date; accountId.value = e.accountId ?? ''
  category.value = ui.value.kind === 'expense' ? (e as Expense).category : 'needs'
  error.value = ''
}, { immediate: true })

const amountChanged = computed(() => !!entry.value && amount.value > 0 && Math.round(amount.value * 100) !== Math.round(entry.value.amount * 100))
const changed = computed(() => {
  const e = entry.value
  if (!e) return false
  return label.value !== e.label || amountChanged.value || date.value !== e.date || accountId.value !== (e.accountId ?? '') || (ui.value.kind === 'expense' && category.value !== (e as Expense).category)
})
const canSave = computed(() => changed.value && amount.value > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date.value))

const close = () => { ui.value.open = false }
function save() {
  if (!canSave.value) return
  const patch = { label: label.value.trim(), amount: amount.value, date: date.value, accountId: accountId.value }
  const res = ui.value.kind === 'expense' ? updateExpense(ui.value.id, { ...patch, category: category.value }) : updateIncome(ui.value.id, patch)
  if ('error' in res) { error.value = res.error; return }
  const name = label.value.trim() || (ui.value.kind === 'income' ? 'Income' : catMeta(category.value).label)
  close()
  showToast(`${name} updated`, res.undo)
}
function remove() {
  const e = entry.value
  if (!e) return
  const name = e.label || (ui.value.kind === 'income' ? 'Income' : 'Expense')
  const undo = ui.value.kind === 'expense' ? removeExpense(e.id) : removeIncome(e.id)
  close()
  showToast(`${name} removed`, undo)
}
</script>

<style scoped>
.scrim { position:fixed; inset:0; z-index:90; background:rgba(15,15,25,.5); display:flex; align-items:flex-end; justify-content:center; }
.sheet { position:relative; width:100%; max-width:480px; max-height:92dvh; overflow:auto; background:var(--surface); border-radius:28px 28px 0 0; padding:26px 20px calc(24px + env(safe-area-inset-bottom)); display:flex; flex-direction:column; gap:10px; }
.x { position:absolute; top:12px; right:12px; width:44px; height:44px; border-radius:50%; border:0; background:var(--soft); color:var(--muted); display:grid; place-items:center; cursor:pointer; }
h3 { margin:0; font-size:1.2rem; padding-right:48px; text-transform:capitalize; }
label { margin-top:4px; }
.chips { display:flex; gap:8px; flex-wrap:wrap; }
.chips button { display:inline-flex; align-items:center; gap:7px; min-height:44px; background:var(--card); color:var(--ink); border:1.5px solid transparent; border-radius:99px; padding:0 14px; font:inherit; font-size:.85rem; font-weight:500; cursor:pointer; }
.note { margin:0; padding:10px 12px; border-radius:12px; background:var(--soft); color:var(--ink2); font-size:.84rem; line-height:1.5; }
.err { margin:0; color:var(--bad); font-weight:600; font-size:.85rem; }
.btn { margin-top:6px; }
.del { display:flex; align-items:center; justify-content:center; gap:8px; min-height:48px; background:none; border:0; color:var(--bad); font:inherit; font-weight:600; cursor:pointer; }
.es-enter-active, .es-leave-active { transition:opacity .2s; } .es-enter-active .sheet { animation:up .32s var(--ease); } .es-enter-from, .es-leave-to { opacity:0; }
@keyframes up { from { transform:translateY(40px); } }
@media (prefers-reduced-motion: reduce) { .es-enter-active .sheet { animation:none; } }
</style>
