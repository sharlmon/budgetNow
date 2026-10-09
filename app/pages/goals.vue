<template>
  <div>
    <h1 class="rise" style="margin-bottom:14px">Plan</h1>
    <div class="rise" style="--i:1;margin-bottom:16px"><PlanSwitch /></div>

    <div class="hero rise" style="--i:2">
      <div class="hico"><Icon name="piggy" :size="20" /></div>
      <small>Available to assign</small>
      <div class="big"><AnimatedNumber :value="Math.max(0, savingsPot.available)" /></div>
      <small v-if="savingsPot.available < 0">{{ money(-savingsPot.available) }} more is in goals than you've saved from income</small>
      <small v-else>{{ money(savingsPot.assigned) }} in goals · {{ money(savingsPot.allocated) }} saved from income</small>
    </div>

    <div class="sec rise" style="--i:3"><h2>Savings goals</h2><button class="link" @click="adding = !adding"><Icon :name="adding ? 'x' : 'plus'" :size="14" :stroke="2.6" /> {{ adding ? 'Cancel' : 'New goal' }}</button></div>

    <Transition name="drop">
      <div v-if="adding" class="card white form">
        <input v-model="name" class="field" placeholder="What are you saving for? (e.g. Rent deposit)" />
        <div class="row"><AmountInput v-model="target" placeholder="Target amount" /></div>
        <label class="muted sm">Target date (optional)</label>
        <input v-model="deadline" type="date" class="field" :min="today()" style="margin-top:-6px" />
        <div class="styles">
          <button v-for="g in GOAL_STYLES" :key="g.icon" :class="{ on: style.icon === g.icon }" :style="{ color: g.color, background: g.color + '1f', borderColor: style.icon === g.icon ? g.color : 'transparent' }" :aria-label="g.icon" @click="style = g"><Icon :name="g.icon" :size="20" /></button>
        </div>
        <button class="btn" :disabled="!name.trim() || !(target > 0)" @click="add">Create goal</button>
      </div>
    </Transition>

    <div v-if="!state.goals.length && !adding" class="card empty rise" style="--i:4">
      <div class="art"><Icon name="flag" :size="28" /></div>
      <h2 style="margin-bottom:4px">Give your savings a purpose</h2>
      <p class="muted" style="margin:0 0 16px">Set a target, then assign what you save from each pay towards it.</p>
      <button class="btn" @click="adding = true"><Icon name="plus" :size="18" :stroke="2.6" /> Create a goal</button>
    </div>

    <div v-for="(g, i) in state.goals" :key="g.id" class="card white goal rise" :style="{ '--i': 4 + i }">
      <div class="row">
        <Ring :pct="pct(g)" :color="done(g) ? 'var(--good)' : g.color" :size="64">
          <Icon :name="done(g) ? 'check' : g.icon" :size="22" :stroke="done(g) ? 3 : 2" :style="{ color: done(g) ? 'var(--good)' : g.color }" />
        </Ring>
        <div class="grow">
          <strong>{{ g.name }}</strong>
          <div class="amt"><b><AnimatedNumber :value="goalSaved(g)" /></b> <span class="muted">of {{ money(g.target) }}</span></div>
          <div class="sm" :class="done(g) ? 'good' : 'muted'">{{ hint(g) }}</div>
        </div>
        <button class="icon-btn" aria-label="Delete goal" @click="remove(g)"><Icon name="trash" :size="15" /></button>
      </div>
      <div v-if="!done(g)" class="row" style="margin-top:14px">
        <AmountInput :model-value="amt[g.id] ?? 0" placeholder="Amount" @update:model-value="v => (amt[g.id] = v)" />
        <button v-if="savingsPot.available > 0" class="btn soft sm" @click="amt[g.id] = Math.min(savingsPot.available, g.target - goalSaved(g))">Max</button>
        <button class="btn sm" :disabled="!(amt[g.id] > 0)" @click="contribute(g, amt[g.id] ?? 0)"><Icon name="plus" :size="16" :stroke="2.6" /> Add</button>
      </div>
      <div v-if="goalSaved(g) > 0 && amt[g.id] > 0" class="row" style="margin-top:10px;justify-content:flex-end">
        <button class="link" @click="contribute(g, -(amt[g.id] ?? 0))">Withdraw entered amount</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { state, savingsPot, addGoal, removeGoal, addToGoal } = useBudget()
