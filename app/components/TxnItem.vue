<template>
  <div class="item">
    <span class="ico" :style="{ background: (t.category ? catMeta(t.category).color : '#2fb67c') + '1f' }">{{ t.category ? catMeta(t.category).emoji : '💰' }}</span>
    <div class="grow">
      <div style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ t.title }}</div>
      <small class="muted">{{ pretty }}<template v-if="t.category"> · {{ catMeta(t.category).label }}</template></small>
    </div>
    <strong :class="t.kind === 'income' ? 'good' : ''">{{ t.kind === 'income' ? '+' : '-' }}{{ money(t.amount) }}</strong>
    <button v-if="removable" class="icon-x" aria-label="Delete" @click="remove">×</button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ t: Txn; removable?: boolean }>()
const { removeExpense, removeIncome } = useBudget()
const pretty = computed(() => new Date(props.t.date + 'T00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))
const remove = () => (props.t.kind === 'income' ? removeIncome(props.t.id) : removeExpense(props.t.id))
</script>
