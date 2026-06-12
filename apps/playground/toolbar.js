export function initToolbar(navigateCurrent) {
  // Tier — call the runtime API so already-initialised ledger updates, then
  // re-navigate so mounted components re-render at the new tier.
  // window.__FLUID_FORCE_TIER__ only takes effect on ledger init (page load);
  // window.FluidLedger.forceTier() is the post-init API (requires DEV=true,
  // ensured by define: { 'process.env.NODE_ENV': '"development"' } in vite.config.ts).
  document.querySelectorAll('[name="tier"]').forEach(input => {
    input.addEventListener('change', () => {
      window.__FLUID_FORCE_TIER__ = input.value
      window.FluidLedger?.forceTier(input.value)
      navigateCurrent()
    })
  })

  // Mode — data-theme on <html> is enough; CSS tokens respond immediately
  document.querySelectorAll('[name="theme"]').forEach(input => {
    input.addEventListener('change', () => {
      document.documentElement.dataset.theme = input.value
    })
  })

  // Motion — adds .reduced-motion to <html>, which suppresses CSS transitions
  // via styles.css. WAAPI/JS springs (Crystalline, Optical tiers) are unaffected;
  // the ledger has no force hook for reduced motion. Re-navigate so components
  // re-read real matchMedia('(prefers-reduced-motion: reduce)') on remount.
  document.querySelectorAll('[name="motion"]').forEach(input => {
    input.addEventListener('change', () => {
      const reduced = input.value === 'reduced'
      document.documentElement.classList.toggle('reduced-motion', reduced)
      navigateCurrent()
    })
  })
}
