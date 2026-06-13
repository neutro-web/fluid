const styles = /* css */ `
/* ─── Host ─────────────────────────────────────────────────────────────────── */

:host {
  display: inline-flex;
  position: relative;         /* anchors the ripple canvas (position:absolute;inset:0) */
  overflow: hidden;           /* clips ripple to host boundary — REQUIRED by FluidRipple contract */
  vertical-align: middle;
  border-radius: var(--fluid-button-radius, 8px);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  contain: layout style paint;
}

:host([disabled]),
:host([loading]) {
  pointer-events: none;
  cursor: default;
}

[part="surface"]:focus-visible {
  outline: 2px solid var(--fluid-focus-ring-color, var(--fluid-color-brand, #005FCC));
  outline-offset: 2px;
}

/* ─── Surface (inner <button>) ─────────────────────────────────────────────── */

[part="surface"] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: var(--fluid-button-padding-y, 10px) var(--fluid-button-padding-x, 20px);
  border: none;
  border-radius: inherit;
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  line-height: 1.25;
  cursor: inherit;
  background: transparent;
  color: inherit;
  position: relative;
  z-index: 1;
  width: 100%;
  -webkit-appearance: none;
  appearance: none;
  transform-origin: center;
  white-space: nowrap;
}

[part="surface"]:focus:not(:focus-visible) {
  outline: none;
}

/* ─── Hover overlay ─────────────────────────────────────────────────────────── */

:host(:hover:not([disabled]):not([loading])) [part="overlay"] {
  background: rgba(255 255 255 / 0.08);
}

/* ─── Variants ──────────────────────────────────────────────────────────────── */

:host([variant="primary"]) [part="surface"],
:host(:not([variant])) [part="surface"] {
  background: var(--fluid-color-brand, #005FCC);
  color: white;
}

:host([variant="secondary"]) [part="surface"] {
  background: var(--fluid-color-brand-50, rgba(0 95 204 / 0.12));
  color: var(--fluid-color-brand, #005FCC);
}

:host([variant="destructive"]) [part="surface"] {
  background: var(--fluid-color-destructive, #B00020);
  color: white;
}

:host([variant="ghost"]) [part="surface"] {
  background: transparent;
  color: var(--fluid-color-brand, #005FCC);
}

/* ─── Sizes ─────────────────────────────────────────────────────────────────── */

:host([size="sm"]) [part="surface"] {
  padding: var(--fluid-button-padding-y-sm, 6px) var(--fluid-button-padding-x-sm, 14px);
  font-size: 0.875rem;
}

:host([size="lg"]) [part="surface"] {
  padding: var(--fluid-button-padding-y-lg, 14px) var(--fluid-button-padding-x-lg, 28px);
  font-size: 1.125rem;
}

/* ─── Slots ─────────────────────────────────────────────────────────────────── */

[part="icon"],
[part="trailing-icon"] {
  display: contents;
  line-height: 1;
}

[part="icon"]:not(:has(> *)),
[part="trailing-icon"]:not(:has(> *)) {
  display: none;
}

[part="label"] {
  display: contents;
}

/* ─── Overlay ───────────────────────────────────────────────────────────────── */

[part="overlay"] {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: transparent;
  pointer-events: none;
  z-index: 2;
  transition: background var(--fluid-overlay-transition, 120ms) ease;
}

/* ─── Border ────────────────────────────────────────────────────────────────── */

[part="border"] {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 3;
  border: 1px solid transparent;
}

:host([variant="ghost"]) [part="border"],
:host([variant="secondary"]) [part="border"] {
  border-color: color-mix(in srgb, var(--fluid-color-brand, #005FCC) 38%, transparent);
}

/* ─── Loading spinner ───────────────────────────────────────────────────────── */

.fluid-spinner {
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: fluid-spin var(--fluid-spinner-duration, 0.75s) linear infinite;
  flex-shrink: 0;
}

@keyframes fluid-spin {
  to { transform: rotate(360deg); }
}

/* ─── States ────────────────────────────────────────────────────────────────── */

:host([disabled]) [part="surface"],
[part="surface"][aria-disabled="true"]:not([aria-busy="true"]) {
  opacity: 0.38;
}

:host([loading]) [part="surface"] {
  opacity: 0.7;
}

/* Loading: spinner visually replaces label content */
:host([loading]) [part="icon"],
:host([loading]) [part="label"],
:host([loading]) [part="trailing-icon"] {
  display: none;
}

/* ─── prefers-reduced-motion ────────────────────────────────────────────────── */

@media (prefers-reduced-motion: reduce) {
  .fluid-spinner {
    animation: none;
  }
}


/* ─── prefers-contrast: more ────────────────────────────────────────────────── */

@media (prefers-contrast: more) {
  [part="surface"] {
    --fluid-color-brand-50: rgba(0 95 204 / 0.95);
  }
  [part="border"] {
    border-width: 2px;
    border-color: currentColor;
  }
  :host([variant="ghost"]) [part="surface"] {
    background: ButtonFace;
    color: ButtonText;
  }
}

/* ─── forced-colors ─────────────────────────────────────────────────────────── */

@media (forced-colors: active) {
  [part="surface"] {
    background: ButtonFace !important;
    color: ButtonText !important;
    border: 1px solid ButtonText;
    box-shadow: none !important;
    backdrop-filter: none !important;
  }
  [part="surface"]:focus-visible {
    outline: 2px solid Highlight;
  }
  .fluid-spinner {
    border-color: ButtonText;
    border-top-color: transparent;
  }
}

/* ─── Print ─────────────────────────────────────────────────────────────────── */

@media print {
  [part="surface"] {
    background: white !important;
    border: 1px solid #ccc !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
  }
}
`

export default styles
