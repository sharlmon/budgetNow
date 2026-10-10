<template>
  <nav class="actions" aria-label="Quick actions">
    <button class="act primary" @click="sheet = { open: true, mode: 'income' }"><span><Icon name="plus" :size="22" :stroke="2.4" /></span>Add money</button>
    <NuxtLink to="/bills" class="act"><span><Icon name="bill" :size="22" /><i v-if="due" class="dueflag" :aria-label="`${due} bill${due === 1 ? '' : 's'} due`">{{ due }}</i></span>Pay bill</NuxtLink>
    <button class="act" :disabled="state.accounts.length < 2" :title="state.accounts.length < 2 ? 'Add a second account to move money' : undefined" @click="mover = { open: true, from: '' }"><span><Icon name="swap" :size="22" /></span>Move</button>
    <NuxtLink to="/accounts" class="act"><span><Icon name="wallet" :size="22" /></span>Accounts</NuxtLink>
  </nav>
</template>

<script setup lang="ts">
const { state } = useBudget()
const sheet = useSheet(), mover = useMoveSheet()
/** Bills that are overdue or due within a week. */
const due = computed(() => state.value.bills.filter(b => daysBetween(today(), b.nextDue) <= 7).length)
</script>

<style scoped>
.actions { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; margin:18px 0 4px; }
.act { display:flex; flex-direction:column; align-items:center; gap:8px; min-height:44px; background:none; border:0; font:inherit; font-size:.76rem; line-height:1.2; white-space:nowrap; font-weight:600; color:var(--ink2); cursor:pointer; text-decoration:none; }
.act span { position:relative; width:56px; height:56px; border-radius:20px; background:var(--surface); border:1px solid var(--line); display:grid; place-items:center; color:var(--ink); transition:transform .15s var(--spring); }
.act:active span { transform:scale(.92); }
.act.primary span { background:var(--btn); color:#fff; border-color:transparent; box-shadow:0 10px 20px -8px rgba(239,106,58,.7); }
.act:disabled { opacity:.45; cursor:not-allowed; }
.dueflag { position:absolute; top:-5px; right:-5px; min-width:20px; height:20px; padding:0 5px; border-radius:99px; background:var(--bad); color:#fff; font-style:normal; font-size:.7rem; font-weight:700; display:grid; place-items:center; border:2px solid var(--bg); }
</style>
