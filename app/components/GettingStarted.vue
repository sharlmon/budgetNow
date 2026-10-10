<template>
  <section v-if="guide.visible.value" class="card white gs" aria-labelledby="gs-h">
    <div class="top">
      <div class="grow">
        <h2 id="gs-h">Get set up</h2>
        <div class="muted sm">{{ guide.progress.value.done }} of {{ guide.progress.value.total }} done</div>
      </div>
      <button class="x" aria-label="Hide the setup guide" @click="guide.hide"><Icon name="x" :size="18" /></button>
    </div>
    <div class="bar" role="progressbar" aria-label="Setup progress" :aria-valuenow="guide.progress.value.done" aria-valuemin="0" :aria-valuemax="guide.progress.value.total"><i :style="{ width: (guide.progress.value.done / guide.progress.value.total) * 100 + '%', background: 'var(--btn)' }" /></div>

    <ol class="steps">
      <li v-for="s in guide.steps.value" :key="s.key" :class="{ done: s.done, now: guide.next.value?.key === s.key }">
        <span class="mark" aria-hidden="true"><Icon v-if="s.done" name="check" :size="15" :stroke="3" /><template v-else>{{ index(s.key) }}</template></span>
        <span class="grow"><strong>{{ s.title }}</strong><small class="muted">{{ s.detail }}</small></span>
        <button v-if="!s.done" class="btn sm" :class="{ soft: guide.next.value?.key !== s.key }" :aria-label="`${cta[s.key]}: ${s.title}`" @click="go(s.key)">{{ cta[s.key] }}</button>
      </li>
    </ol>
    <button class="later" @click="guide.hide">I'll do this later</button>
  </section>
</template>

<script setup lang="ts">
import type { GuideKey } from '../utils/guide'
const guide = useGuide()
const accountSheet = useAccountSheet()
const addSheet = useSheet()
const cta: Record<GuideKey, string> = { account: 'Add account', pay: 'Add pay', bill: 'Add bill' }
const order: GuideKey[] = ['account', 'pay', 'bill']
const index = (k: GuideKey) => order.indexOf(k) + 1

function go(k: GuideKey) {
  if (k === 'account') accountSheet.value = { open: true, id: null }
  else if (k === 'pay') addSheet.value = { open: true, mode: 'income' }
  else navigateTo('/bills?add=1')
}
</script>

<style scoped>
.gs { margin:6px 0 16px; background:linear-gradient(160deg,var(--surface),var(--tint-accent-soft)); border-color:var(--tint-accent-line); }
.top { display:flex; align-items:center; gap:10px; }
.top h2 { margin:0; font-size:1.1rem; }
.x { width:44px; height:44px; margin:-8px -8px -8px 0; border-radius:50%; border:0; background:none; color:var(--muted); display:grid; place-items:center; cursor:pointer; }
.bar { margin:10px 0 6px; }
.steps { list-style:none; margin:0; padding:0; }
.steps li { display:flex; align-items:center; gap:12px; padding:12px 0; min-height:64px; }
.steps li + li { border-top:1px solid var(--line); }
.mark { width:30px; height:30px; border-radius:50%; flex:none; display:grid; place-items:center; font-weight:700; font-size:.85rem; background:var(--soft); color:var(--ink2); }
.now .mark { background:var(--accent); color:#fff; }
.done .mark { background:var(--goodbg); color:var(--good-ink); }
.grow { min-width:0; }
.grow strong, .grow small { display:block; }
.grow small { margin-top:1px; line-height:1.35; }
.done strong { color:var(--muted); font-weight:600; }
.later { display:block; margin:2px auto -6px; min-height:44px; padding:0 14px; background:none; border:0; color:var(--muted); font:inherit; font-size:.85rem; font-weight:600; cursor:pointer; }
</style>
