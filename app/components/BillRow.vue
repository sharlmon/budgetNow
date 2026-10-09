<template>
  <div class="bill" :class="[tone, { compact }]">
    <div class="row">
      <CatIcon :cat="bill.category" :size="44" />
      <div class="grow">
        <strong class="nm">{{ bill.name }}</strong>
        <div class="sm st">{{ dueLabel }}</div>
        <small class="muted"><Icon name="repeat" :size="11" class="inl" /> {{ everyLabel }}<template v-if="bill.auto"> · Auto-log</template></small>
      </div>
      <div class="end">
        <strong>{{ money(bill.amount) }}</strong>
        <button v-if="compact" class="btn sm paybtn" @click="pay"><Icon name="check" :size="15" :stroke="2.8" /> Pay</button>
        <button v-else class="icon-btn chev" :aria-label="open ? 'Hide details' : 'Show details'" @click="open = !open"><Icon :name="open ? 'up' : 'down'" :size="16" /></button>
      </div>
    </div>

    <template v-if="!compact">
      <div v-if="open || soon" class="row acts">
        <button class="btn sm" @click="pay"><Icon name="check" :size="16" :stroke="2.8" /> {{ days > 7 ? 'Pay early' : 'Mark paid' }}</button>
        <button class="btn soft sm" @click="skip"><Icon name="skip" :size="15" /> Skip this one</button>
      </div>
      <div v-if="open" class="more">
        <div class="row" style="justify-content:space-between">
          <div><strong class="sm">Auto-log when due</strong><div class="muted sm">Records it when you open the app on or after the due date.</div></div>
          <Toggle :model-value="bill.auto" @update:model-value="v => (bill.auto = v)" />
        </div>
        <button class="link del" @click="remove"><Icon name="trash" :size="14" /> Delete bill</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ bill: Bill; compact?: boolean }>()
const { payBill, removeBill } = useBudget()
const open = ref(false)
const days = computed(() => daysBetween(today(), props.bill.nextDue))
const soon = computed(() => days.value <= 7)
const tone = computed(() => (days.value < 0 ? 'over' : days.value <= 3 ? 'warn' : ''))
const dueLabel = computed(() => {
  const d = days.value
  if (d < 0) return `Overdue by ${-d} day${d === -1 ? '' : 's'}`
  if (d === 0) return 'Due today'
  if (d === 1) return 'Due tomorrow'
  if (d <= 7) return `Due in ${d} days`
  return 'Due ' + new Date(props.bill.nextDue + 'T00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
})
const everyLabel = computed(() => ({ week: 'Weekly', month: 'Monthly', year: 'Yearly' }[props.bill.every]))

function pay() {
  const b = props.bill
  const undo = payBill(b.id)
  showToast(b.category === 'debt' && b.debtId ? `${money(b.amount)} paid towards ${b.name}` : `${b.name} logged`, undo)
}
function skip() { const undo = payBill(props.bill.id, true); showToast(`${props.bill.name} skipped`, undo) }
function remove() { const name = props.bill.name; const undo = removeBill(props.bill.id); showToast(`${name} deleted`, undo) }
</script>

<style scoped>
.bill { background:var(--surface); border:1px solid var(--line); border-radius:20px; padding:14px; margin-bottom:10px; box-shadow:0 1px 2px rgba(20,20,40,.03); transition:border-color .3s; }
.bill.compact { border:0; border-radius:0; box-shadow:none; margin:0; padding:12px 0; background:none; }
.bill.compact + .bill.compact { border-top:1px solid var(--line); }
.nm { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.st { font-weight:600; color:var(--muted); } .warn .st { color:var(--warn-ink); } .over .st { color:var(--bad); }
.over:not(.compact) { border-color:var(--bad-line); }
.inl { display:inline-block; vertical-align:-1px; }
.end { display:flex; flex-direction:column; align-items:flex-end; gap:6px; }
.paybtn { padding:8px 14px; border-radius:12px; font-size:.82rem; }
.chev { width:30px; height:30px; border-radius:10px; }
.acts { margin-top:12px; } .acts .btn { flex:1; }
.more { margin-top:14px; padding-top:14px; border-top:1px solid var(--line); display:flex; flex-direction:column; gap:14px; }
.del { color:var(--bad); align-self:flex-start; gap:6px; }
</style>
