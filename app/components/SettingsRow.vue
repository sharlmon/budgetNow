<template>
  <NuxtLink :to="to" class="srow">
    <span class="ic" :class="tone"><Icon :name="icon" :size="20" /></span>
    <span class="grow"><strong>{{ title }}</strong><small v-if="summary" class="muted">{{ summary }}</small></span>
    <span v-if="dot" class="dot" role="img" :aria-label="dot" />
    <Icon name="next" :size="18" class="chev" />
  </NuxtLink>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ to: string; icon: string; title: string; summary?: string; tone?: 'accent' | 'good' | 'blue' | 'plain'; /** Small orange dot with this accessible label, e.g. an update is waiting. */ dot?: string }>(), { tone: 'plain' })
</script>

<style scoped>
.srow { display:flex; align-items:center; gap:14px; min-height:64px; padding:10px 0; color:var(--ink); text-decoration:none; }
.srow + .srow { border-top:1px solid var(--line); }
.ic { width:42px; height:42px; border-radius:14px; display:grid; place-items:center; flex:none; background:var(--soft); color:var(--ink2); }
.ic.accent { background:linear-gradient(145deg,var(--tint-accent),var(--tint-accent2)); color:var(--accent); }
.ic.good { background:var(--goodbg); color:var(--good-ink); }
.ic.blue { background:var(--tint-blue); color:#5b8def; }
.grow { min-width:0; }
.grow strong, .grow small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.grow small { margin-top:1px; font-size:.82rem; }
.dot { width:10px; height:10px; border-radius:50%; background:var(--accent); flex:none; }
.chev { color:var(--muted); flex:none; }
.srow:active { opacity:.7; }
</style>