const adding = ref(false)
const name = ref(''); const target = ref(0); const deadline = ref('')
const style = ref(GOAL_STYLES[0]!)
const amt = reactive<Record<string, number>>({})
const pct = (g: Goal) => (g.target > 0 ? goalSaved(g) / g.target : 0)
const done = (g: Goal) => goalSaved(g) >= g.target

function hint(g: Goal) {
  if (done(g)) return 'Goal reached'
  const left = g.target - goalSaved(g)
  if (!g.deadline) return `${money(left)} to go`
  const days = Math.ceil((new Date(g.deadline + 'T00:00').getTime() - new Date(today() + 'T00:00').getTime()) / 86400000)
  if (days < 0) return `${money(left)} to go · past target date`
  const months = Math.max(1, Math.ceil(days / 30.4))
  return `${money(left / months)}/month to hit it by ${new Date(g.deadline + 'T00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
}
function add() {
  addGoal(name.value.trim(), target.value, style.value.icon, style.value.color, deadline.value)
  showToast(`${name.value.trim()} goal created`)
  name.value = ''; target.value = 0; deadline.value = ''; style.value = GOAL_STYLES[0]!; adding.value = false
}
function contribute(g: Goal, a: number) {
  const before = done(g)
  addToGoal(g.id, a)
  amt[g.id] = 0
  if (!before && done(g)) showToast(`Goal reached: ${g.name}`)
  else showToast(a >= 0 ? `${money(a)} added to ${g.name}` : `${money(-a)} withdrawn from ${g.name}`)
}
function remove(g: Goal) { const undo = removeGoal(g.id); showToast(`${g.name} deleted`, undo) }
</script>

<style scoped>
.hero { position:relative; overflow:hidden; background:linear-gradient(160deg,#3fcf94 0%,#1f9d6c 100%); color:#fff; border-radius:26px; padding:22px; box-shadow:0 18px 34px -16px rgba(31,157,108,.85), inset 0 1px 0 rgba(255,255,255,.35); }
.hero::before { content:''; position:absolute; width:220px; height:220px; right:-70px; top:-90px; border-radius:50%; background:rgba(255,255,255,.14); }
.hero::after { content:''; position:absolute; width:150px; height:150px; right:30px; bottom:-90px; border-radius:50%; background:rgba(255,255,255,.1); }
.hico { width:38px; height:38px; border-radius:12px; background:rgba(255,255,255,.22); display:grid; place-items:center; margin-bottom:14px; position:relative; }
.big { font-size:2.5rem; font-weight:700; letter-spacing:-.035em; line-height:1.15; position:relative; }
.hero small { opacity:.9; position:relative; }
.form { display:flex; flex-direction:column; gap:12px; margin-bottom:14px; }
.styles { display:grid; grid-template-columns:repeat(8,1fr); gap:6px; }
.styles button { aspect-ratio:1; border-radius:12px; border:2px solid transparent; display:grid; place-items:center; cursor:pointer; transition:transform .2s var(--spring); }
.styles button:active { transform:scale(.88); } .styles button.on { transform:scale(1.08); }
.goal { margin-bottom:12px; }
.amt { font-size:.95rem; margin:2px 0; }
.drop-enter-active { transition:all .4s var(--ease); } .drop-leave-active { transition:all .2s; }
.drop-enter-from,.drop-leave-to { opacity:0; transform:translateY(-12px) scale(.98); }
</style>
