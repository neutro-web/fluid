const styles = /* css */ `
/* ─── Host ─────────────────────────────────────────────────────────────────── */

:host {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;           /* clips ripple to host boundary — REQUIRED by FluidRipple contract */
  vertical-align: middle;
  border-radius: 50%;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  contain: layout style paint;
  /* WCAG 2.5.5: minimum touch target 48×48px */
  min-width: 48px;
  min-height: 48px;
  /* default = md */
  width: 48px;
  height: 48px;
}

:host([size="sm"]) {
  width: 40px;
  height: 40px;
  /* min-width/min-height enforce the 48px touch target */
}

:host([size="lg"]) {
  width: 56px;
  height: 56px;
}

:host([disabled]),
:host([loading]) {
  pointer-events: none;
  cursor: default;
}

/* ─── Surface (inner <button>) ─────────────────────────────────────────────── */

[part="surface"] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: inherit;
  cursor: inherit;
  background: transparent;
  color: inherit;
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  padding: 0;
  -webkit-appearance: none;
  appearance: none;
  transform-origin: center;
}

/* Suppress native outline on inner button in all cases — :host carries the ring instead,
   so it paints in light DOM above the shadow stacking context (including the loading ring). */
[part="surface"]:focus {
  outline: none;
}

:host:has([part="surface"]:focus-visible) {
  outline: 2px solid var(--fluid-focus-ring-color, var(--fluid-color-brand, #005FCC));
  outline-offset: 3px;
}

/* ─── Variants ──────────────────────────────────────────────────────────────── */

/*
 * color on :host ensures currentColor resolves correctly for the loading ring
 * SVG (which lives as a sibling of [part="surface"] in the shadow root and
 * therefore inherits from :host, not from the surface's own color rule).
 * [part="surface"] color rules below override this for the inner button, so
 * slotted icon colour is unaffected.
 */
:host([variant="primary"]) {
  color: white;
}

:host([variant="secondary"]),
:host([variant="ghost"]),
:host(:not([variant])) {
  color: var(--fluid-color-brand, #005FCC);
}

:host([variant="primary"]) [part="surface"] {
  background: var(--fluid-color-brand, #005FCC);
  color: white;
}

:host([variant="secondary"]) [part="surface"],
:host(:not([variant])) [part="surface"] {
  background: var(--fluid-color-brand-50, rgba(0 95 204 / 0.12));
  color: var(--fluid-color-brand, #005FCC);
}

:host([variant="ghost"]) [part="surface"] {
  background: transparent;
  color: var(--fluid-color-brand, #005FCC);
}

/* ─── Icon slot ─────────────────────────────────────────────────────────────── */

[part="icon"] {
  display: contents;
  line-height: 1;
}

/* ─── Overlay ───────────────────────────────────────────────────────────────── */

[part="overlay"] {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: transparent;
  pointer-events: none;
  z-index: 2;
  transition: background 120ms ease;
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
:host([variant="secondary"]) [part="border"],
:host(:not([variant])) [part="border"] {
  border-color: color-mix(in srgb, var(--fluid-color-brand, #005FCC) 38%, transparent);
}

/* ─── Loading ring (SVG arc tracing the button border) ──────────────────────── */

.fluid-loading-ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 4;
  transform-origin: center;
  animation: fluid-border-ring var(--fluid-spinner-duration, 0.9s) linear infinite;
  overflow: visible;
  /* Soften slightly so the arc reads as translucent glass, not painted-on */
  opacity: 0.82;
}

@keyframes fluid-border-ring {
  to { transform: rotate(1turn); }
}

/* ─── States ────────────────────────────────────────────────────────────────── */

:host([disabled]) [part="surface"],
[part="surface"][aria-disabled="true"]:not([aria-busy="true"]) {
  opacity: 0.38;
}

:host([loading]) [part="surface"] {
  opacity: 0.5;
}

/* ─── prefers-reduced-motion ────────────────────────────────────────────────── */

/* OS reduced-motion: stop arc entirely; aria-busy="true" handles AT.
   Playground "Reduced" toggle: slows via --fluid-spinner-duration (set to 3s in playground styles.css). */
@media (prefers-reduced-motion: reduce) {
  .fluid-loading-ring {
    animation: none;
  }
}

/* ─── prefers-contrast: more ────────────────────────────────────────────────── */

@media (prefers-contrast: more) {
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
  :host:has([part="surface"]:focus-visible) {
    outline: 2px solid Highlight;
  }
  .fluid-loading-ring circle {
    stroke: ButtonText;
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
