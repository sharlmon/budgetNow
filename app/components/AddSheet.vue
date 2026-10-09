<template>
  <Transition name="fade">
    <div v-if="sheet.open" class="scrim" @click.self="close">
      <div class="sheet">
        <div class="grab" />
        <div class="seg" style="margin-bottom:14px">
          <button :class="{ on: sheet.mode === 'income' }" @click="sheet.mode = 'income'; step = 1">Money in</button>
          <button :class="{ on: sheet.mode === 'expense' }" @click="sheet.mode = 'expense'">Expense</button>
        </div>

        <!-- INCOME: step 1 amount -->
        <template v-if="sheet.mode === 'income' && step === 1">
          <p class="muted center">How much came in?</p>
          <div class="cur-wrap"><span class="cur muted">{{ symbol }}</span><AmountInput v-model="amount" big /></div>
          <input v-model="label" class="field" placeholder="Label (e.g. October salary)" style="margin:10px 0 16px" />
          <button class="btn" :disabled="!(amount > 0)" @click="toBreakdown">See my breakdown →</button>
        </template>

        <!-- INCOME: step 2 breakdown -->
        <template v-else-if="sheet.mode === 'income'">
          <div class="row" style="justify-content:space-between">
            <div><div class="muted" style="font-size:.8rem">Breakdown of</div><strong style="font-size:1.4rem">{{ money(amount) }}</strong></div>
            <button class="link" @click="step = 1">Edit amount</button>
          </div>
          <div class="stack">
            <i v-for="c in CATEGORIES" :key="c.key" :style="{ width: pct(c.key) + '%', background: c.color }" />
          </div>
          <p v-if="totalMinDebt > 0" class="muted" style="font-size:.8rem;margin:0 0 8px">💳 Debt minimums ({{ money(totalMinDebt) }}) are covered first; the rest follows 50/30/20.</p>
          <div v-for="c in CATEGORIES" :key="c.key" class="cat">
            <div class="row">
              <span class="ico" :style="{ background: c.color + '22' }">{{ c.emoji }}</span>
              <div class="grow"><strong>{{ c.label }}</strong> <small class="muted">{{ pct(c.key).toFixed(0) }}%</small></div>
              <div style="width:110px"><AmountInput :model-value="split[c.key]" @update:model-value="v => setCat(c.key, v)" /></div>
            </div>
            <input type="range" min="0" :max="amount" step="1" :value="split[c.key]" :style="{ accentColor: c.color }" @input="e => setCat(c.key, +(e.target as HTMLInputElement).value)" />
          </div>
          <button class="btn" style="margin-top:12px" @click="confirm">Looks good — confirm</button>
          <button class="link" style="display:block;margin:12px auto 0" @click="resetSplit">Reset to suggestion</button>
        </template>

        <!-- EXPENSE -->
        <template v-else>
          <p class="muted center">How much did you spend?</p>
          <div class="cur-wrap"><span class="cur muted">{{ symbol }}</span><AmountInput v-model="eAmount" big /></div>
          <div class="chips">
            <button v-for="c in spendCats" :key="c.key" :class="{ on: eCat === c.key }" :style="eCat === c.key ? { borderColor: c.color, background: c.color + '22' } : {}" @click="eCat = c.key">{{ c.emoji }} {{ c.label }}</button>
          </div>
          <p class="muted center" style="font-size:.85rem">{{ money(Math.max(0, left)) }} left in {{ catMeta(eCat).label }}</p>
          <p v-if="over > 0" class="bad center" style="font-size:.85rem;margin-top:-6px">This puts you {{ money(over) }} over budget.</p>
          <input v-model="eLabel" class="field" placeholder="What was it for?" style="margin:6px 0 16px" />
          <button class="btn" :disabled="!(eAmount > 0)" @click="addExp">Add expense</button>
        </template>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const sheet = useSheet()
const { budgeted, spent, totalMinDebt, addIncome, addExpense } = useBudget()
const symbol = computed(() => (0).toLocaleString(undefined, { style: 'currency', currency: currency.value, minimumFractionDigits: 0 }).replace(/[\d\s.,]/g, ''))

const step = ref(1)
const amount = ref(0)
const label = ref('')
const split = reactive<Record<Category, number>>({ needs: 0, wants: 0, savings: 0, debt: 0 })
const r2 = (n: number) => Math.round(n * 100) / 100
const pct = (k: Category) => (amount.value > 0 ? (split[k] / amount.value) * 100 : 0)

function resetSplit() { Object.assign(split, suggestSplit(amount.value, totalMinDebt.value)) }
function toBreakdown() { resetSplit(); step.value = 2 }
/** Set one category and spread the change across the others so the total always matches. */
function setCat(k: Category, v: number) {
  const total = amount.value
  v = Math.min(total, Math.max(0, r2(v)))
  const others = CATEGORIES.map(c => c.key).filter(x => x !== k)
  const rest = r2(total - v)
  const oldSum = others.reduce((s, x) => s + split[x], 0)
  let acc = 0
  others.forEach((x, i) => {
    const n = i === others.length - 1 ? r2(rest - acc) : oldSum > 0 ? r2(rest * split[x] / oldSum) : r2(rest / others.length)
    split[x] = Math.max(0, n); acc += split[x]
  })
  split[k] = r2(total - others.reduce((s, x) => s + split[x], 0))
}
function confirm() {
  addIncome(label.value.trim(), amount.value, { ...split })
  close()
}

const spendCats = CATEGORIES.filter(c => c.key !== 'debt')
const eAmount = ref(0)
const eLabel = ref('')
const eCat = ref<Category>('needs')
const left = computed(() => budgeted.value[eCat.value] - spent.value[eCat.value])
const over = computed(() => eAmount.value - left.value)
function addExp() {
  addExpense(eLabel.value.trim(), eAmount.value, eCat.value)
  close()
}

function close() {
  sheet.value.open = false
  step.value = 1; amount.value = 0; label.value = ''; eAmount.value = 0; eLabel.value = ''
}
</script>

<style scoped>
.scrim { position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:50; display:flex; justify-content:center; align-items:flex-end; }
.sheet { width:100%; max-width:480px; max-height:92dvh; overflow:auto; background:var(--surface); border-radius:26px 26px 0 0; padding:10px 18px calc(22px + env(safe-area-inset-bottom)); animation:up .25s ease; }
.grab { width:40px; height:4px; border-radius:9px; background:var(--line); margin:0 auto 14px; }
.center { text-align:center; margin:4px 0; }
.cur-wrap { display:flex; align-items:center; justify-content:center; gap:4px; }
.cur { font-size:1.8rem; font-weight:600; }
.cur-wrap > :deep(input) { width:auto; min-width:0; flex:0 1 220px; }
.stack { display:flex; height:12px; border-radius:99px; overflow:hidden; gap:2px; margin:14px 0; }
.stack i { display:block; transition:width .25s; }
.cat { padding:8px 0; } .cat + .cat { border-top:1px solid var(--line); }
.cat input[type=range] { width:100%; margin:6px 0 0; }
.chips { display:flex; gap:8px; margin:12px 0 8px; flex-wrap:wrap; justify-content:center; }
.chips button { background:var(--surface2); color:var(--ink); border:1.5px solid transparent; border-radius:99px; padding:9px 14px; font:inherit; cursor:pointer; }
.fade-enter-active,.fade-leave-active { transition:opacity .2s; } .fade-enter-from,.fade-leave-to { opacity:0; }
@keyframes up { from { transform:translateY(40px); opacity:.6; } }
</style>
