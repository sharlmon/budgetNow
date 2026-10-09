<template>
  <section class="card">
    <h2>Add an expense</h2>
    <div class="row">
      <input v-model="label" placeholder="What for?" />
      <input v-model.number="amount" type="number" min="0" step="0.01" placeholder="Amount" />
    </div>
    <div class="row">
      <select v-model="category">
        <option v-for="c in CATEGORIES.filter(c => c.key !== 'debt')" :key="c.key" :value="c.key">{{ c.label }}</option>
      </select>
      <button class="fit" :disabled="!(amount > 0)" @click="add">Add</button>
    </div>
    <p v-if="over" class="bad">That puts {{ category }} over budget by {{ money(over) }}.</p>
    <ul class="list">
      <li v-for="e in state.expenses" :key="e.id">
        <span>{{ e.date }} · {{ e.label || e.category }} <small class="muted">{{ e.category }}</small></span>
        <span>{{ money(e.amount) }} <button class="ghost" @click="removeExpense(e.id)">×</button></span>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
const { state, budgeted, spent, addExpense, removeExpense } = useBudget()
const label = ref('')
const amount = ref(0)
const category = ref<Category>('needs')
const over = computed(() => Math.max(0, spent.value[category.value] + (amount.value || 0) - budgeted.value[category.value]))
function add() {
  addExpense(label.value.trim(), amount.value, category.value)
  label.value = ''
  amount.value = 0
}
</script>
