<template>
  <section class="card">
    <h2>Where your money stands</h2>
    <p v-if="!state.incomes.length" class="muted">Add your first income below to get a breakdown.</p>
    <template v-else>
      <p>
        Income <strong>{{ money(totalIncome) }}</strong> ·
        Spent <strong>{{ money(totalSpent) }}</strong> ·
        Left <strong :class="left < 0 ? 'bad' : 'good'">{{ money(left) }}</strong>
      </p>
      <div v-for="c in CATEGORIES" :key="c.key" style="margin-bottom:10px">
        <div class="row" style="margin:0">
          <span>{{ c.label }}</span>
          <span style="text-align:right" :class="{ bad: remaining(c.key) < 0 }">
            {{ money(spent[c.key]) }} / {{ money(budgeted[c.key]) }}
            <small class="muted">({{ money(remaining(c.key)) }} left)</small>
          </span>
        </div>
        <div class="bar"><i :style="{ width: pct(c.key) + '%' }" :class="{ over: remaining(c.key) < 0 }" /></div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
const { state, budgeted, spent, totalIncome } = useBudget()
const totalSpent = computed(() => CATEGORIES.reduce((s, c) => s + spent.value[c.key], 0))
const left = computed(() => totalIncome.value - totalSpent.value)
const remaining = (k: Category) => budgeted.value[k] - spent.value[k]
const pct = (k: Category) => (budgeted.value[k] > 0 ? Math.min(100, (spent.value[k] / budgeted.value[k]) * 100) : spent.value[k] > 0 ? 100 : 0)
</script>

<style scoped>
.over { background: var(--bad); }
</style>
