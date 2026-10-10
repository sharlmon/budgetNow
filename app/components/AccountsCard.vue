<template>
  <section aria-label="Accounts">
    <template v-if="state.accounts.length">
      <div class="sec"><h2>Accounts</h2><NuxtLink to="/accounts" class="link">Manage <Icon name="next" :size="14" /></NuxtLink></div>
      <NuxtLink to="/accounts" class="stk" aria-label="Open your accounts"><AccountsStack /></NuxtLink>
    </template>
    <NuxtLink v-else to="/accounts" class="card prompt">
      <span class="gp"><Icon name="wallet" :size="20" /></span>
      <span class="grow"><strong>Where is your money?</strong><br><span class="muted sm">Add M-Pesa, your bank or cash to see it all in one place.</span></span>
      <Icon name="next" :size="18" />
    </NuxtLink>
  </section>
</template>

<script setup lang="ts">
const { state } = useBudget()
</script>

<style scoped>
.stk { display:block; text-decoration:none; color:inherit; }
.prompt { display:flex; align-items:center; gap:12px; text-decoration:none; color:var(--ink); min-height:64px; }
.gp { width:42px; height:42px; border-radius:14px; background:linear-gradient(145deg,var(--tint-accent),var(--tint-accent2)); color:var(--accent); display:grid; place-items:center; flex:none; }
</style>
