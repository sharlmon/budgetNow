<template>
  <div>
    <h1 style="margin-bottom:14px">Debts</h1>
    <div class="hero">
      <small>Total you owe</small>
      <div class="big">{{ money(totalDebt) }}</div>
      <small>Monthly minimums {{ money(totalMinDebt) }}</small>
    </div>

    <div class="sec"><h2>Your debts</h2><button class="link" @click="adding = !adding">{{ adding ? 'Cancel' : '+ Add debt' }}</button></div>

    <div v-if="adding" class="card white form">
      <input v-model="name" class="field" placeholder="Who do you owe? (e.g. Student loan)" />
      <div class="row"><AmountInput v-model="balance" placeholder="Balance" /><AmountInput v-model="minPayment" placeholder="Min / month" /></div>
      <button class="btn" :disabled="!name.trim() || !(balance > 0)" @click="add">Save debt</button>
    </div>

    <div v-if="!state.debts.length && !adding" class="card empty"><div class="em">🎯</div><p class="muted">No debts tracked. Add one and its minimum is reserved automatically when you split your income.</p></div>

    <div v-for="d in state.debts" :key="d.id" class="card white" style="margin-bottom:12px">
      <div class="row">
        <span class="ico" style="background:#5b8def22">💳</span>
        <div class="grow"><strong>{{ d.name }}</strong><br><small class="muted">min {{ money(d.minPayment) }}/mo</small></div>
        <strong :class="{ good: d.balance === 0 }">{{ d.balance === 0 ? 'Paid off 🎉' : money(d.balance) }}</strong>
        <button class="icon-x" aria-label="Delete" @click="removeDebt(d.id)">×</button>
      </div>
      <div class="bar" style="margin:12px 0 5px"><i :style="{ width: paid(d) + '%', background: 'var(--good)' }" /></div>
      <small class="muted">{{ paid(d).toFixed(0) }}% paid</small>
      <div v-if="d.balance > 0" class="row" style="margin-top:10px">
        <AmountInput v-model="pay[d.id]" placeholder="Payment" />
        <button class="btn soft" style="width:auto;padding:12px 16px" @click="pay[d.id] = Math.min(d.minPayment || d.balance, d.balance)">Min</button>
        <button class="btn" style="width:auto;padding:12px 20px" :disabled="!(pay[d.id] > 0)" @click="payDebt(d)">Pay</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { state, totalDebt, totalMinDebt, addDebt, removeDebt, addExpense } = useBudget()
const adding = ref(false)
const name = ref(''); const balance = ref(0); const minPayment = ref(0)
const pay = reactive<Record<string, number>>({})
const paid = (d: Debt) => { const o = d.original ?? d.balance; return o > 0 ? Math.min(100, ((o - d.balance) / o) * 100) : 0 }
function add() { addDebt(name.value.trim(), balance.value, minPayment.value); name.value = ''; balance.value = 0; minPayment.value = 0; adding.value = false }
function payDebt(d: Debt) { addExpense(`Payment: ${d.name}`, Math.min(pay[d.id] ?? 0, d.balance), 'debt', d.id); pay[d.id] = 0 }
</script>

<style scoped>
.hero { background:var(--grad); color:#fff; border-radius:24px; padding:20px; box-shadow:0 14px 30px -14px rgba(239,106,58,.8); }
.big { font-size:2.4rem; font-weight:700; letter-spacing:-.03em; line-height:1.15; }
.hero small { opacity:.85; }
.form { display:flex; flex-direction:column; gap:10px; margin-bottom:12px; }
</style>
