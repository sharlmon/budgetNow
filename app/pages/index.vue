<template>
  <div>
    <div class="hdr">
      <NuxtLink to="/settings" class="avatar">{{ initial }}</NuxtLink>
      <div class="grow"><strong>Welcome back{{ userName ? ', ' + userName : '' }}!</strong><div class="muted sm">{{ todayLabel }}</div></div>
      <NuxtLink to="/settings" class="circ" aria-label="Settings">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
      </NuxtLink>
    </div>

    <WalletCard :balance="totalIncome - totalSpent" :first="firstInc" :second="secondInc" />

    <div v-if="!state.incomes.length" class="card empty" style="margin-top:18px">
      <div class="em">💸</div>
      <h2 style="margin:8px 0 4px">Let's plan your first pay</h2>
      <p class="muted" style="margin:0 0 16px">Tell BudgetNow how much came in. It splits it instantly and you can tweak it before confirming.</p>
      <button class="btn" @click="sheet = { open: true, mode: 'income' }">Add money in</button>
    </div>

    <template v-else>
      <div class="card white" style="margin-top:18px">
        <div class="row" style="justify-content:space-between"><strong>Monthly budget</strong><NuxtLink to="/analytics" class="link">See all ›</NuxtLink></div>
        <div class="muted sm" style="margin:6px 0 10px">{{ monthLabel(month) }}</div>
        <div class="bar" style="height:9px"><i :style="{ width: spendPct + '%', background: spendPct > 100 ? 'var(--bad)' : 'var(--accent)' }" /></div>
        <div class="row sm" style="justify-content:space-between;margin-top:8px">
          <span class="muted">Spend <b style="color:var(--accent)">{{ money(stats.spentTotal) }}</b> / {{ money(stats.spendBudget) }}</span>
          <b>{{ Math.round(spendPct) }}%</b>
        </div>
        <div class="chip" :class="stats.savingsRate >= 20 ? 'ok' : 'meh'">
          <span>{{ stats.savingsRate >= 20 ? '↑ Good savings rate this month' : 'Savings rate this month' }}</span><b>{{ Math.round(stats.savingsRate) }}%</b>
        </div>
      </div>

      <div class="sec"><h2>Budget envelopes</h2><NuxtLink to="/analytics" class="link">Details ›</NuxtLink></div>
      <CatRow v-for="c in CATEGORIES" :key="c.key" :c="c" :budgeted="stats.budgeted[c.key]" :spent="stats.spent[c.key]" />

      <div class="sec"><h2>Recent Transactions</h2><NuxtLink to="/activity" class="link">See all ›</NuxtLink></div>
      <div class="card white" style="padding:4px 16px"><TxnItem v-for="t in txns.slice(0, 5)" :key="t.id" :t="t" /></div>
    </template>
  </div>
</template>

<script setup lang="ts">
const { state, totalIncome, totalSpent } = useBudget()
const sheet = useSheet()
const txns = useTransactions()
const month = computed(() => today().slice(0, 7))
const stats = useMonthStats(month)
const spendPct = computed(() => (stats.value.spendBudget > 0 ? (stats.value.spentTotal / stats.value.spendBudget) * 100 : 0))
const initial = computed(() => (userName.value || 'B').trim()[0]?.toUpperCase())
const todayLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
const mini = (i?: Income) => (i ? { label: i.label || 'Income', amount: i.amount } : undefined)
const firstInc = computed(() => mini(state.value.incomes[0]))
const secondInc = computed(() => mini(state.value.incomes[1]))
</script>

<style scoped>
.chip { display:flex; justify-content:space-between; margin-top:12px; padding:9px 12px; border-radius:12px; font-size:.78rem; }
.chip.ok { background:var(--goodbg); color:#1f8f5f; } .chip.meh { background:#f0f0f4; color:var(--muted); }
</style>
