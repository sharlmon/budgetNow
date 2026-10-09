<template>
  <div class="card white sts">
    <div class="rw"><svg class="ring" viewBox="0 0 80 80" aria-hidden="true">
      <circle cx="40" cy="40" r="32" fill="none" stroke="#efeff3" stroke-width="9" />
      <circle cx="40" cy="40" r="32" fill="none" :stroke="tone" stroke-width="9" stroke-linecap="round" transform="rotate(-90 40 40)"
        :stroke-dasharray="`${Math.min(1, s.used) * C} ${C}`" class="arc" />
    </svg>
    <span class="ringic" :style="{ color: tone }"><Icon name="shield" :size="22" /></span></div>

    <div class="grow">
      <div class="muted sm" style="font-weight:600">Safe to spend today</div>
      <div class="big" :class="{ neg: s.leftToday < 0 }"><AnimatedNumber :value="Math.max(0, s.leftToday)" /></div>
      <div class="muted sm" v-if="s.pool < 0">Needs and Wants are {{ money(-s.pool) }} over for the month.</div>
      <div class="muted sm" v-else-if="s.leftToday < 0">{{ money(-s.leftToday) }} over today's allowance.<template v-if="s.daysLeft > 1"> Tomorrow: {{ money(s.tomorrow) }}/day.</template></div>
      <div class="muted sm" v-else>of {{ money(s.allowance) }} a day · {{ s.daysLeft }} {{ s.daysLeft === 1 ? 'day' : 'days' }} left<template v-if="s.upcomingBills > 0"> · after {{ money(s.upcomingBills) }} of bills</template></div>
    </div>
    <button class="icon-btn add" aria-label="Add expense" @click="sheet = { open: true, mode: 'expense' }"><Icon name="plus" :size="18" :stroke="2.6" /></button>
  </div>
</template>

<script setup lang="ts">
const s = useSafeToSpend()
const sheet = useSheet()
const C = 2 * Math.PI * 32
const tone = computed(() => (s.value.used >= 1 ? 'var(--bad)' : s.value.used >= 0.8 ? '#f5a524' : 'var(--good)'))
</script>

<style scoped>
.sts { display:flex; align-items:center; gap:16px; position:relative; }
.ring { width:76px; height:76px; flex:none; }
.arc { animation:fill 1s var(--ease) both; transition:stroke-dasharray .5s var(--ease), stroke .3s; }
@keyframes fill { from { stroke-dasharray:0 202; } }
/* ring wrapper */
.rw { position:relative; width:76px; height:76px; flex:none; }
.ringic { position:absolute; inset:0; display:grid; place-items:center; }
.big { font-size:1.9rem; font-weight:700; letter-spacing:-.03em; line-height:1.15; margin:1px 0; }
.big.neg { color:var(--bad); }
.add { width:40px; height:40px; border-radius:14px; background:var(--accent); border-color:transparent; color:#fff; box-shadow:0 8px 16px -8px rgba(239,106,58,.9); }
.add:hover { background:var(--accent); color:#fff; border-color:transparent; }
</style>
