<template>
  <section aria-label="Standing rules">
    <div class="sec"><h2>Standing rules</h2><button v-if="!adding && accounts.length > 1" class="link" @click="open">Add a rule <Icon name="plus" :size="14" /></button></div>

    <div v-if="due.length" class="card tint ready" role="status">
      <div v-for="p in manual" :key="p.rule.id" class="row ask">
        <span class="grow"><strong>{{ hide(money(p.amount)) }} is ready to sweep</strong><small class="muted">{{ name(p.rule.fromId) }} to {{ name(p.rule.toId) }}<template v-if="p.reserve > 0"> · {{ hide(money(p.reserve)) }} kept for bills</template></small></span>
        <button class="btn sm" @click="approve(p)">Send</button>
      </div>
    </div>

    <div v-if="rules.length" class="card white list">
      <div v-for="r in rules" :key="r.id" class="item">
        <span class="grow">
          <strong>{{ name(r.fromId) }} to {{ name(r.toId) }}</strong>
          <small class="muted">Keep {{ hide(money(r.keep)) }}<template v-if="r.billDays"> and bills due in {{ r.billDays }} days</template> · {{ r.auto ? 'runs by itself' : 'asks first' }}</small>
        </span>
        <Toggle :model-value="r.on" :aria-label="`Rule ${name(r.fromId)} to ${name(r.toId)}`" @update:model-value="toggleRule(r.id)" />
        <button class="rm" :aria-label="`Delete rule ${name(r.fromId)} to ${name(r.toId)}`" @click="removeRule(r.id)"><Icon name="trash" :size="17" /></button>
      </div>
    </div>
    <p v-else-if="!adding" class="muted sm note">Set a rule once, for example keep KSh 5,000 in M-Pesa and sweep the rest into your money market fund, and Fluxa holds back what your bills need first.</p>

    <form v-if="adding" class="card white form" @submit.prevent="save">
      <label class="lab" for="rf">From</label>
      <select id="rf" v-model="f.fromId" class="field"><option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.name }}</option></select>
      <label class="lab" for="rt">Sweep into</label>
      <select id="rt" v-model="f.toId" class="field"><option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.name }}</option></select>
      <label class="lab" for="rk">Always keep in the first account</label>
      <AmountInput id="rk" v-model="f.keep" placeholder="0" />
      <label class="lab" for="rb">Also hold back what bills need</label>
      <select id="rb" v-model.number="f.billDays" class="field"><option :value="0">Ignore bills</option><option :value="3">Bills due in 3 days</option><option :value="7">Bills due in 7 days</option><option :value="14">Bills due in 14 days</option></select>
      <div class="row sw"><span class="grow"><strong>Run by itself</strong><small class="muted">Otherwise Fluxa asks you first.</small></span><Toggle v-model="f.auto" aria-label="Run by itself" /></div>
      <p class="err" role="alert">{{ err }}</p>
      <div class="row btns"><button type="button" class="btn ghost" @click="adding = false">Cancel</button><button class="btn" type="submit">Save rule</button></div>
    </form>
  </section>
</template>

<script setup lang="ts">
import type { Proposal } from '../utils/sweep'

const { state } = useBudget()
const { rules, due, addRule, removeRule, toggleRule, run } = useTransfers()
const { hidden } = useHideAmounts()
const hide = (s: string) => (hidden.value ? '••••••' : s)
const accounts = computed(() => state.value.accounts)
const name = (id: string) => accounts.value.find(a => a.id === id)?.name ?? 'Removed account'
const manual = computed(() => due.value.filter(p => !p.rule.auto))

const adding = ref(false)
const err = ref('')
const f = reactive({ fromId: '', toId: '', keep: 0, billDays: 7, auto: false })
function open() {
  const list = accounts.value
  f.fromId = (list.find(a => a.kind === 'mobile') ?? list[0])?.id ?? ''
  f.toId = (list.find(a => a.kind === 'invest' && a.id !== f.fromId) ?? list.find(a => a.id !== f.fromId))?.id ?? ''
  f.keep = 0; f.billDays = 7; f.auto = false; err.value = ''; adding.value = true
}
function save() {
  const res = addRule({ fromId: f.fromId, toId: f.toId, keep: f.keep, billDays: f.billDays, min: 100, auto: f.auto })
  if ('error' in res) { err.value = res.error; return }
  adding.value = false
  showToast('Rule saved')
}
function approve(p: Proposal) {
  const res = run(p)
  if ('error' in res) { showToast(res.error); return }
  showToast(`Sending ${money(p.amount)} from ${name(p.rule.fromId)} to ${name(p.rule.toId)}`)
}
</script>

<style scoped>
.list { padding:4px 16px; }
.item { display:flex; align-items:center; gap:12px; min-height:64px; padding:10px 0; }
.item + .item { border-top:1px solid var(--line); }
.grow strong, .grow small { display:block; }
.item .grow small { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.rm { width:44px; height:44px; border-radius:50%; border:0; background:none; color:var(--muted); display:grid; place-items:center; cursor:pointer; }
.ready { margin-bottom:12px; }
.ask { align-items:center; gap:12px; } .ask + .ask { margin-top:10px; }
.note { margin:4px 2px 0; line-height:1.5; }
.form { display:flex; flex-direction:column; gap:8px; margin-top:12px; }
.lab { font-size:.74rem; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; margin-top:6px; }
.sw { align-items:center; gap:12px; margin-top:6px; }
.err { margin:0; min-height:1.2em; color:var(--bad); font-weight:600; font-size:.85rem; }
.btns { gap:10px; justify-content:flex-end; }
.link { background:none; border:0; font:inherit; cursor:pointer; min-height:44px; }
</style>
