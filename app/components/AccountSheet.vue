<template>
  <Teleport to="body">
    <Transition name="as">
      <div v-if="ui.open" class="scrim" @click.self="close">
        <div class="sheet" role="dialog" aria-modal="true" :aria-label="editing ? `Edit ${editing.name}` : 'Add an account'" @keydown.esc="close">
          <button class="x" aria-label="Close" @click="close"><Icon name="x" :size="18" /></button>
          <h3>{{ editing ? editing.name : 'Add an account' }}</h3>
          <p class="muted sm lead">{{ editing ? 'Update the balance whenever it changes.' : 'Add where you keep money. You enter the balance yourself; Weka does not connect to your bank or M-Pesa, so please do not type account numbers or PINs.' }}</p>

          <label class="muted sm">Type</label>
          <div class="chips">
            <button v-for="k in ACCOUNT_KINDS" :key="k.key" :class="{ on: kind === k.key }" :style="kind === k.key ? { borderColor: k.color, background: k.color + '24' } : {}" :aria-pressed="kind === k.key" @click="pickKind(k.key)"><Icon :name="k.icon" :size="16" :style="{ color: k.color }" /> {{ k.label }}</button>
          </div>
          <div class="muted sm hint">{{ kindMeta(kind).hint }}</div>

          <label class="muted sm" for="acc-name">Name</label>
          <input id="acc-name" v-model="name" class="field" maxlength="60" placeholder="e.g. M-Pesa, Equity savings" />
          <div v-if="!editing && presets.length" class="chips presets"><button v-for="p in presets" :key="p.name" @click="name = p.name">{{ p.name }}</button></div>

          <label class="muted sm" for="acc-bal">Balance now</label>
          <AmountInput id="acc-bal" v-model="balance" placeholder="0" />

          <template v-if="kind === 'invest'">
            <label class="muted sm" for="acc-rate">Yearly return you expect (%)</label>
            <AmountInput id="acc-rate" v-model="rate" placeholder="e.g. 12" />
            <div class="muted sm hint">Optional. It is your own estimate, used only for the growth preview below. Real returns change.</div>
          </template>

          <p v-if="error" class="err" role="alert">{{ error }}</p>
          <button class="btn" :disabled="!canSave" @click="save">{{ editing ? 'Save changes' : 'Add account' }}</button>

          <section v-if="editing && kind === 'invest' && rate > 0" class="grow-box" aria-label="Growth preview">
            <h4>If you add every month</h4>
            <div class="row" style="justify-content:space-between;align-items:baseline"><b class="num big">{{ money(monthly) }}</b><span class="muted sm">for {{ months }} months</span></div>
            <input v-model.number="monthly" type="range" class="range" min="1000" max="50000" step="500" aria-label="Amount added each month" />
            <div class="months" role="group" aria-label="Months"><button v-for="m in [6, 12, 24, 36]" :key="m" :class="{ on: months === m }" :aria-pressed="months === m" @click="months = m">{{ m }} months</button></div>
            <GrowthChart :balances="proj.balances" :put="putLine" :label="`Projected growth to ${money(proj.end)}`" />
            <dl class="sum num">
              <div><dt>You would put in</dt><dd>{{ money(proj.put - (editing?.balance ?? 0)) }}</dd></div>
              <div><dt>Could earn about</dt><dd class="good">+{{ money(proj.earned) }}</dd></div>
              <div><dt>Worth at the end</dt><dd>{{ money(proj.end) }}</dd></div>
            </dl>
            <p class="muted sm">A simple preview at your {{ rate }}% estimate, compounded monthly. It is not a promise or advice.</p>
          </section>

          <button v-if="editing" class="del" @click="remove"><Icon name="trash" :size="16" /> Delete this account</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ACCOUNT_KINDS, ACCOUNT_PRESETS, kindMeta, projectGrowth, type AccountKind } from '../utils/accounts'

const ui = useAccountSheet()
const { state, addAccount, removeAccount } = useBudget()
const editing = computed(() => (ui.value.id ? state.value.accounts.find(a => a.id === ui.value.id) : undefined))

const kind = ref<AccountKind>('mobile'); const name = ref(''); const balance = ref(0); const rate = ref(0)
const monthly = ref(5000); const months = ref(12)
const presets = computed(() => ACCOUNT_PRESETS.filter(p => p.kind === kind.value))

// Fill the form each time the sheet opens.
watch(() => [ui.value.open, ui.value.id] as const, ([open]) => {
  if (!open) return
  const a = editing.value
  const pre = a ? undefined : ui.value.preset
  kind.value = a?.kind ?? pre?.kind ?? 'mobile'; name.value = a?.name ?? pre?.name ?? ''; balance.value = a?.balance ?? 0; rate.value = a?.rate ?? 0
  monthly.value = 5000; months.value = 12
}, { immediate: true })

