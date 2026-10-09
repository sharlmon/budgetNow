<template>
  <div class="card white rule">
    <div class="row">
      <span class="ic"><Icon name="chart" :size="20" /></span>
      <div class="grow"><h2>Default split</h2><div class="muted sm">Currently {{ splitLabel(splitRule) }}: Needs / Wants / Savings</div></div>
    </div>
    <p class="muted sm note">How each pay is divided after your debt minimums. It applies to new income. Past income keeps the split you confirmed.</p>

    <div class="chips" role="group" aria-label="Split presets">
      <button v-for="p in SPLIT_PRESETS" :key="p.label" :class="{ on: !custom && sameSplit(p.rule, splitRule) }" @click="choose(p.rule)">
        <strong>{{ splitLabel(p.rule) }}</strong><small>{{ p.label }}</small>
      </button>
      <button :class="{ on: custom }" @click="startCustom"><strong>Custom</strong><small>Your own</small></button>
    </div>

    <div v-if="custom" class="custom">
      <div class="trio">
        <label v-for="f in fields" :key="f.key"><span :style="{ color: f.color }">{{ f.label }}</span>
          <div class="pct"><input v-model.number="draft[f.key]" type="number" min="0" max="100" step="1" inputmode="numeric" class="field" :aria-label="`${f.label} percent`" /><i>%</i></div>
        </label>
      </div>
      <div class="bar3" aria-hidden="true"><i v-for="f in fields" :key="f.key" :style="{ width: Math.max(0, Math.min(100, draft[f.key] || 0)) + '%', background: f.color }" /></div>
      <p class="sm" :class="valid ? 'good' : 'bad'">{{ valid ? 'Adds up to 100%' : `Adds up to ${total}%. It must be exactly 100%.` }}</p>
      <button class="btn" :disabled="!valid" @click="save">Save split</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { SPLIT_PRESETS, isValidSplit, sameSplit, splitLabel, type SplitRule } from '../utils/split'

const fields = [
  { key: 'needs', label: 'Needs', color: '#ef6a3a' },
  { key: 'wants', label: 'Wants', color: '#f5c242' },
  { key: 'savings', label: 'Savings', color: '#2fb67c' },
] as const

const isPreset = (r: SplitRule) => SPLIT_PRESETS.some(p => sameSplit(p.rule, r))
const custom = ref(!isPreset(splitRule.value))
const draft = reactive<SplitRule>({ ...splitRule.value })
const total = computed(() => (Number(draft.needs) || 0) + (Number(draft.wants) || 0) + (Number(draft.savings) || 0))
const valid = computed(() => isValidSplit({ needs: Number(draft.needs), wants: Number(draft.wants), savings: Number(draft.savings) }))

function choose(rule: SplitRule) {
  custom.value = false
  splitRule.value = { ...rule }
  Object.assign(draft, rule)
  showToast(`Default split is now ${splitLabel(rule)}`)
}
function startCustom() { custom.value = true; Object.assign(draft, splitRule.value) }
function save() {
  if (!valid.value) return
  splitRule.value = { needs: Number(draft.needs), wants: Number(draft.wants), savings: Number(draft.savings) }
  if (isPreset(splitRule.value)) custom.value = false
  showToast(`Default split is now ${splitLabel(splitRule.value)}`)
}
// If the rule changes from elsewhere (a sync from another device), reflect it here.
watch(splitRule, (r) => { Object.assign(draft, r); if (!custom.value) custom.value = !isPreset(r) }, { deep: true })
</script>

<style scoped>
.rule { margin-bottom:12px; }
.ic { width:42px; height:42px; border-radius:14px; background:#fff1ea; color:var(--accent); display:grid; place-items:center; flex:none; }
.note { margin:12px 0 14px; }
.chips { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
.chips button { display:flex; flex-direction:column; align-items:center; gap:2px; padding:11px 6px; border-radius:16px; border:1.5px solid var(--line); background:#fff; font:inherit; color:var(--ink); cursor:pointer; transition:transform .15s var(--spring), border-color .2s, background .2s; }
.chips button:active { transform:scale(.95); }
.chips button.on { border-color:var(--accent); background:#fff4ee; }
.chips strong { font-size:.95rem; letter-spacing:-.01em; } .chips small { color:var(--muted); font-size:.72rem; }
.custom { margin-top:16px; padding-top:16px; border-top:1px solid var(--line); display:flex; flex-direction:column; gap:12px; }
.trio { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
.trio label { display:flex; flex-direction:column; gap:6px; font-size:.82rem; font-weight:600; }
.pct { position:relative; } .pct .field { padding-right:28px; } .pct i { position:absolute; right:12px; top:50%; transform:translateY(-50%); font-style:normal; color:var(--muted); }
.bar3 { display:flex; height:10px; border-radius:99px; overflow:hidden; background:#ececf1; gap:2px; } .bar3 i { display:block; transition:width .25s; }
</style>
