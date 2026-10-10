<template>
  <div>
    <div class="hdr rise">
      <NuxtLink to="/home" class="circ" aria-label="Back"><Icon name="back" :size="22" /></NuxtLink>
      <h1 class="grow">Accounts</h1>
      <button class="circ" aria-label="Add an account" @click="openAdd()"><Icon name="plus" :size="20" :stroke="2.4" /></button>
    </div>

    <template v-if="state.accounts.length">
      <div class="rise" style="--i:1"><AccountsStack interactive :selected="selected" @select="selected = $event" /></div>

      <div class="actions rise" style="--i:2">
        <button class="act primary" :disabled="state.accounts.length < 2" @click="openMove"><span><Icon name="swap" :size="22" /></span>Move money</button>
        <button class="act" @click="openAdd()"><span><Icon name="plus" :size="22" /></span>Add account</button>
      </div>
      <p v-if="state.accounts.length < 2" class="muted sm rise" style="--i:2;text-align:center;margin:0 0 6px">Add a second account to move money between them.</p>

      <div v-if="expected > 0" class="card tint rise" style="--i:3">
        <span class="ti"><Icon name="trend" :size="20" /></span>
        <div class="grow"><strong>Investments could earn about {{ hide(money(expected)) }} a year</strong><div class="muted sm">Based on the yearly returns you entered. Not a promise.</div></div>
      </div>

      <div class="sec rise" style="--i:4"><h2>Your accounts</h2><span class="sm muted">{{ state.accounts.length }}</span></div>
      <div class="card white list rise" style="--i:4">
        <button v-for="a in state.accounts" :key="a.id" class="item" :class="{ on: selected === a.id }" @click="openEdit(a.id)">
          <span class="ic" :style="{ background: a.color, color: inkOn(a.color) }"><Icon :name="kindMeta(a.kind).icon" :size="19" /></span>
          <span class="grow"><strong>{{ a.name }}</strong><small class="muted">{{ kindMeta(a.kind).label }}<template v-if="a.rate"> · {{ a.rate }}% a year</template></small></span>
          <b class="num">{{ hide(money(a.balance)) }}</b>
        </button>
      </div>
      <p class="note muted sm">Balances are entered by you. Weka does not connect to your bank, M-Pesa or any other provider, and never asks for their logins.</p>
    </template>

    <div v-else class="card empty rise" style="--i:1">
      <div class="art"><Icon name="wallet" :size="28" /></div>
      <h2 style="margin-bottom:4px">Where is your money?</h2>
      <p class="muted" style="margin:0 0 16px">Add M-Pesa, your bank, PayPal, cash or an investment to see everything in one place and record moves between them. You enter the balances yourself.</p>
      <div class="chips"><button v-for="p in ACCOUNT_PRESETS" :key="p.name" @click="openAdd(p)">{{ p.name }}</button></div>
      <button class="btn" style="margin-top:14px" @click="openAdd()"><Icon name="plus" :size="18" :stroke="2.6" /> Add an account</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ACCOUNT_PRESETS, inkOn, kindMeta, type AccountKind } from '../utils/accounts'

useSeoMeta({ title: 'Accounts' })
const { state } = useBudget()
const { hidden } = useHideAmounts()
const sheet = useAccountSheet(), mover = useMoveSheet()
const selected = ref<string | null>(null)
const hide = (s: string) => (hidden.value ? '••••••' : s)
const expected = computed(() => Math.round(state.value.accounts.reduce((s, a) => s + (a.rate ? a.balance * a.rate / 100 : 0), 0)))

const openAdd = (preset?: { name: string; kind: AccountKind }) => { sheet.value = { open: true, id: null, preset } }
const openEdit = (id: string) => { sheet.value = { open: true, id } }
const openMove = () => { mover.value = { open: true, from: selected.value ?? '' } }
</script>

<style scoped>
.hdr h1 { margin:0; font-size:1.5rem; }
.actions { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; margin:16px 0 12px; max-width:320px; margin-inline:auto; }
.act { display:flex; flex-direction:column; align-items:center; gap:8px; min-height:44px; background:none; border:0; font:inherit; font-size:.78rem; font-weight:600; color:var(--ink2); cursor:pointer; text-decoration:none; }
.act span { width:56px; height:56px; border-radius:20px; background:var(--surface); border:1px solid var(--line); display:grid; place-items:center; color:var(--ink); transition:transform .15s var(--spring); }
.act:active span { transform:scale(.92); }
.act.primary span { background:var(--btn); color:#fff; border-color:transparent; box-shadow:0 10px 20px -8px rgba(239,106,58,.7); }
.act:disabled { opacity:.45; cursor:not-allowed; }
.tint { display:flex; align-items:center; gap:12px; background:var(--tint-accent-soft); border-color:var(--tint-accent-line); margin-top:8px; }
.ti { width:42px; height:42px; border-radius:14px; background:linear-gradient(145deg,var(--tint-accent),var(--tint-accent2)); color:var(--accent); display:grid; place-items:center; flex:none; }
.list { padding:4px 16px; }
.item { width:100%; display:flex; align-items:center; gap:12px; background:none; border:0; text-align:left; font:inherit; color:var(--ink); min-height:64px; cursor:pointer; padding:10px 0; }
.item + .item { border-top:1px solid var(--line); }
.ic { width:42px; height:42px; border-radius:14px; display:grid; place-items:center; flex:none; }
.item .grow strong, .item .grow small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.item.on strong { color:var(--accent); }
.note { margin:12px 2px 0; line-height:1.5; }
.chips { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; }
.chips button { min-height:44px; padding:0 16px; border-radius:99px; border:1.5px solid var(--line); background:var(--surface); font:inherit; font-weight:600; font-size:.85rem; color:var(--ink); cursor:pointer; }
</style>
