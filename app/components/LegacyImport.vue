<template>
  <div v-if="found && !dismissed" class="card white leg">
    <span class="lg"><Icon name="upload" :size="20" /></span>
    <div class="grow">
      <strong>Found data on this device</strong>
      <div class="muted sm">{{ found.counts }}. Add it to your account?</div>
      <div class="row" style="margin-top:12px">
        <button class="btn sm" @click="importNow"><Icon name="check" :size="16" :stroke="2.8" /> Import</button>
        <button class="btn soft sm" @click="dismiss">Not now</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { found, dismissed, detect, importNow, dismiss } = useLegacy()
onMounted(detect)
</script>

<style scoped>
.leg { display:flex; gap:14px; margin-bottom:16px; padding:14px; background:linear-gradient(95deg,var(--surface),var(--goodbg)); border-color:var(--good-line); }
.lg { width:42px; height:42px; border-radius:14px; background:var(--goodbg); color:var(--good); display:grid; place-items:center; flex:none; }
</style>
