<template>
  <div>
    <h1 class="rise" style="margin-bottom:14px">Plan</h1>
    <div class="rise" style="--i:1;margin-bottom:16px"><PlanSwitch /></div>

    <div class="hero rise" style="--i:2">
      <div class="hico"><Icon name="bill" :size="20" /></div>
      <small>Due in the next 30 days</small>
      <div class="big"><AnimatedNumber :value="next30" /></div>
      <small>{{ state.bills.length ? `About ${money(monthly)} a month across ${state.bills.length} bill${state.bills.length === 1 ? '' : 's'}` : 'Add rent, subscriptions and loan payments' }}</small>
    </div>

    <ReminderPrompt class="rise" style="--i:2" />

    <div class="sec rise" style="--i:3"><h2>Recurring bills</h2><button class="link" @click="adding = !adding"><Icon :name="adding ? 'x' : 'plus'" :size="14" :stroke="2.6" /> {{ adding ? 'Cancel' : 'Add bill' }}</button></div>

    <Transition name="drop">
      <div v-if="adding" class="card white form">
        <input v-model="name" class="field" placeholder="Bill name (e.g. Rent, Netflix)" />
        <AmountInput v-model="amount" placeholder="Amount" />
        <label class="muted sm">Type</label>
        <div class="chips">
          <button v-for="c in kinds" :key="c.key" :class="{ on: category === c.key }" :style="category === c.key ? { borderColor: c.color, background: c.color + '1f' } : {}" @click="category = c.key"><Icon :name="c.icon" :size="16" :style="{ color: c.color }" /> {{ c.label }}</button>
        </div>
        <template v-if="category === 'debt'">
          <select v-model="debtId" class="field"><option value="">Not linked to a debt</option><option v-for="d in state.debts" :key="d.id" :value="d.id">Pays down: {{ d.name }}</option></select>
        </template>
        <label class="muted sm">Repeats</label>
        <Seg v-model="every" :options="[{ value: 'week', label: 'Weekly' }, { value: 'month', label: 'Monthly' }, { value: 'year', label: 'Yearly' }]" />
        <label class="muted sm">Next due date</label>
        <input v-model="nextDue" type="date" class="field" style="margin-top:-6px" />
        <template v-if="state.accounts.length">
          <label class="muted sm" for="bill-acct">Paid from</label>
          <select id="bill-acct" v-model="accountId" class="field" style="margin-top:-6px"><option value="">No account (just log it)</option><option v-for="a in state.accounts" :key="a.id" :value="a.id">{{ a.name }} · {{ money(a.balance) }}</option></select>
        </template>
        <div class="row" style="justify-content:space-between">
          <div><strong class="sm">Auto-log when due</strong><div class="muted sm">Records it when you open the app.</div></div>
          <Toggle v-model="auto" />
        </div>
        <button class="btn" :disabled="!name.trim() || !(amount > 0) || !nextDue" @click="add">Save bill</button>
      </div>
    </Transition>

    <div v-if="!state.bills.length && !adding" class="card empty rise" style="--i:4">
      <div class="art"><Icon name="repeat" :size="28" /></div>
      <h2 style="margin-bottom:4px">Never forget a bill</h2>
      <p class="muted" style="margin:0 0 16px">Add what you pay regularly. We'll remind you when it's due, log it in one tap, and set it aside before working out what's safe to spend.</p>
      <button class="btn" @click="adding = true"><Icon name="plus" :size="18" :stroke="2.6" /> Add your first bill</button>
    </div>

    <template v-if="attention.length">
      <div class="sec rise" style="--i:4;margin-top:6px"><h2>Needs attention</h2><span class="sm muted">{{ attention.length }}</span></div>
      <div v-for="(b, i) in attention" :key="b.id" class="rise" :style="{ '--i': 5 + i }"><BillRow :bill="b" /></div>
    </template>
    <template v-if="later.length">
      <div class="sec rise" style="--i:6;margin-top:18px"><h2>Coming up</h2><span class="sm muted">{{ later.length }}</span></div>
      <div v-for="(b, i) in later" :key="b.id" class="rise" :style="{ '--i': 7 + i }"><BillRow :bill="b" /></div>
    </template>
  </div>
</template>

<script setup lang="ts">
const { state, addBill } = useBudget()
const adding = ref(useRoute().query.add === '1') // the setup guide opens the form directly
const kinds = CATEGORIES.filter(c => c.key !== 'savings')
const name = ref(''); const amount = ref(0); const category = ref<'needs' | 'wants' | 'debt'>('needs')
const accountId = ref(''); const debtId = ref(''); const every = ref('month'); const nextDue = ref(today()); const auto = ref(false)

const sorted = computed(() => [...state.value.bills].sort((a, b) => a.nextDue.localeCompare(b.nextDue)))
const attention = computed(() => sorted.value.filter(b => daysBetween(today(), b.nextDue) <= 7))
const later = computed(() => sorted.value.filter(b => daysBetween(today(), b.nextDue) > 7))
const next30 = computed(() => state.value.bills.reduce((s, b) => s + occurrencesUntil(b.nextDue, b.every, b.anchorDay, addDays(today(), 30)).length * b.amount, 0))
const monthly = computed(() => state.value.bills.reduce((s, b) => s + monthlyEquivalent(b.amount, b.every), 0))

function add() {
  addBill({ name: name.value.trim(), amount: amount.value, category: category.value, every: every.value as Every, nextDue: nextDue.value, auto: auto.value, debtId: debtId.value || undefined, accountId: accountId.value || undefined })
  showToast(`${name.value.trim()} added`)
  name.value = ''; amount.value = 0; category.value = 'needs'; debtId.value = ''; accountId.value = ''; every.value = 'month'; nextDue.value = today(); auto.value = false; adding.value = false
}
</script>

<style scoped>
.hero { position:relative; overflow:hidden; background:linear-gradient(160deg,#7b83f7 0%,#4c4fd6 100%); color:#fff; border-radius:26px; padding:22px; box-shadow:0 18px 34px -16px rgba(76,79,214,.85), inset 0 1px 0 rgba(255,255,255,.35); }
.hero::before { content:''; position:absolute; width:220px; height:220px; right:-70px; top:-90px; border-radius:50%; background:rgba(255,255,255,.14); }
.hero::after { content:''; position:absolute; width:150px; height:150px; right:30px; bottom:-90px; border-radius:50%; background:rgba(255,255,255,.1); }
.hico { width:38px; height:38px; border-radius:12px; background:rgba(255,255,255,.22); display:grid; place-items:center; margin-bottom:14px; position:relative; }
.big { font-size:2.5rem; font-weight:700; letter-spacing:-.035em; line-height:1.15; position:relative; }
.hero small { opacity:.9; position:relative; }
.form { display:flex; flex-direction:column; gap:12px; margin-bottom:14px; }
.chips { display:flex; gap:8px; flex-wrap:wrap; margin-top:-4px; }
.chips button { display:inline-flex; align-items:center; gap:7px; background:var(--card); color:var(--ink); border:1.5px solid transparent; border-radius:99px; padding:9px 14px; font:inherit; font-size:.85rem; font-weight:500; cursor:pointer; transition:transform .2s var(--spring); }
.chips button:active { transform:scale(.94); }
.drop-enter-active { transition:all .4s var(--ease); } .drop-leave-active { transition:all .2s; }
.drop-enter-from,.drop-leave-to { opacity:0; transform:translateY(-12px) scale(.98); }
</style>
