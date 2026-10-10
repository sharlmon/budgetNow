<template>
  <div class="rr" :class="{ goal: item.kind === 'goal', over: item.kind === 'bill' && item.overdue }">
    <span class="ic" :class="item.kind"><Icon :name="item.kind === 'goal' ? 'flag' : 'repeat'" :size="18" /></span>
    <div class="grow">
      <strong class="nm">{{ item.name }}</strong>
      <small v-if="item.kind === 'goal'" class="muted">Goal deadline · {{ money(item.left) }} to go</small>
      <small v-else class="muted">{{ item.overdue ? 'Late · was due ' + nice(item.date) : 'Due ' + nice(item.date) }}</small>
      <small v-if="item.kind === 'bill' && item.after !== null" class="aft" :class="{ bad: item.short }">{{ item.short ? 'Your accounts will not cover this' : `${money(item.after)} left after` }}</small>
    </div>
    <strong v-if="item.kind === 'bill'" class="amt num">{{ money(item.amount) }}</strong>
  </div>
</template>

<script setup lang="ts">
import type { RunwayItem } from '../utils/runway'
defineProps<{ item: RunwayItem }>()
const nice = (d: string) => new Date(d + 'T00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
</script>

<style scoped>
.rr { display:flex; align-items:center; gap:12px; padding:12px 0; min-height:60px; }
.ic { width:42px; height:42px; border-radius:14px; display:grid; place-items:center; flex:none; background:var(--soft); color:var(--ink2); }
.ic.goal { background:var(--goodbg); color:var(--good-ink); }
.grow { min-width:0; } .grow strong, .grow small { display:block; }
.nm { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.aft { margin-top:2px; font-size:.78rem; font-weight:600; color:var(--good-ink); } .aft.bad { color:var(--bad); }
.over small:nth-of-type(1) { color:var(--bad); }
.amt { flex:none; }
</style>
