<template>
  <section class="card">
    <h2>Add income → instant breakdown</h2>
    <div class="row">
      <input v-model="label" placeholder="Label (e.g. October salary)" />
      <input v-model.number="amount" type="number" min="0" step="0.01" placeholder="Amount" @input="reset" />
    </div>

    <template v-if="amount > 0">
      <p class="muted">
        Suggested split: debt minimums first ({{ money(totalMinDebt) }}), then 50% needs / 30% wants / 20% savings of the rest.
        Adjust any amount, then confirm.
      </p>
      <div class="stack">
        <div v-for="(c, i) in CATEGORIES" :key="c.key" :style="{ width: share(c.key) + '%', background: colors[i] }" />
      </div>
      <div v-for="c in CATEGORIES" :key="c.key" class="row">
        <div>
          <strong>{{ c.label }}</strong><br /><small class="muted">{{ c.hint }}</small>
        </div>
        <input v-model.number="split[c.key]" type="number" min="0" step="0.01" />
        <span class="fit muted" style="width:52px;text-align:right">{{ share(c.key).toFixed(0) }}%</span>
      </div>
      <p :class="Math.abs(diff) < 0.005 ? 'good' : 'bad'">
        <template v-if="Math.abs(diff) < 0.005">Fully allocated ✓</template>
        <template v-else-if="diff > 0">{{ money(diff) }} still unallocated</template>
        <template v-else>Over-allocated by {{ money(-diff) }}</template>
      </p>
      <div class="row">
        <button class="fit" :disabled="Math.abs(diff) >= 0.005" @click="confirm">Confirm breakdown</button>
        <button class="ghost fit" @click="reset">Reset to suggestion</button>
        <button class="ghost fit" :disabled="Math.abs(diff) < 0.005" @click="dumpToSavings">Put the difference in savings</button>
      </div>
    </template>

    <ul v-if="state.incomes.length" class="list" style="margin-top:12px">
      <li v-for="i in state.incomes" :key="i.id">
        <span>{{ i.date }} · {{ i.label || 'Income' }} <small class="muted">{{ CATEGORIES.map(c => c.label[0] + ' ' + money(i.split[c.key])).join(' · ') }}</small></span>
        <span><strong>{{ money(i.amount) }}</strong> <button class="ghost" @click="removeIncome(i.id)">×</button></span>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
const { state, totalMinDebt, addIncome, removeIncome } = useBudget()
const colors = ['#3b6cf6', '#e8a33d', '#1f9d63', '#d64545']
const label = ref('')
const amount = ref(0)
const split = reactive<Record<Category, number>>({ needs: 0, wants: 0, savings: 0, debt: 0 })

const allocated = computed(() => CATEGORIES.reduce((s, c) => s + (Number(split[c.key]) || 0), 0))
const diff = computed(() => Math.round((amount.value - allocated.value) * 100) / 100)
const share = (k: Category) => (amount.value > 0 ? ((Number(split[k]) || 0) / amount.value) * 100 : 0)

function reset() {
  Object.assign(split, suggestSplit(amount.value || 0, totalMinDebt.value))
}
function dumpToSavings() {
  split.savings = Math.round((Number(split.savings) + diff.value) * 100) / 100
}
function confirm() {
  addIncome(label.value.trim(), amount.value, { ...split })
  label.value = ''
  amount.value = 0
  Object.assign(split, { needs: 0, wants: 0, savings: 0, debt: 0 })
}
</script>
