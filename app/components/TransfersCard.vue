<template>
  <section v-if="list.length" aria-label="Recent transfers">
    <div class="sec"><h2>Transfers</h2><span v-if="flying > 0" class="sm muted num">{{ hide(money(flying)) }} on its way</span></div>
    <div class="card white list">
      <div v-for="t in list" :key="t.id" class="item">
        <span class="ic" :class="t.status"><Icon :name="t.status === 'failed' ? 'x' : t.status === 'settled' ? 'check' : 'repeat'" :size="18" /></span>
        <span class="grow">
          <strong>{{ t.fromName }} to {{ t.toName }}</strong>
          <small class="muted">{{ label(t) }}</small>
        </span>
        <b class="num">{{ hide(money(t.amount)) }}</b>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { inFlight, recent, type Transfer } from '../utils/transfers'

const { transfers } = useTransfers()
const { hidden } = useHideAmounts()
const hide = (s: string) => (hidden.value ? '••••••' : s)
const list = computed(() => recent(transfers.value, 5))
const flying = computed(() => inFlight(transfers.value))
const when = (iso: string) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
const label = (t: Transfer) => {
  const by = t.by === 'rule' ? ' · by your rule' : ''
  if (t.status === 'pending') return `Sending${by}`
  if (t.status === 'failed') return `Failed, money returned · ${t.reason ?? ''}${by}`
  return `Arrived ${when(t.settledAt ?? t.createdAt)}${by}`
}
</script>

<style scoped>
.list { padding:4px 16px; }
.item { display:flex; align-items:center; gap:12px; min-height:60px; padding:10px 0; }
.item + .item { border-top:1px solid var(--line); }
.ic { width:38px; height:38px; border-radius:13px; display:grid; place-items:center; flex:none; background:var(--soft); color:var(--muted); }
.ic.settled { background:var(--goodbg); color:var(--good-ink); }
.ic.failed { background:var(--warn-bg); color:var(--warn-ink); }
.grow strong, .grow small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
</style>
