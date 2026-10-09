<template>
  <section v-if="active.length" class="card white plan" aria-labelledby="plan-h">
    <div class="row">
      <span class="ic"><Icon name="target" :size="20" /></span>
      <div class="grow"><h2 id="plan-h">Payoff plan</h2><div class="muted sm">See when you could be debt-free</div></div>
    </div>

    <label class="muted sm lab" for="extra">Extra you could pay each month, on top of the minimums</label>
    <AmountInput v-model="extra" placeholder="0" />
    <div class="quick">
      <button v-for="n in [25, 50, 100, 250]" :key="n" class="chip" @click="extra = (extra || 0) + n">+{{ money(n) }}</button>
      <button v-if="extra > 0" class="chip clear" @click="extra = 0">Clear</button>
    </div>

    <Seg v-model="strategy" :options="[{ value: 'avalanche', label: 'Avalanche' }, { value: 'snowball', label: 'Snowball' }]" class="seg" />
    <p class="muted sm explain">{{ strategy === 'avalanche' ? 'Pay the highest interest rate first. Costs the least interest.' : 'Pay the smallest balance first. Quick wins keep you motivated.' }}</p>

    <p v-if="chosen.neverPaysOff" class="warn" role="alert">
      At this budget, {{ stuck.join(', ') }} never gets paid off: the minimum doesn't cover the interest. Add some extra each month, or raise the minimum.
    </p>
    <template v-else>
      <div class="result">
        <div class="when"><small>Debt-free</small><strong>{{ monthsFromNow(chosen.months) }}</strong><small>in {{ formatDuration(chosen.months) }}</small></div>
        <div class="stat"><small>Interest you'll pay</small><strong>{{ money(chosen.totalInterest) }}</strong></div>
        <div v-if="savedInterest > 0.5 || savedMonths > 0" class="stat good"><small>Saved vs minimums only</small><strong>{{ money(Math.max(0, savedInterest)) }}</strong><small v-if="savedMonths > 0">{{ formatDuration(savedMonths) }} sooner</small></div>
      </div>

      <div class="cmp" aria-label="Strategy comparison">
        <div v-for="s in (['avalanche', 'snowball'] as const)" :key="s" class="cmprow" :class="{ on: s === strategy }">
          <span class="nm">{{ s === 'avalanche' ? 'Avalanche' : 'Snowball' }}<em v-if="s === best && Math.abs(plans.avalanche.totalInterest - plans.snowball.totalInterest) > 0.5">Least interest</em></span>
          <span>{{ formatDuration(plans[s].months) }}</span><span>{{ money(plans[s].totalInterest) }}</span>
        </div>
        <div class="cmprow base"><span class="nm">Minimums only</span><span>{{ plans.minimums.neverPaysOff ? 'Never' : formatDuration(plans.minimums.months) }}</span><span>{{ plans.minimums.neverPaysOff ? '-' : money(plans.minimums.totalInterest) }}</span></div>
      </div>

      <h3 class="oh">Payoff order</h3>
      <ol class="order">
        <li v-for="(o, i) in chosen.order" :key="o.id"><span class="n">{{ i + 1 }}</span><span class="grow">{{ o.name }}</span><span class="muted">{{ monthsFromNow(o.month) }}</span></li>
      </ol>
    </template>

    <p v-if="missingRate.length" class="note">
      <Icon name="bulb" :size="14" /> No interest rate for {{ missingRate.join(', ') }}, so {{ missingRate.length > 1 ? 'they are' : 'it is' }} treated as 0%. Add the rate on the debt card for accurate results.
    </p>
  </section>
</template>

<script setup lang="ts">
import { comparePlans, formatDuration, monthsFromNow, type PlanDebt } from '../utils/payoff'

const { state } = useBudget()
const extra = ref(0)
const strategy = ref('avalanche')

