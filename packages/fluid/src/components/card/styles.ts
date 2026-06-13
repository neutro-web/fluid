const styles = /* css */ `

/* ─── Hidden utility ────────────────────────────────────────────────────────── */

[hidden] { display: none !important; }

/* ─── Host ──────────────────────────────────────────────────────────────────── */

:host {
  display: block;
  position: relative;
  border-radius: var(--fluid-card-radius, var(--fluid-radius-lg, 12px));
  contain: layout style;
  -webkit-tap-highlight-color: transparent;
}

:host([interactive]) {
  cursor: pointer;
}

:host([loading]) {
  cursor: wait;
}

/* ─── Surface ───────────────────────────────────────────────────────────────── */

[part="surface"] {
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  contain: layout style paint;
  border-radius: inherit;
  transform-origin: center;

  /* Matte: opaque tinted rectangle */
  background: var(--fluid-tint-light, hsl(0 0% 100% / 0.55));

  /* Base shadow — elevation="raised" (default) */
  box-shadow:
    0 calc(1px + 3px * var(--fluid-shadow-depth, 0)) calc(3px + 3px * var(--fluid-shadow-depth, 0))
      hsl(0 0% 0% / calc(0.08 + 0.02 * var(--fluid-shadow-depth, 0))),
    0 calc(1px + 1px * var(--fluid-shadow-depth, 0)) calc(2px + 2px * var(--fluid-shadow-depth, 0))
      hsl(0 0% 0% / calc(0.06 + 0.02 * var(--fluid-shadow-depth, 0)));
}

/* Frosted+ glass surface — toggled via data-glass attribute by JS */
[part="surface"][data-glass] {
  backdrop-filter: blur(calc(8px + 1px * var(--fluid-blur-delta, 0))) saturate(var(--fluid-vibrancy, 1.8));
  background: var(--fluid-tint-light, hsl(0 0% 100% / 0.55));
  /* Typography blur compensation (§III.4) */
  --fluid-blur-current: 8;
}

/* ─── Elevation variants ─────────────────────────────────────────────────────── */

[part="surface"][data-elevation="flat"] {
  box-shadow: none;
}

[part="surface"][data-elevation="raised"] {
  /* default — interpolates from surface to raised shadow via --fluid-shadow-depth */
}

[part="surface"][data-elevation="floating"] {
  box-shadow:
    0 calc(4px + 6px * var(--fluid-shadow-depth, 0)) calc(6px + 9px * var(--fluid-shadow-depth, 0))
      hsl(0 0% 0% / calc(0.10 + 0.05 * var(--fluid-shadow-depth, 0))),
    0 calc(2px + 2px * var(--fluid-shadow-depth, 0)) calc(4px + 2px * var(--fluid-shadow-depth, 0))
      hsl(0 0% 0% / calc(0.08 + 0.02 * var(--fluid-shadow-depth, 0)));
}

/* ─── Error state ────────────────────────────────────────────────────────────── */

[part="surface"][data-error] {
  outline: 2px solid var(--fluid-color-destructive, hsl(0 90% 50%));
  outline-offset: -2px;
}

/* ─── Media slot wrapper ─────────────────────────────────────────────────────── */

[part="media"] {
  flex-shrink: 0;
  overflow: hidden;
  margin: 0;
  /* Full-bleed: no padding, no gap */
}

[part="media"] ::slotted(*) {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* ─── Header slot wrapper ────────────────────────────────────────────────────── */

[part="header-area"] {
  flex-shrink: 0;
  padding-block-start: var(--fluid-space-4, 1rem);
  padding-inline: var(--fluid-space-4, 1rem);
}

[part="media"] + [part="header-area"] {
  padding-block-start: var(--fluid-space-3, 0.75rem);
}

/* ─── Body (default slot) ────────────────────────────────────────────────────── */

[part="body"] {
  flex: 1 1 auto;
  min-height: 0;
  padding: var(--fluid-space-4, 1rem);
}

/* Collapse body padding-block-start when header is present */
[part="header-area"]:not([hidden]) + [part="body"] {
  padding-block-start: var(--fluid-space-3, 0.75rem);
}

/* ─── Trigger (interactive stretched-link) ───────────────────────────────────── */

[part="trigger"] {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background: transparent;
  border: none;
  padding: 0;
  cursor: inherit;
  border-radius: inherit;
  z-index: 0; /* below slotted content z-index */
  /* Remove default button appearance */
  -webkit-appearance: none;
  appearance: none;
}

:host(:not([interactive])) [part="trigger"] {
  display: none; /* non-interactive cards must not intercept pointer events */
}

[part="trigger"]:focus {
  outline: none;
}

[part="trigger"]:focus-visible {
  outline: 2px solid var(--fluid-focus-ring-color, var(--fluid-color-brand, #005FCC));
  outline-offset: 2px;
}

/* ─── Actions bar ────────────────────────────────────────────────────────────── */

[part="actions-bar"] {
  position: relative;
  z-index: 1; /* sits above the stretched trigger */
  padding-block-start: 0;
  padding-inline: var(--fluid-space-3, 0.75rem);
  padding-block-end: var(--fluid-space-3, 0.75rem);
  display: flex;
  flex-wrap: wrap;
  gap: var(--fluid-space-2, 0.5rem);
  align-items: center;
}

:host([actions-divider]) [part="actions-bar"] {
  border-block-start: 1px solid var(--fluid-color-border, color-mix(in srgb, currentColor 12%, transparent));
  padding-block-start: var(--fluid-space-3, 0.75rem);
}

/* ─── Border (specular rim) ──────────────────────────────────────────────────── */

[part="border"] {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 3;
  /* Specular rim: light-from-top-left glass edge highlight */
  border: 1px solid;
  border-color:
    color-mix(in srgb, white 25%, transparent)
    color-mix(in srgb, white 12%, transparent)
    color-mix(in srgb, black 6%, transparent)
    color-mix(in srgb, white 18%, transparent);
}

/* ─── Error banner ───────────────────────────────────────────────────────────── */

[part="error-banner"] {
  position: relative;
  z-index: 1; /* above the stretched trigger (z-index:0) */
  padding-block: var(--fluid-space-3, 0.75rem);
  padding-inline: var(--fluid-space-4, 1rem);
  color: var(--fluid-color-destructive, hsl(0 90% 50%));
  font-size: var(--fluid-font-size-sm, 0.875rem);
  background: color-mix(in srgb, var(--fluid-color-destructive, hsl(0 90% 50%)) 8%, transparent);
}

/* ─── Loading overlay (skeleton fallback) ────────────────────────────────────── */

.loading-overlay {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  z-index: 2;
  overflow: hidden;
  background: var(--fluid-tint-light, hsl(0 0% 100% / 0.6));
  background-image: linear-gradient(
    90deg,
    transparent 0%,
    color-mix(in srgb, white 40%, transparent) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  background-repeat: no-repeat;
  animation: fluid-card-shimmer var(--fluid-shimmer-duration, 1.5s) ease-in-out infinite;
}

@keyframes fluid-card-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ─── prefers-reduced-motion ────────────────────────────────────────────────── */

@media (prefers-reduced-motion: reduce) {
  .loading-overlay {
    animation: none;
    background-image: none;
  }
}

/* ─── prefers-contrast: more ─────────────────────────────────────────────────── */

@media (prefers-contrast: more) {
  [part="surface"] {
    --fluid-tint-light: hsl(0 0% 100% / 0.95);
    backdrop-filter: none !important;
    outline: 2px solid currentColor;
    outline-offset: -2px;
  }

  [part="surface"][data-error] {
    outline: 2px solid var(--fluid-color-destructive, hsl(0 90% 50%));
    outline-offset: -2px;
  }

  [part="trigger"]:focus-visible {
    outline-width: 3px;
  }
}

/* ─── forced-colors ──────────────────────────────────────────────────────────── */

@media (forced-colors: active) {
  [part="surface"] {
    background: Canvas !important;
    border: 1px solid ButtonText !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
  }

  [part="surface"][data-error] {
    border: 2px solid LinkText !important;
    outline: none !important;
  }

  [part="trigger"]:focus-visible {
    outline: 2px solid Highlight;
  }

  [part="border"] {
    display: none;
  }
}

/* ─── Print ──────────────────────────────────────────────────────────────────── */

@media print {
  [part="surface"] {
    background: white !important;
    border: 1px solid #ccc !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
  }

  [part="border"] {
    display: none;
  }

  .loading-overlay {
    display: none;
  }
}
`

export default styles
