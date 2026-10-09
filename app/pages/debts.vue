<template>
  <div>
    <h1 class="rise" style="margin-bottom:14px">Plan</h1>
    <div class="rise" style="--i:1;margin-bottom:16px"><PlanSwitch /></div>
    <div class="hero rise" style="--i:1">
      <div class="hico"><Icon name="card" :size="20" /></div>
      <small>Total you owe</small>
      <div class="big"><AnimatedNumber :value="totalDebt" /></div>
      <small>Monthly minimums {{ money(totalMinDebt) }}</small>
    </div>

    <div class="rise" style="--i:2;margin-top:16px"><PayoffPlanner /></div>

    <div class="sec rise" style="--i:2"><h2>Your debts</h2><button class="link" @click="adding = !adding"><Icon :name="adding ? 'x' : 'plus'" :size="14" :stroke="2.6" /> {{ adding ? 'Cancel' : 'Add debt' }}</button></div>

    <Transition name="drop">
      <div v-if="adding" class="card white form">
        <input v-model="name" class="field" placeholder="Who do you owe? (e.g. Student loan)" />
        <div class="row"><AmountInput v-model="balance" placeholder="Balance" /><AmountInput v-model="minPayment" placeholder="Min / month" /></div>
        <AmountInput v-model="apr" placeholder="Interest rate % per year (optional)" aria-label="Interest rate percent per year" />
        <button class="btn" :disabled="!name.trim() || !(balance > 0)" @click="add">Save debt</button>
      </div>
    </Transition>

    <div v-if="!state.debts.length && !adding" class="card empty rise" style="--i:3">
      <div class="art"><Icon name="target" :size="28" /></div>
      <h2 style="margin-bottom:4px">Debt-free is the goal</h2>
      <p class="muted" style="margin:0">Add what you owe. The minimum is reserved automatically each time you split your income.</p>
    </div>

    <div v-for="(d, i) in state.debts" :key="d.id" class="card white rise" :style="{ marginBottom: '12px', '--i': 3 + i }">
      <div class="row">
        <CatIcon cat="debt" :size="44" />
        <div class="grow"><strong>{{ d.name }}</strong><br><small class="muted">min {{ money(d.minPayment) }} / month</small></div>
        <strong :class="{ good: d.balance === 0 }">{{ d.balance === 0 ? 'Paid off' : money(d.balance) }}</strong>
        <button class="icon-btn" aria-label="Delete debt" @click="removeDebt(d.id)"><Icon name="trash" :size="15" /></button>
      </div>
      <div class="bar" style="margin:14px 0 6px"><i :style="{ width: paid(d) + '%', background: 'var(--good)' }" /></div>
      <small class="muted">{{ paid(d).toFixed(0) }}% paid off</small>
      <div v-if="d.balance > 0" class="row apr">
        <label class="muted sm grow" :for="'apr-' + d.id">Interest rate (APR %)</label>
        <div class="aprin"><AmountInput :id="'apr-' + d.id" :model-value="d.apr ?? 0" placeholder="0" @update:model-value="v => setApr(d, v)" /></div>
      </div>
      <div v-if="d.balance > 0" class="row" style="margin-top:12px">
        <AmountInput :model-value="pay[d.id] ?? 0" placeholder="Payment" @update:model-value="v => (pay[d.id] = v)" />
        <button class="btn soft sm" @click="pay[d.id] = Math.min(d.minPayment || d.balance, d.balance)">Min</button>
        <button class="btn sm" :disabled="!(pay[d.id] > 0)" @click="payDebt(d)">Pay</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { state, totalDebt, totalMinDebt, addDebt, removeDebt, addExpense } = useBudget()
const adding = ref(false)
const name = ref(''); const balance = ref(0); const minPayment = ref(0); const apr = ref(0)
const pay = reactive<Record<string, number>>({})
const paid = (d: Debt) => { const o = d.original ?? d.balance; return o > 0 ? Math.min(100, ((o - d.balance) / o) * 100) : 0 }
function add() { addDebt(name.value.trim(), balance.value, minPayment.value, Math.min(100, apr.value || 0)); showToast(`${name.value.trim()} added`); name.value = ''; balance.value = 0; minPayment.value = 0; apr.value = 0; adding.value = false }
function setApr(d: Debt, v: number) { if (v > 0) d.apr = Math.min(100, v); else delete d.apr }
function payDebt(d: Debt) { const amt = Math.min(pay[d.id] ?? 0, d.balance); addExpense(`Payment: ${d.name}`, amt, 'debt', d.id); showToast(`${money(amt)} paid to ${d.name}`); pay[d.id] = 0 }
</script>

<style scoped>
.hero { position:relative; overflow:hidden; background:var(--grad); color:#fff; border-radius:26px; padding:22px; box-shadow:0 18px 34px -16px rgba(239,106,58,.85), inset 0 1px 0 rgba(255,255,255,.35); }
.hero::before { content:''; position:absolute; width:220px; height:220px; right:-70px; top:-90px; border-radius:50%; background:rgba(255,255,255,.14); }
.hero::after { content:''; position:absolute; width:150px; height:150px; right:30px; bottom:-90px; border-radius:50%; background:rgba(255,255,255,.1); }
.hico { width:38px; height:38px; border-radius:12px; background:rgba(255,255,255,.22); display:grid; place-items:center; margin-bottom:14px; position:relative; }
.big { font-size:2.5rem; font-weight:700; letter-spacing:-.035em; line-height:1.15; position:relative; }
.hero small { opacity:.88; position:relative; }
.apr { margin-top:12px; padding-top:12px; border-top:1px solid var(--line); }
.aprin { width:120px; }
.form { display:flex; flex-direction:column; gap:12px; margin-bottom:14px; }
.drop-enter-active { transition:all .4s var(--ease); } .drop-leave-active { transition:all .2s; }
.drop-enter-from,.drop-leave-to { opacity:0; transform:translateY(-12px) scale(.98); }
</style>
