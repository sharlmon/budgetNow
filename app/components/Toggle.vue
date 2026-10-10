<template>
  <button type="button" role="switch" :aria-checked="modelValue" :disabled="disabled" class="tg" :class="{ on: modelValue }" @click="$emit('update:modelValue', !modelValue)"><i /></button>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean; disabled?: boolean }>()
defineEmits<{ 'update:modelValue': [boolean] }>()
</script>

<style scoped>
.tg { position:relative; width:50px; height:30px; border-radius:99px; border:0; background:var(--toggle-off); cursor:pointer; flex:none; transition:background .25s; padding:0; }
.tg i { position:absolute; top:3px; left:3px; width:24px; height:24px; border-radius:50%; background:#fff; box-shadow:0 2px 6px rgba(0,0,0,.25); transition:transform .3s var(--spring); }
.tg:disabled { opacity:.5; cursor:progress; }
.tg.on { background:var(--good); } .tg.on i { transform:translateX(20px); }
</style>
