<template>
  <div>
    <!-- While locked nothing behind the lock screen can be focused, tabbed to or read by a screen reader. -->
    <div class="shell" :inert="locked || undefined" :aria-hidden="locked || undefined">
      <main v-if="syncReady"><slot /></main>
      <BootScreen v-else />
      <TabBar />
      <AddSheet />
      <Toast />
      <UpdateToast />
      <ConflictSheet />
      <AccountSheet />
      <MoveSheet />
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

</style>
