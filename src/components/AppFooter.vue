<template>
  <footer class="app-footer">
    <div class="wrap footer-inner">
      <p class="footer-line">
        My Personal Vault — records are encrypted in your browser before they leave the device.
      </p>
      <p class="footer-line faint">
        <RouterLink to="/signin">Sign In</RouterLink>
        <span aria-hidden="true"> · </span>
        <RouterLink to="/create-account">Create Account</RouterLink>
        <span aria-hidden="true"> · </span>
        <RouterLink to="/forgot-password">Forgot Password?</RouterLink>
      </p>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  border-top: 1px solid var(--line);
  padding: 1.25rem 0 calc(1.25rem + env(safe-area-inset-bottom));
  margin-top: auto;
}

.footer-inner {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.footer-line {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-dim);
}
</style>