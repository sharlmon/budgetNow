<template>
  <section id="about" class="card white about">
    <div class="row">
      <span class="ic"><Icon name="sparkles" :size="20" /></span>
      <div class="grow"><h2>About BudgetNow</h2><div class="muted sm">Version {{ current.version }} · build {{ current.build }}</div></div>
    </div>
    <button class="btn soft sm chk" :disabled="busy" @click="manual"><Icon name="repeat" :size="15" /> {{ busy ? 'Checking…' : 'Check for updates' }}</button>

    <h3 class="wn">What's new</h3>
    <details v-for="(r, i) in RELEASES" :key="r.version" :open="i === 0" class="rel">
      <summary><strong>{{ r.version }}</strong><span class="muted sm">{{ r.title }} · {{ pretty(r.date) }}</span></summary>
      <ul><li v-for="n in r.notes" :key="n">{{ n }}</li></ul>
    </details>
  </section>
</template>

<script setup lang="ts">
import { RELEASES } from '#shared/releases'

const { current, check } = useVersion()
const busy = ref(false)
const pretty = (d: string) => new Date(d + 'T00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

async function manual() {
  busy.value = true
  const r = await check(true)
  busy.value = false
  if (r === 'latest') showToast(`You're on the latest version (${current.version})`)
  else if (r === 'error') showToast("Couldn't check for updates. Try again when you're online.")
}
</script>

<style scoped>
.about { margin-bottom:16px; display:flex; flex-direction:column; gap:12px; scroll-margin-top:16px; }
.ic { width:42px; height:42px; border-radius:14px; background:var(--tint-accent); color:var(--accent); display:grid; place-items:center; flex:none; }
.chk { width:100%; } .wn { margin:6px 0 0; font-size:.78rem; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); }
.rel { border:1px solid var(--line); border-radius:16px; padding:0 14px; }
.rel summary { cursor:pointer; padding:12px 0; display:flex; flex-direction:column; gap:2px; list-style:none; } .rel summary::-webkit-details-marker { display:none; }
.rel ul { margin:0 0 12px; padding-left:1.1rem; color:var(--ink2); font-size:.88rem; line-height:1.55; }
</style>
