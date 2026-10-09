<template>
  <div>
    <div class="row" style="justify-content:space-between;margin-bottom:16px">
      <div><h1>{{ greeting }} 👋</h1><div class="muted">{{ today }}</div></div>
    </div>

    <div v-if="!state.incomes.length" class="card empty">
      <div class="em">💸</div>
      <h2 style="margin:8px 0 4px">Let's plan your first pay</h2>
      <p class="muted" style="margin:0 0 16px">Tell BudgetNow how much came in and it splits it for you instantly. You can tweak it before confirming.</p>
      <button class="btn" @click="start">Add money in</button>
    </div>

    <template v-else>
      <div class="hero">
        <small>Left to spend</small>
        <div class="big" :class="{ neg: left < 0 }">{{ money(left) }}</div>
        <div class="row" style="margin-top:14px;justify-content:space-between">
          <small>In {{ money(totalIncome) }}</small><small>Spent {{ money(totalSpent) }}</small>
        </div>
        <div class="hbar"><i :style="{ width: Math.min(100, totalIncome ? totalSpent / totalIncome * 100 : 0) + '%' }" /></div>
      </div>

      <div class="sec"><h2>Your budget</h2></div>
      <div class="cats">
        <div v-for="c in CATEGORIES" :key="c.key" class="card cat">
          <div class="row"><span class="ico" :style="{ background: c.color + '22' }">{{ c.emoji }}</span><strong>{{ c.label }}</strong></div>
          <div class="amt" :class="{ bad: rem(c.key) < 0 }">{{ money(rem(c.key)) }}</div>
          <div class="bar"><i :style="{ width: fill(c.key) + '%', background: rem(c.key) < 0 ? 'var(--bad)' : c.color }" /></div>
          <small class="muted">{{ money(spent[c.key]) }} of {{ money(budgeted[c.key]) }}</small>
        </div>
      </div>

      <div class="sec"><h2>Recent</h2><NuxtLink to="/activity" class="link">See all</NuxtLink></div>
      <div class="card" v-if="txns.length"><TxnItem v-for="t in txns.slice(0, 5)" :key="t.id" :t="t" /></div>
    </template>
  </div>
</template>

<script setup lang="ts">
const { state, budgeted, spent, totalIncome } = useBudget()
const sheet = useSheet()
const txns = useTransactions()
const totalSpent = computed(() => CATEGORIES.reduce((s, c) => s + spent.value[c.key], 0))
const left = computed(() => totalIncome.value - totalSpent.value)
const rem = (k: Category) => budgeted.value[k] - spent.value[k]
const fill = (k: Category) => (budgeted.value[k] > 0 ? Math.min(100, spent.value[k] / budgeted.value[k] * 100) : spent.value[k] > 0 ? 100 : 0)
const h = new Date().getHours()
const greeting = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
const start = () => { sheet.value = { open: true, mode: 'income' } }
</script>

<style scoped>
.big.neg { color:#ffd0d6; }
.hbar { height:6px; background:rgba(255,255,255,.25); border-radius:99px; margin-top:8px; overflow:hidden; }
.hbar i { display:block; height:100%; background:#fff; border-radius:99px; }
.cats { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.cat { display:flex; flex-direction:column; gap:8px; }
.cat .ico { width:34px; height:34px; font-size:1rem; border-radius:11px; }
.amt { font-size:1.4rem; font-weight:700; letter-spacing:-.02em; }
</style>