const pickKind = (k: AccountKind) => { kind.value = k; if (k !== 'invest') rate.value = 0 }
const dup = computed(() => state.value.accounts.some(a => a.id !== editing.value?.id && a.name.trim().toLowerCase() === name.value.trim().toLowerCase()))
const error = computed(() => (dup.value && name.value.trim() ? 'You already have an account with that name.' : rate.value > 100 ? 'The yearly return cannot be over 100%.' : ''))
const canSave = computed(() => !!name.value.trim() && balance.value >= 0 && !error.value)
const proj = computed(() => projectGrowth(monthly.value, months.value, rate.value, editing.value?.balance ?? 0))
const putLine = computed(() => Array.from({ length: months.value + 1 }, (_, m) => (editing.value?.balance ?? 0) + monthly.value * m))

const close = () => { ui.value.open = false }
function save() {
  if (!canSave.value) return
  const color = editing.value && editing.value.kind === kind.value ? editing.value.color : kindMeta(kind.value).color
  const r = kind.value === 'invest' && rate.value > 0 ? rate.value : undefined
  const a = editing.value
  if (a) { Object.assign(a, { name: name.value.trim(), kind: kind.value, balance: Math.round(balance.value * 100) / 100, color }); if (r) a.rate = r; else delete a.rate; showToast(`${a.name} updated`) }
  else { addAccount({ name: name.value.trim(), kind: kind.value, balance: balance.value, color, rate: r }); showToast(`${name.value.trim()} added`) }
  close()
}
function remove() {
  const a = editing.value
  if (!a) return
  const undo = removeAccount(a.id)
  close()
  showToast(`${a.name} deleted`, undo)
}
</script>

<style scoped>
.scrim { position:fixed; inset:0; z-index:90; background:rgba(15,15,25,.5); display:flex; align-items:flex-end; justify-content:center; }
.sheet { position:relative; width:100%; max-width:480px; max-height:92dvh; overflow:auto; background:var(--surface); border-radius:28px 28px 0 0; padding:26px 20px calc(24px + env(safe-area-inset-bottom)); display:flex; flex-direction:column; gap:10px; }
.x { position:absolute; top:12px; right:12px; width:44px; height:44px; border-radius:50%; border:0; background:var(--soft); color:var(--muted); display:grid; place-items:center; cursor:pointer; }
h3 { margin:0; font-size:1.2rem; padding-right:48px; overflow-wrap:anywhere; } .lead { margin:0 0 4px; }
label { margin-top:4px; }
.hint { margin-top:-4px; }
.chips { display:flex; gap:8px; flex-wrap:wrap; }
.chips button { display:inline-flex; align-items:center; gap:7px; min-height:44px; background:var(--card); color:var(--ink); border:1.5px solid transparent; border-radius:99px; padding:0 14px; font:inherit; font-size:.85rem; font-weight:500; cursor:pointer; transition:transform .2s var(--spring); }
.chips button:active { transform:scale(.95); }
.presets button { background:var(--soft); }
.err { margin:0; color:var(--bad); font-weight:600; font-size:.85rem; }
.btn { margin-top:6px; }
.del { display:flex; align-items:center; justify-content:center; gap:8px; min-height:48px; background:none; border:0; color:var(--bad); font:inherit; font-weight:600; cursor:pointer; margin-top:4px; }
.grow-box { margin-top:10px; padding:16px; border-radius:20px; background:var(--card); display:flex; flex-direction:column; gap:8px; }
.grow-box h4 { margin:0; font-size:1rem; }
.big { font-size:1.4rem; letter-spacing:-.02em; }
.range { width:100%; accent-color:var(--accent); min-height:32px; }
.months { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; }
.months button { min-height:44px; border-radius:99px; border:1px solid var(--line); background:var(--surface); font:inherit; font-size:.8rem; font-weight:600; color:var(--ink2); cursor:pointer; }
.months button.on { background:var(--ink); color:var(--surface); border-color:var(--ink); }
.sum { margin:0; display:grid; gap:4px; font-size:.88rem; }
.sum div { display:flex; justify-content:space-between; gap:10px; } .sum dt { color:var(--muted); } .sum dd { margin:0; font-weight:700; } .sum .good { color:var(--good-ink); }
.as-enter-active, .as-leave-active { transition:opacity .2s; } .as-enter-active .sheet { animation:up .32s var(--ease); } .as-enter-from, .as-leave-to { opacity:0; }
@keyframes up { from { transform:translateY(40px); } }
@media (prefers-reduced-motion: reduce) { .as-enter-active .sheet { animation:none; } }
</style>
