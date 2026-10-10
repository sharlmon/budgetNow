<template>
  <div>
    <SettingsHeader title="Bill reminders" />

    <div class="card white rise" style="--i:1">
      <div class="row top">
        <span class="ic"><Icon name="bill" :size="20" /></span>
        <div class="grow"><h2>Never miss a bill</h2><div class="muted sm">A notification on the morning a bill is due, even when Weka is closed. Weka checks once a day, around {{ checkTime }}.</div></div>
      </div>

      <p v-if="state === 'checking'" class="muted sm status" role="status">Checking this device…</p>

      <p v-else-if="state === 'needs-install'" class="note" role="status"><strong>Add Weka to your Home Screen first.</strong> On iPhone and iPad, reminders work once Weka is installed. Tap the Share button, choose <b>Add to Home Screen</b>, then open Weka from there and come back to this page.</p>
      <p v-else-if="state === 'unsupported'" class="note" role="status"><strong>This browser can't show reminders.</strong> Try Chrome or Safari on your phone, or install Weka to your Home Screen.</p>
      <p v-else-if="state === 'unavailable'" class="note" role="status"><strong>Reminders aren't ready on this device yet.</strong> They work in the installed or deployed app, once its notification service is switched on.</p>
      <p v-else-if="state === 'denied'" class="note" role="status"><strong>Notifications are blocked for Weka.</strong> Allow them in your browser or phone settings, then reopen this page.</p>

      <template v-else>
        <div class="row switch">
          <div class="grow"><strong>Remind me about bills</strong><div class="muted sm">{{ state === 'on' ? 'On for this device' : 'Off for this device' }}</div></div>
          <Toggle :model-value="state === 'on'" :aria-label="'Remind me about bills'" :disabled="busy" @update:model-value="toggle" />
        </div>
        <p v-if="error" class="err" role="alert">{{ error }}</p>
      </template>
    </div>

    <template v-if="state === 'on'">
      <div class="card white rise" style="--i:2;margin-top:12px">
        <label class="muted sm" for="rm-days">Remind me</label>
        <select id="rm-days" class="field" :value="prefs.daysBefore" @change="setDays(Number(($event.target as HTMLSelectElement).value))">
          <option v-for="n in DAYS_BEFORE_OPTIONS" :key="n" :value="n">{{ n === 0 ? 'On the day it is due' : n === 1 ? '1 day before' : `${n} days before` }}</option>
        </select>
        <p class="muted sm hint">Bills that are a day or two late are mentioned too, then dropped after three days.</p>

        <label class="muted sm" for="rm-detail">What the lock screen shows</label>
        <select id="rm-detail" class="field" :value="prefs.detail" @change="setDetail(($event.target as HTMLSelectElement).value as ReminderDetail)">
          <option value="basic">Just a count (most private)</option>
          <option value="names">Bill names</option>
          <option value="full">Names and amounts</option>
        </select>

        <div class="preview" aria-label="Preview of a reminder">
          <img :src="icon" alt="" width="36" height="36" />
          <div class="pv"><small class="muted">Weka · {{ checkTime }}</small><strong>{{ sample?.title }}</strong><span>{{ sample?.body }}</span></div>
        </div>
        <p class="muted sm hint">This is an example. Anyone who can see your lock screen can read it, so choose what you are comfortable with.</p>
      </div>

      <div class="card white rise" style="--i:3;margin-top:12px">
        <button class="btn soft" :disabled="testing" @click="test"><Icon name="repeat" :size="16" /> {{ testing ? 'Sending…' : 'Send a test reminder' }}</button>
        <p v-if="testNote" class="muted sm hint" role="status">{{ testNote }}</p>
      </div>
    </template>

    <p class="muted sm foot rise" style="--i:4">Reminders travel through your browser's own push service (Google, Apple, Mozilla or Microsoft). Weka sends only the text shown above. Turn reminders off here at any time.</p>
  </div>
</template>

<script setup lang="ts">
import { billsToRemind, buildReminder, DAYS_BEFORE_OPTIONS, REMINDER_HOUR_UTC, type ReminderDetail } from '#shared/reminders'

useSeoMeta({ title: 'Bill reminders' })
const r = useReminders()
const state = reminderState
const prefs = reminderPrefs
const busy = ref(false), testing = ref(false), error = ref(''), testNote = ref('')
const icon = `${useRuntimeConfig().app.baseURL}icons/icon-192.png`

/** The local time of the daily check, which runs at a fixed time of day in UTC. */
const checkTime = new Date(Date.UTC(2026, 0, 15, REMINDER_HOUR_UTC)).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
const SAMPLE = [{ name: 'Rent', amount: 25000, nextDue: '2026-01-15' }, { name: 'Internet', amount: 3500, nextDue: '2026-01-16' }]
const sample = computed(() => buildReminder(billsToRemind(SAMPLE, '2026-01-15', prefs.value.daysBefore), prefs.value.detail, currency.value))

onMounted(() => { r.refresh() })

async function toggle(on: boolean) {
  busy.value = true; error.value = ''; testNote.value = ''
  error.value = (on ? await r.enable() : await r.disable()) ?? ''
  busy.value = false
}
async function setDays(n: number) { error.value = (await r.savePrefs({ daysBefore: n })) ?? '' }
async function setDetail(d: ReminderDetail) { error.value = (await r.savePrefs({ detail: d })) ?? '' }
async function test() { testing.value = true; testNote.value = await r.sendTest(); testing.value = false }
</script>

<style scoped>
.top { align-items:flex-start; }
.ic { width:42px; height:42px; border-radius:14px; background:linear-gradient(145deg,var(--tint-accent),var(--tint-accent2)); color:var(--accent); display:grid; place-items:center; flex:none; }
.grow h2 { margin:0 0 2px; }
.status { margin:14px 0 0; }
.note { margin:14px 0 0; padding:12px 14px; border-radius:14px; background:var(--soft); color:var(--ink2); font-size:.9rem; line-height:1.55; }
.switch { margin-top:16px; padding-top:14px; border-top:1px solid var(--line); min-height:56px; }
.err { margin:10px 0 0; color:var(--bad); font-weight:600; font-size:.85rem; }
select { margin-top:6px; }
.hint { margin:8px 0 14px; line-height:1.5; }
label { display:block; }
.preview { display:flex; gap:12px; align-items:flex-start; margin-top:6px; padding:12px; border-radius:18px; background:var(--card); border:1px solid var(--line); }
.preview img { border-radius:10px; flex:none; }
.pv { min-width:0; display:flex; flex-direction:column; gap:2px; font-size:.88rem; line-height:1.4; }
.pv strong { font-size:.95rem; } .pv span { color:var(--ink2); overflow-wrap:anywhere; }
.foot { margin:16px 4px 0; line-height:1.55; }
</style>
