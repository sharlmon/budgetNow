<template>
  <section aria-label="Accounts">
    <AccountsStack v-if="state.accounts.length" interactive :selected="selected" @select="selected = $event" />
    <NuxtLink v-else-if="!hidePrompt" to="/accounts" class="card prompt">
      <span class="gp"><Icon name="wallet" :size="22" /></span>
      <span class="grow"><strong>Where is your money?</strong><br><span class="muted sm">Add M-Pesa, your bank or cash to see it all in one place.</span></span>
      <Icon name="next" :size="18" />
    </NuxtLink>
  </section>
</template>

<script setup lang="ts">
defineProps<{ /** Hide the "Where is your money?" prompt, because the setup guide already asks. */ hidePrompt?: boolean }>()
const { state } = useBudget()
const selected = ref<string | null>(null)
</script>

<style scoped>
.prompt { display:flex; align-items:center; gap:14px; text-decoration:none; color:var(--ink); min-height:92px; background:var(--surface); border-style:dashed; }
.gp { width:46px; height:46px; border-radius:15px; background:linear-gradient(145deg,var(--tint-accent),var(--tint-accent2)); color:var(--accent); display:grid; place-items:center; flex:none; }
</style>
