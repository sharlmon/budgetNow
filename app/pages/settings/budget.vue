<template>
  <div>
    <SettingsHeader title="Budget" />
    <div class="card white rise" style="margin-bottom:12px;--i:1">
      <label class="muted sm" for="nm">Your name</label>
      <input id="nm" v-model="name" class="field" placeholder="What should we call you?" style="margin-top:8px" />
    </div>
    <div class="card white rise" style="margin-bottom:12px;--i:2">
      <label class="muted sm" for="cu">Currency</label>
      <select id="cu" v-model="cur" class="field" style="margin-top:8px"><option v-for="c in currencies" :key="c" :value="c">{{ c }}</option></select>
    </div>
    <div class="rise" style="--i:3"><SplitRuleCard /></div>
  </div>
</template>

<script setup lang="ts">
import { SITE } from '#shared/site'
useSeoMeta({ title: 'Budget settings' })
const currencies = SITE.currencies
const cur = computed({ get: () => currency.value, set: (v: string) => { currency.value = v } })
const name = computed({ get: () => userName.value, set: (v: string) => { userName.value = v } })
</script>
