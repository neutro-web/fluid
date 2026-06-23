export function initToolbar(navigateCurrent) {
  // Tier — call the runtime API so the already-initialised ledger updates.
  // forceTier() updates the ledger and dispatches fluidledger:tier-change, which
  // already-mounted components listen to for _syncGlassState() / _syncTransitionName().
  // We do NOT re-navigate: navigateCurrent() would destroy and recreate DOM elements,
  // causing their emerge animations (opacity 0→1) to restart. During that animation
  // any FLIP call slides an invisible card — tier switching then breaks FLIP demos.
  document.querySelectorAll('[name="tier"]').forEach(input => {
    input.addEventListener('change', () => {
      window.__FLUID_FORCE_TIER__ = input.value
      window.FluidLedger?.forceTier(input.value)
    })
  })

  // Mode — "system" removes data-theme so prefers-color-scheme applies;
  // "light"/"dark" set data-theme to force a specific palette.
  document.querySelectorAll('[name="theme"]').forEach(input => {
    input.addEventListener('change', () => {
      if (input.value === 'system') {
        delete document.documentElement.dataset.theme
      } else {
        document.documentElement.dataset.theme = input.value
      }
    })
  })

  // Motion — adds .reduced-motion to <html>, which suppresses CSS transitions
  // via styles.css. WAAPI/JS springs (Crystalline, Optical tiers) are unaffected;
  // the ledger has no force hook for reduced motion.
  // Do NOT call navigateCurrent(): recreating the DOM restarts the emerge animation
  // from opacity 0, making FLIP slide invisible cards and appear broken.
  document.querySelectorAll('[name="motion"]').forEach(input => {
    input.addEventListener('change', () => {
      const reduced = input.value === 'reduced'
      document.documentElement.classList.toggle('reduced-motion', reduced)
      window.FluidLedger?.forceReducedMotion(reduced)
    })
  })
}