const active = computed(() => state.value.debts.filter(d => d.balance > 0))
const plannable = computed<PlanDebt[]>(() => active.value.map(d => ({ id: d.id, name: d.name, balance: d.balance, apr: d.apr ?? 0, minPayment: d.minPayment })))
const plans = computed(() => comparePlans(plannable.value, extra.value || 0))
const chosen = computed(() => (strategy.value === 'snowball' ? plans.value.snowball : plans.value.avalanche))
const best = computed(() => (plans.value.avalanche.totalInterest <= plans.value.snowball.totalInterest ? 'avalanche' : 'snowball'))
const savedInterest = computed(() => plans.value.minimums.totalInterest - chosen.value.totalInterest)
const savedMonths = computed(() => (plans.value.minimums.neverPaysOff ? 0 : plans.value.minimums.months - chosen.value.months))
const missingRate = computed(() => active.value.filter(d => !d.apr).map(d => d.name))
// Debts still unpaid after the planner's limit, to say which ones are stuck.
const stuck = computed(() => {
  const cleared = new Set(chosen.value.order.map(o => o.id))
  return plannable.value.filter(d => !cleared.has(d.id)).map(d => d.name)
})
</script>

<style scoped>
.plan { margin-bottom:16px; display:flex; flex-direction:column; gap:10px; }
.ic { width:42px; height:42px; border-radius:14px; background:#eef2ff; color:#5b8def; display:grid; place-items:center; flex:none; }
.lab { margin-top:6px; }
.quick { display:flex; flex-wrap:wrap; gap:8px; }
.chip { border:1px solid var(--line); background:#fff; border-radius:99px; padding:7px 13px; font:inherit; font-size:.8rem; font-weight:600; cursor:pointer; transition:transform .15s var(--spring); }
.chip:active { transform:scale(.94); } .chip.clear { color:var(--muted); }
.seg { margin-top:6px; } .explain { margin:0; }
.warn { margin:6px 0 0; padding:12px 14px; border-radius:14px; background:#fdecec; color:var(--bad); font-weight:500; font-size:.9rem; }
.result { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:8px; }
.when, .stat { background:var(--card); border:1px solid var(--line); border-radius:16px; padding:12px 14px; display:flex; flex-direction:column; gap:2px; }
.when { grid-column:1 / -1; background:linear-gradient(95deg,#eef2ff,#f6f8ff); border-color:#dbe3ff; }
.when strong { font-size:1.7rem; letter-spacing:-.03em; line-height:1.1; } .stat strong { font-size:1.15rem; }
.when small, .stat small { color:var(--muted); font-size:.75rem; } .stat.good { background:var(--goodbg); border-color:#cfeadc; } .stat.good strong { color:#1f8f5f; }
.cmp { margin-top:6px; border:1px solid var(--line); border-radius:16px; overflow:hidden; }
.cmprow { display:grid; grid-template-columns:1.6fr 1fr 1fr; gap:8px; padding:10px 14px; font-size:.88rem; align-items:center; } .cmprow + .cmprow { border-top:1px solid var(--line); }
.cmprow.on { background:#fff7f2; font-weight:600; } .cmprow.base { color:var(--muted); background:#fafafc; }
.nm { display:flex; flex-direction:column; } .nm em { font-style:normal; font-size:.7rem; color:var(--good); font-weight:600; }
.oh { margin:10px 0 0; font-size:.85rem; color:var(--muted); font-weight:600; text-transform:uppercase; letter-spacing:.05em; }
.order { list-style:none; margin:0; padding:0; } .order li { display:flex; align-items:center; gap:12px; padding:9px 0; font-size:.92rem; } .order li + li { border-top:1px solid var(--line); }
.n { width:26px; height:26px; border-radius:50%; background:var(--btn); color:#fff; font-size:.78rem; font-weight:700; display:grid; place-items:center; }
.note { display:flex; gap:8px; align-items:flex-start; margin:6px 0 0; padding:10px 12px; border-radius:12px; background:#fff8e6; color:#8a6100; font-size:.82rem; }
.note svg { margin-top:2px; flex:none; }
</style>
