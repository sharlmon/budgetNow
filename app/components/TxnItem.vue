<template>
  <div class="item">
    <CatIcon :cat="t.category" :size="42" />
    <div class="grow">
      <div class="ttl">{{ t.title }}</div>
      <small class="muted">{{ pretty }}<template v-if="t.category"> · {{ catMeta(t.category).label }}</template><template v-else> · Income</template></small>
    </div>
    <strong :class="t.kind === 'income' ? 'good' : ''" style="font-variant-numeric:tabular-nums">{{ t.kind === 'income' ? '+' : '−' }}{{ money(t.amount) }}</strong>
    <button v-if="removable" class="icon-btn" aria-label="Delete" @click="remove"><Icon name="trash" :size="15" /></button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ t: Txn; removable?: boolean }>()
const { removeExpense, removeIncome } = useBudget()
const pretty = computed(() => new Date(props.t.date + 'T00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))
function remove() {
  const undo = props.t.kind === 'income' ? removeIncome(props.t.id) : removeExpense(props.t.id)
  showToast(`${props.t.title} removed`, undo)
}
</script>

<style scoped>
.ttl { font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
</style>
