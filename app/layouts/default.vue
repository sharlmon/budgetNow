<template>
  <div class="shell">
    <main v-if="syncReady"><slot /></main>
    <main v-else class="boot"><div class="spin" /></main>
    <TabBar />
    <AddSheet />
    <Toast />
  </div>
</template>

<script setup lang="ts">
// The shell waits only for the local copy (instant), never for the network.
</script>

<style>
.boot { display:grid; place-items:center; }
.spin { width:34px; height:34px; border-radius:50%; border:4px solid #f0d9cf; border-top-color:var(--accent); animation:spin .8s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }
</style>
