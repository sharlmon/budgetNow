<template>
  <Transition name="up">
    <div v-if="updateAvailable" class="upd" role="alert" aria-live="assertive">
      <span class="ic"><Icon name="sparkles" :size="16" /></span>
      <span class="grow">
        <strong>{{ updateAvailable.sameVersion ? 'An update is available' : `Version ${updateAvailable.version} is available` }}</strong>
        <small>Reload to get the latest improvements.</small>
      </span>
      <button class="go" @click="applyUpdate">Update</button>
      <button class="later" aria-label="Later" @click="dismissUpdate"><Icon name="x" :size="15" /></button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const { applyUpdate, dismissUpdate } = useVersion()
</script>

<style scoped>
.upd { position:fixed; z-index:85; top:calc(12px + env(safe-area-inset-top)); left:50%; transform:translateX(-50%); width:calc(100% - 28px); max-width:452px; display:flex; align-items:center; gap:12px; padding:11px 12px 11px 14px; border-radius:18px; color:#fff; background:var(--toast); box-shadow:0 18px 40px -12px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.08); }
.ic { width:30px; height:30px; border-radius:10px; background:var(--grad); display:grid; place-items:center; flex:none; }
strong { display:block; font-size:.9rem; } small { display:block; opacity:.7; font-size:.76rem; }
.go { border:0; border-radius:99px; padding:8px 16px; font:inherit; font-weight:700; font-size:.82rem; color:#fff; background:var(--btn); cursor:pointer; box-shadow:inset 0 1px 0 rgba(255,255,255,.3); }
.later { border:0; background:rgba(255,255,255,.12); color:#fff; width:28px; height:28px; border-radius:50%; display:grid; place-items:center; cursor:pointer; flex:none; }
.up-enter-active { transition:all .45s cubic-bezier(.2,1.2,.4,1); } .up-leave-active { transition:all .25s ease; }
.up-enter-from, .up-leave-to { opacity:0; transform:translate(-50%,-24px) scale(.96); }
</style>
