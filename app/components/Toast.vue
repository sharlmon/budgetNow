<template>
  <Transition name="toast">
    <div v-if="toast" :key="toast.id" class="toast" role="status">
      <span class="tick"><Icon name="check" :size="14" :stroke="3" /></span>
      <span class="grow">{{ toast.msg }}</span>
      <button v-if="toast.undo" class="undo" @click="undo"><Icon name="undo" :size="14" /> Undo</button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const toast = useToast()
function undo() { toast.value?.undo?.(); toast.value = null }
</script>

<style scoped>
.toast { position:fixed; z-index:80; left:50%; bottom:calc(92px + env(safe-area-inset-bottom)); transform:translateX(-50%); width:calc(100% - 36px); max-width:444px; display:flex; align-items:center; gap:10px; background:#17181c; color:#fff; padding:12px 14px; border-radius:16px; font-size:.88rem; font-weight:500; box-shadow:0 18px 40px -12px rgba(0,0,0,.5); }
.tick { width:22px; height:22px; border-radius:50%; background:var(--good); display:grid; place-items:center; animation:pop .5s .1s both cubic-bezier(.3,1.6,.5,1); }
.undo { display:flex; align-items:center; gap:5px; background:rgba(255,255,255,.14); border:0; color:#fff; font:inherit; font-weight:600; font-size:.8rem; padding:7px 12px; border-radius:99px; cursor:pointer; }
.toast-enter-active { transition:all .4s cubic-bezier(.2,1.2,.4,1); } .toast-leave-active { transition:all .25s ease; }
.toast-enter-from,.toast-leave-to { opacity:0; transform:translate(-50%,24px) scale(.96); }
@keyframes pop { from { transform:scale(0); } }
</style>
