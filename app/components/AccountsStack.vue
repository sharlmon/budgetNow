<template>
  <div class="stack" :style="{ height: `${shown.length * STEP + 164}px` }">
    <template v-for="(a, i) in shown" :key="a.id">
      <button v-if="interactive" class="band" :class="{ sel: selected === a.id }" :style="bandStyle(a, i)" :aria-label="`Show ${a.name}`" :aria-pressed="selected === a.id" @click="$emit('select', selected === a.id ? null : a.id)"><span>{{ a.name }}</span></button>
      <div v-else class="band" :style="bandStyle(a, i)" aria-hidden="true"><span>{{ a.name }}</span></div>
    </template>
    <div v-if="extra" class="band more" :style="{ top: shown.length * STEP + 'px' }" aria-hidden="true"><span>+{{ extra }} more</span></div>
    <div class="front" :style="{ top: (shown.length + (extra ? 1 : 0)) * STEP - 6 + 'px' }">
      <svg class="wave" viewBox="0 0 400 56" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0h400v22c-60 24-120-6-190 6S70 40 0 26z" :fill="current ? current.color : '#ef6a3a'" opacity=".92" /></svg>
      <button v-if="interactive && current" class="showall" @click="$emit('select', null)">Show total</button>
      <div class="lbl"><i v-if="current" class="dot" :style="{ background: current.color }" />{{ current ? current.name : 'Across your accounts' }}</div>
      <div class="amt num">{{ hidden ? '••••••' : money(current ? current.balance : accountsTotal) }}</div>
      <div class="meta">{{ meta }}</div>
      <button v-if="interactive" class="eye" :aria-label="hidden ? 'Show amounts' : 'Hide amounts'" :aria-pressed="hidden" @click="toggle"><Icon :name="hidden ? 'eyeoff' : 'eye'" :size="20" /></button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inkOn, kindMeta } from '../utils/accounts'

const MAX = 5, STEP = 30
const props = defineProps<{ selected?: string | null; interactive?: boolean }>()
defineEmits<{ select: [string | null] }>()
const { state, accountsTotal } = useBudget()
const { hidden, toggle } = useHideAmounts()

const shown = computed(() => state.value.accounts.slice(0, state.value.accounts.length > MAX ? MAX - 1 : MAX))
const extra = computed(() => (state.value.accounts.length > MAX ? state.value.accounts.length - (MAX - 1) : 0))
const current = computed(() => (props.interactive && props.selected ? state.value.accounts.find(a => a.id === props.selected) : undefined))
const meta = computed(() => {
  const c = current.value
  if (c) return c.rate ? `${kindMeta(c.kind).label} · ${c.rate}% a year expected` : kindMeta(c.kind).label
  const n = state.value.accounts.length
  return `${n} account${n === 1 ? '' : 's'} · entered by you`
})
const bandStyle = (a: { color: string }, i: number) => ({ top: i * STEP + 'px', background: a.color, color: inkOn(a.color), zIndex: i + 1 })
</script>

<style scoped>
.stack { position:relative; }
.band { position:absolute; left:0; right:0; height:130px; border-radius:26px; padding:7px 20px 0; display:flex; justify-content:flex-end; align-items:flex-start; font:inherit; font-weight:700; font-size:.8rem; text-align:right; border:0; transition:transform .35s cubic-bezier(.3,1.4,.5,1); animation:slide .7s var(--ease) both; }
button.band { cursor:pointer; }
button.band:active { transform:translateY(-3px); }
.band.sel { transform:translateY(-5px); box-shadow:0 8px 20px -8px rgba(0,0,0,.45); }
.band.more { background:var(--soft); color:var(--muted); z-index:9; }
.band span { display:block; line-height:18px; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.front { position:absolute; left:0; right:0; z-index:30; min-height:176px; border-radius:28px; padding:22px; display:flex; flex-direction:column; justify-content:flex-end; background:var(--vault); color:var(--vault-ink); overflow:hidden; box-shadow:0 26px 40px -22px rgba(0,0,0,.55), inset 0 0 0 1px rgba(255,255,255,.06); animation:slide .8s .1s var(--ease) both; }
.wave { position:absolute; inset:0 0 auto 0; width:100%; height:56px; }
.lbl { position:relative; display:flex; align-items:center; gap:8px; font-size:.82rem; color:var(--vault-muted); }
.dot { width:9px; height:9px; border-radius:50%; flex:none; }
.amt { position:relative; font-size:2.3rem; font-weight:700; letter-spacing:-.03em; line-height:1.15; margin-top:2px; overflow-wrap:anywhere; }
.meta { position:relative; font-size:.78rem; color:var(--vault-muted); margin-top:4px; padding-right:52px; }
.eye { position:absolute; right:12px; bottom:12px; width:44px; height:44px; border-radius:50%; display:grid; place-items:center; color:var(--vault-muted); background:none; border:0; cursor:pointer; }
.showall { position:absolute; right:14px; top:14px; min-height:44px; padding:0 14px; border-radius:99px; border:0; background:rgba(255,255,255,.12); color:var(--vault-ink); font:inherit; font-size:.78rem; font-weight:600; cursor:pointer; z-index:2; }
@keyframes slide { from { opacity:0; transform:translateY(24px); } }
@media (prefers-reduced-motion: reduce) { .band, .front { animation:none; transition:none; } }
</style>
