export function initToolbar(navigateCurrent) {
  // Tier — re-navigate so mounted components re-read the ledger
  document.querySelectorAll('[name="tier"]').forEach(input => {
    input.addEventListener('change', () => {
      window.__FLUID_FORCE_TIER__ = input.value
      navigateCurrent()
    })
  })

  // Mode — data-theme on <html> is enough; CSS tokens respond immediately
  document.querySelectorAll('[name="theme"]').forEach(input => {
    input.addEventListener('change', () => {
      document.documentElement.dataset.theme = input.value
    })
  })

  // Motion — re-navigate so mounted components re-read the ledger
  document.querySelectorAll('[name="motion"]').forEach(input => {
    input.addEventListener('change', () => {
      const reduced = input.value === 'reduced'
      document.documentElement.classList.toggle('reduced-motion', reduced)
      window.__FLUID_FORCE_REDUCED_MOTION__ = reduced
      navigateCurrent()
    })
  })
}
