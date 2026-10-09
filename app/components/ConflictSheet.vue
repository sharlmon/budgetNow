<template>
  <Teleport to="body">
    <Transition name="cf">
      <div v-if="open" class="scrim" @click.self="open = false">
        <div class="sheet" role="dialog" aria-modal="true" aria-label="Changes that clashed">
          <button class="x" aria-label="Close" @click="open = false"><Icon name="x" :size="18" /></button>
          <h3>Changes that clashed</h3>
          <p class="muted sm lead">Another device changed these at the same time as you. We combined everything we safely could. For these, you decide.</p>

          <div v-if="!syncConflicts.length" class="muted done"><Icon name="check" :size="18" :stroke="3" /> All sorted</div>

          <ul class="list">
            <li v-for="c in syncConflicts" :key="c.key" class="item">
              <strong class="ttl">{{ c.title }}</strong>
              <p class="why">{{ why(c) }}</p>
              <ul v-if="c.kind === 'edit'" class="diff">
                <li v-for="f in c.fields" :key="f"><span class="f">{{ pretty(f) }}</span><span class="v mine">You: {{ show(c.mine?.[f]) }}</span><span class="v theirs">Other device: {{ show(c.theirs?.[f]) }}</span></li>
              </ul>
              <div class="acts">
                <button class="btn soft sm" @click="keepTheirs(c.key)">{{ labels(c).keep }}</button>
                <button class="btn sm" @click="useMine(c.key)">{{ labels(c).mine }}</button>
              </div>
            </li>
          </ul>
          <button v-if="syncConflicts.length > 1" class="link all" @click="keepAll">Keep the other device's version for all</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { Conflict } from '#shared/reconcile'

const open = useState('conflictSheet', () => false)
const { keepTheirs, useMine } = useSync()

const NAMES: Record<string, string> = { label: 'Label', name: 'Name', amount: 'Amount', date: 'Date', split: 'Split', balance: 'Balance', minPayment: 'Minimum payment', apr: 'Interest rate', target: 'Target', deadline: 'Target date', nextDue: 'Next due', every: 'Repeats', category: 'Category', auto: 'Auto-log', contributions: 'Contributions', icon: 'Icon', color: 'Colour', original: 'Original balance', anchorDay: 'Due day' }
const pretty = (f: string) => NAMES[f] ?? f
const show = (v: unknown) => (v === undefined || v === null || v === '' ? '(empty)' : typeof v === 'object' ? JSON.stringify(v).slice(0, 60) : String(v))

const why = (c: Conflict) =>
  c.kind === 'edit' ? "You and another device both changed this. We're showing the other device's version."
    : c.kind === 'removed-elsewhere' ? 'Another device deleted this while you were editing it, so it was removed here too.'
      : 'You deleted this, but another device had changed it, so it was kept.'
const labels = (c: Conflict) =>
  c.kind === 'edit' ? { keep: 'Keep theirs', mine: 'Use mine' }
    : c.kind === 'removed-elsewhere' ? { keep: 'Leave deleted', mine: 'Restore mine' }
      : { keep: 'Keep it', mine: 'Delete anyway' }

function keepAll() { for (const c of [...syncConflicts.value]) keepTheirs(c.key) }
watch(syncConflicts, (l) => { if (!l.length) setTimeout(() => { open.value = false }, 900) })
</script>

<style scoped>
.scrim { position:fixed; inset:0; z-index:90; background:rgba(15,15,25,.5); display:flex; align-items:flex-end; justify-content:center; }
.sheet { position:relative; width:100%; max-width:480px; max-height:86dvh; overflow:auto; background:var(--surface); border-radius:28px 28px 0 0; padding:26px 20px calc(24px + env(safe-area-inset-bottom)); }
.x { position:absolute; top:16px; right:16px; width:34px; height:34px; border-radius:50%; border:0; background:var(--soft); color:var(--muted); display:grid; place-items:center; cursor:pointer; }
h3 { margin:0 0 4px; font-size:1.2rem; } .lead { margin:0 0 16px; }
.done { display:flex; align-items:center; gap:8px; justify-content:center; padding:24px 0; color:var(--good); font-weight:600; }
.list { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:12px; }
.item { background:var(--card); border:1px solid var(--line); border-radius:18px; padding:14px; }
.ttl { display:block; margin-bottom:4px; } .why { margin:0 0 10px; color:var(--ink3); font-size:.88rem; line-height:1.5; }
.diff { list-style:none; margin:0 0 12px; padding:0; display:flex; flex-direction:column; gap:6px; }
.diff li { display:grid; grid-template-columns:1fr; gap:2px; background:var(--surface); border:1px solid var(--line); border-radius:12px; padding:8px 10px; font-size:.82rem; }
.f { font-weight:700; } .mine { color:var(--accent); } .theirs { color:var(--ink2); }
.acts { display:flex; gap:8px; } .acts .btn { flex:1; }
.all { display:block; margin:14px auto 0; }
.cf-enter-active { transition:opacity .2s; } .cf-enter-active .sheet { transition:transform .4s cubic-bezier(.2,1,.3,1); }
.cf-leave-active { transition:opacity .2s; } .cf-enter-from, .cf-leave-to { opacity:0; } .cf-enter-from .sheet { transform:translateY(60px); }
</style>
