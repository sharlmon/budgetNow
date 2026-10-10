<template>
  <Teleport to="body">
    <Transition name="ms">
      <div v-if="ui.open" class="scrim" @click.self="close">
        <div class="sheet" role="dialog" aria-modal="true" aria-label="Move money between accounts" @keydown.esc="close">
          <button class="x" aria-label="Close" @click="close"><Icon name="x" :size="18" /></button>
          <h3>Move money</h3>
          <p class="muted sm lead">Record money moving between your own accounts. Make the actual transfer in your bank or M-Pesa app.</p>

          <span class="lab" id="from-lab">From</span>
          <div class="accs" role="group" aria-labelledby="from-lab"><button v-for="a in accounts" :key="a.id" class="acc" :aria-pressed="from === a.id" @click="pick('from', a.id)"><b><i class="dot" :style="{ background: a.color }" />{{ a.name }}</b><small class="num">{{ money(a.balance) }}</small></button></div>

          <button class="swap" aria-label="Swap the two accounts" @click="flip"><Icon name="swap" :size="18" /></button>

          <span class="lab" id="to-lab">To</span>
          <div class="accs" role="group" aria-labelledby="to-lab"><button v-for="a in accounts" :key="a.id" class="acc" :aria-pressed="to === a.id" @click="pick('to', a.id)"><b><i class="dot" :style="{ background: a.color }" />{{ a.name }}</b><small class="num">{{ money(a.balance) }}</small></button></div>

          <label class="lab" for="mv-amt">Amount</label>
          <AmountInput id="mv-amt" v-model="amount" placeholder="0" />
          <div class="quick"><button v-for="n in quick" :key="n" @click="amount = Math.round((amount + n) * 100) / 100">+{{ n.toLocaleString('en-US') }}</button><button v-if="fromAcc && fromAcc.balance > 0" @click="amount = Math.max(0, fromAcc.balance - fee)">All</button></div>

          <label class="lab" for="mv-fee">Fee (optional)</label>
          <AmountInput id="mv-fee" v-model="fee" placeholder="0" />

          <dl v-if="fromAcc && toAcc && amount > 0" class="sum num">
            <div><dt>{{ fromAcc.name }} after</dt><dd>{{ money(Math.max(0, fromAcc.balance - amount - fee)) }}</dd></div>
            <div><dt>{{ toAcc.name }} after</dt><dd>{{ money(toAcc.balance + amount) }}</dd></div>
          </dl>
          <p class="err" role="alert">{{ shown }}</p>
          <button class="btn" :disabled="!!problem" @click="go"><Icon name="swap" :size="18" /> Record move</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { moveProblem } from '../utils/accounts'

const ui = useMoveSheet()
const { state, moveMoney } = useBudget()
const accounts = computed(() => state.value.accounts)
const from = ref(''); const to = ref(''); const amount = ref(0); const fee = ref(0)
const touched = ref(false)
const quick = [500, 1000, 5000, 10000]
const fromAcc = computed(() => accounts.value.find(a => a.id === from.value))
const toAcc = computed(() => accounts.value.find(a => a.id === to.value))
const problem = computed(() => moveProblem(fromAcc.value, toAcc.value, amount.value, fee.value))
// Only scold once the person has typed an amount, so the sheet does not open full of errors.
const shown = computed(() => (touched.value || amount.value > 0 ? problem.value ?? '' : ''))

watch(() => ui.value.open, (open) => {
  if (!open) return
  const list = accounts.value
  from.value = ui.value.from && list.some(a => a.id === ui.value.from) ? ui.value.from : (list.find(a => a.balance > 0) ?? list[0])?.id ?? ''
  to.value = list.find(a => a.id !== from.value)?.id ?? ''
  amount.value = 0; fee.value = 0; touched.value = false
}, { immediate: true })

function pick(which: 'from' | 'to', id: string) {
  if (which === 'from') { from.value = id; if (to.value === id) to.value = accounts.value.find(a => a.id !== id)?.id ?? '' }
  else { to.value = id; if (from.value === id) from.value = accounts.value.find(a => a.id !== id)?.id ?? '' }
}
const flip = () => { [from.value, to.value] = [to.value, from.value] }
const close = () => { ui.value.open = false }
function go() {
  touched.value = true
  const f = fromAcc.value, t = toAcc.value, amt = amount.value
  const res = moveMoney(from.value, to.value, amt, fee.value)
  if ('error' in res) return
  close()
  showToast(`Moved ${money(amt)} from ${f?.name} to ${t?.name}`, res.undo)
}
</script>

<style scoped>
.scrim { position:fixed; inset:0; z-index:90; background:rgba(15,15,25,.5); display:flex; align-items:flex-end; justify-content:center; }
.sheet { position:relative; width:100%; max-width:480px; max-height:92dvh; overflow:auto; background:var(--surface); border-radius:28px 28px 0 0; padding:26px 20px calc(24px + env(safe-area-inset-bottom)); display:flex; flex-direction:column; gap:8px; }
.x { position:absolute; top:12px; right:12px; width:44px; height:44px; border-radius:50%; border:0; background:var(--soft); color:var(--muted); display:grid; place-items:center; cursor:pointer; }
h3 { margin:0; font-size:1.2rem; } .lead { margin:0 0 4px; }
.lab { font-size:.74rem; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; margin-top:8px; display:block; }
.accs { display:flex; gap:8px; overflow-x:auto; padding-bottom:4px; scrollbar-width:thin; }
.acc { flex:none; min-width:132px; max-width:200px; text-align:left; padding:10px 12px; border-radius:16px; background:var(--card); border:2px solid transparent; min-height:60px; font:inherit; color:var(--ink); cursor:pointer; }
.acc[aria-pressed="true"] { border-color:var(--accent); background:var(--surface); }
.acc b { display:flex; gap:7px; align-items:center; font-size:.86rem; } .acc b { overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
.acc small { color:var(--muted); }
.dot { width:9px; height:9px; border-radius:50%; flex:none; display:block; }
.swap { align-self:center; width:44px; height:44px; border-radius:50%; background:var(--soft); border:0; color:var(--ink); display:grid; place-items:center; cursor:pointer; transform:rotate(90deg); margin:2px 0 -2px; }
.quick { display:flex; gap:8px; flex-wrap:wrap; }
.quick button { min-height:44px; padding:0 14px; border-radius:99px; border:0; background:var(--soft); font:inherit; font-weight:600; font-size:.84rem; color:var(--ink); cursor:pointer; }
.sum { margin:6px 0 0; padding:12px 14px; border-radius:16px; background:var(--card); display:grid; gap:4px; font-size:.88rem; }
.sum div { display:flex; justify-content:space-between; gap:10px; } .sum dt { color:var(--muted); } .sum dd { margin:0; font-weight:700; }
.err { margin:0; min-height:1.2em; color:var(--bad); font-weight:600; font-size:.85rem; }
.ms-enter-active, .ms-leave-active { transition:opacity .2s; } .ms-enter-active .sheet { animation:up .32s var(--ease); } .ms-enter-from, .ms-leave-to { opacity:0; }
@keyframes up { from { transform:translateY(40px); } }
@media (prefers-reduced-motion: reduce) { .ms-enter-active .sheet { animation:none; } }
</style>
