<template>
  <div>
    <!-- While locked nothing behind the lock screen can be focused, tabbed to or read by a screen reader. -->
    <div class="shell" :inert="locked || undefined" :aria-hidden="locked || undefined">
      <main v-if="syncReady"><slot /></main>
      <main v-else class="boot"><div class="spin" /></main>
      <TabBar />
      <AddSheet />
      <Toast />
    </div>
    <LockScreen />
  </div>
</template>

<script setup lang="ts">
// Private screens must never show up in search results.
useSeoMeta({ robots: 'noindex, nofollow' })
// The shell waits only for the local copy (instant), never for the network.
</script>

<style>
.boot { display:grid; place-items:center; }
.spin { width:34px; height:34px; border-radius:50%; border:4px solid #f0d9cf; border-top-color:var(--accent); animation:spin .8s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }
</style>
