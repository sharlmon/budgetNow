<template>
  <section class="card">
    <h2>Debts <small class="muted" v-if="state.debts.length">· total {{ money(totalDebt) }}</small></h2>
    <div class="row">
      <input v-model="name" placeholder="Who do you owe?" />
    </div>
    <div class="row">
      <input v-model.number="balance" type="number" min="0" step="0.01" placeholder="Balance" />
      <input v-model.number="minPayment" type="number" min="0" step="0.01" placeholder="Min / month" />
      <button class="fit" :disabled="!name.trim() || !(balance > 0)" @click="add">Add</button>
    </div>
    <ul class="list">
      <li v-for="d in state.debts" :key="d.id" style="flex-wrap:wrap">
        <span><strong>{{ d.name }}</strong> <small class="muted">min {{ money(d.minPayment) }}</small></span>
        <span :class="d.balance === 0 ? 'good' : ''">{{ d.balance === 0 ? 'Paid off ✓' : money(d.balance) }}
          <button class="ghost" @click="removeDebt(d.id)">×</button></span>
        <div v-if="d.balance > 0" class="row" style="width:100%;margin:0">
          <input v-model.number="pay[d.id]" type="number" min="0" step="0.01" :placeholder="`Pay (min ${d.minPayment})`" />
          <button class="fit" :disabled="!(pay[d.id] > 0)" @click="payDebt(d)">Record payment</button>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
const { state, totalDebt, addDebt, removeDebt, addExpense } = useBudget()
const name = ref('')
const balance = ref(0)
const minPayment = ref(0)
const pay = reactive<Record<string, number>>({})
function add() {
  addDebt(name.value.trim(), balance.value, minPayment.value || 0)
  name.value = ''; balance.value = 0; minPayment.value = 0
}
function payDebt(d: Debt) {
  const amt = Math.min(pay[d.id] ?? 0, d.balance)
  addExpense(`Payment: ${d.name}`, amt, 'debt', d.id)
  pay[d.id] = 0
}
</script>
