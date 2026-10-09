<template>
  <div>
    <LegacyImport />
    <div class="hdr rise">
      <NuxtLink to="/settings" class="avatar">{{ initial }}</NuxtLink>
      <div class="grow"><strong>{{ greeting }}{{ display ? ', ' + display : '' }}</strong><div class="muted sm">{{ todayLabel }}</div><SyncBadge /></div>
      <NuxtLink to="/settings" class="circ" aria-label="Settings"><Icon name="settings" :size="20" /></NuxtLink>
    </div>

    <WalletCard :balance="totalIncome - totalSpent" :first="firstInc" :second="secondInc" />

    <div v-if="state.incomes.length && safe.hasBudget" class="rise" style="margin-top:22px;--i:3"><SafeToSpend /></div>
    <div class="rise" style="--i:3"><InstallCard /></div>
    <div v-if="dueSoon.length" class="card white rise" style="margin-top:16px;--i:3;padding:14px 18px">
      <div class="row" style="justify-content:space-between;margin-bottom:2px"><h2>Bills due soon</h2><NuxtLink to="/bills" class="link">All bills <Icon name="next" :size="14" /></NuxtLink></div>
      <BillRow v-for="b in dueSoon.slice(0, 3)" :key="b.id" :bill="b" compact />
      <NuxtLink v-if="dueSoon.length > 3" to="/bills" class="link" style="margin-top:6px">+{{ dueSoon.length - 3 }} more</NuxtLink>
    </div>
    <div v-if="!state.incomes.length" class="card empty rise" style="margin-top:22px;--i:3">
      <div class="art"><Icon name="coins" :size="28" /></div>
      <h2 style="margin-bottom:6px">Let's plan your first pay</h2>
      <p class="muted" style="margin:0 0 18px">Enter how much came in. We split it instantly and you can tweak it before confirming.</p>
      <button class="btn" @click="sheet = { open: true, mode: 'income' }"><Icon name="plus" :size="18" :stroke="2.6" /> Add money in</button>
    </div>

    <template v-else>
      <div class="card white rise" style="margin-top:16px;--i:3">
        <div class="row" style="justify-content:space-between"><h2>Monthly budget</h2><NuxtLink to="/analytics" class="link">Details <Icon name="next" :size="14" /></NuxtLink></div>
        <div class="muted sm" style="margin:4px 0 14px">{{ monthLabel(month) }}</div>
        <div class="bar" style="height:10px"><i :style="{ width: Math.min(100, spendPct) + '%', background: spendPct > 100 ? 'var(--bad)' : 'var(--btn)' }" /></div>
        <div class="row sm" style="justify-content:space-between;margin-top:10px">
          <span class="muted">Spent <b style="color:var(--accent)">{{ money(stats.spentTotal) }}</b> of {{ money(stats.spendBudget) }}</span>
          <b>{{ Math.round(spendPct) }}%</b>
        </div>
        <div class="chip" :class="stats.savingsRate >= 20 ? 'ok' : 'meh'">
          <Icon name="trend" :size="16" /><span class="grow">{{ stats.savingsRate >= 20 ? 'Great savings rate this month' : 'Savings rate this month' }}</span><b>{{ Math.round(stats.savingsRate) }}%</b>
        </div>
      </div>

      <div class="sec rise" style="--i:4"><h2>Budget envelopes</h2><NuxtLink to="/analytics" class="link">Analytics <Icon name="next" :size="14" /></NuxtLink></div>
      <div v-for="(c, i) in CATEGORIES" :key="c.key" class="rise" :style="{ '--i': 5 + i }"><CatRow :c="c" :budgeted="stats.budgeted[c.key]" :spent="stats.spent[c.key]" /></div>

      <div class="sec rise" style="--i:9"><h2>Savings goals</h2><NuxtLink to="/goals" class="link">{{ state.goals.length ? 'See all' : 'Set a goal' }} <Icon name="next" :size="14" /></NuxtLink></div>
      <div v-if="state.goals.length" class="card white rise" style="padding:4px 18px;--i:9">
        <NuxtLink v-for="g in state.goals.slice(0, 3)" :key="g.id" to="/goals" class="item glink">
          <CatIcon :icon="g.icon" :color="g.color" :size="42" />
          <div class="grow">
            <div class="row" style="justify-content:space-between"><strong>{{ g.name }}</strong><span class="sm muted">{{ Math.round(Math.min(100, goalSaved(g) / g.target * 100)) }}%</span></div>
            <div class="bar" style="margin:7px 0 4px"><i :style="{ width: Math.min(100, goalSaved(g) / g.target * 100) + '%', background: g.color }" /></div>
            <small class="muted">{{ money(goalSaved(g)) }} of {{ money(g.target) }}</small>
          </div>
        </NuxtLink>
      </div>
      <NuxtLink v-else to="/goals" class="card goalprompt rise" style="--i:9"><span class="gp"><Icon name="flag" :size="20" /></span><span class="grow"><strong>Saving for something?</strong><br><span class="muted sm">Create a goal and watch it fill up.</span></span><Icon name="next" :size="18" /></NuxtLink>

      <div class="sec rise" style="--i:10"><h2>Recent transactions</h2><NuxtLink to="/activity" class="link">See all <Icon name="next" :size="14" /></NuxtLink></div>
      <div class="card white rise" style="padding:4px 18px;--i:11"><TxnItem v-for="t in txns.slice(0, 5)" :key="t.id" :t="t" /></div>
    </template>
  </div>
</template>

<script setup lang="ts">
const { state, totalIncome, totalSpent } = useBudget()
const sheet = useSheet()
const txns = useTransactions()
const month = computed(() => today().slice(0, 7))
const stats = useMonthStats(month)
const safe = useSafeToSpend()
const dueSoon = computed(() => state.value.bills.filter(b => daysBetween(today(), b.nextDue) <= 7).sort((a, b) => a.nextDue.localeCompare(b.nextDue)))
const spendPct = computed(() => (stats.value.spendBudget > 0 ? (stats.value.spentTotal / stats.value.spendBudget) * 100 : 0))
const auth = useAppAuth()
const display = computed(() => userName.value || auth.firstName.value)
const initial = computed(() => (display.value || 'B').trim()[0]?.toUpperCase())
const h = new Date().getHours()
const greeting = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
const todayLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
const mini = (i?: Income) => (i ? { label: i.label || 'Income', amount: i.amount } : undefined)
const firstInc = computed(() => mini(state.value.incomes[0]))
const secondInc = computed(() => mini(state.value.incomes[1]))
</script>

<style scoped>
.chip { display:flex; align-items:center; gap:8px; margin-top:14px; padding:11px 14px; border-radius:14px; font-size:.8rem; font-weight:500; }
.chip.ok { background:var(--goodbg); color:#1f8f5f; } .chip.meh { background:#f1f1f5; color:var(--muted); }
.glink { color:inherit; text-decoration:none; }
.goalprompt { display:flex; align-items:center; gap:14px; text-decoration:none; color:var(--ink); background:#fff; padding:14px; }
.gp { width:42px; height:42px; border-radius:14px; background:#e6f6ee; color:var(--good); display:grid; place-items:center; }
</style>
