const styles = /* css */ `
/* ─── Host ──────────────────────────────────────────────────────────────────── */

:host {
  display: inline-block;
  position: relative;
  background: var(--fluid-color-neutral-200);
  border-radius: 4px;
  overflow: hidden;
  line-height: 1;
  /* Prevent shimmer from bleeding outside rounded corners */
  isolation: isolate;
}

/* ─── Variant: rectangular (default) ────────────────────────────────────────── */

:host([data-variant="rectangular"]),
:host(:not([data-variant])) {
  border-radius: 4px;
}

/* ─── Variant: circular ──────────────────────────────────────────────────────── */

:host([data-variant="circular"]) {
  border-radius: 50%;
}

/* ─── Variant: text ──────────────────────────────────────────────────────────── */

:host([data-variant="text"]) {
  border-radius: 3px;
}

/* ─── Surface ────────────────────────────────────────────────────────────────── */

[part="surface"] {
  display: block;
  position: absolute;
  inset: 0;
  border-radius: inherit;
}

/* ─── Multi-line text skeleton ───────────────────────────────────────────────── */

[part="surface"]:has([part="line"]) {
  display: flex;
  flex-direction: column;
  gap: 0.3em;
}

[part="line"] {
  flex: 0 0 auto;
  height: 1em;
  background: var(--fluid-color-neutral-200);
  border-radius: 3px;
  width: 100%;
  position: relative;
  overflow: hidden;
}

/* ─── Matte pulse — ::after in shadow DOM, not reachable by .reduced-motion * ── */
/* On Matte the glass shimmer is disabled; a white overlay pulse on the surface's
   ::after communicates "loading" without glass effects. Kept in shadow DOM so the
   playground's .reduced-motion * { animation-duration: 0.01ms !important } rule
   (which only reaches light DOM) cannot cause a rapid flash. */

:host(:not([data-shimmer])) [part="surface"]::after,
:host(:not([data-shimmer])) [part="line"]::after {
  content: '';
  position: absolute;
  inset: 0;
  background: oklch(1 0 0 / 0.2);
  opacity: 0;
  animation: fluid-skeleton-pulse 1.5s ease-in-out infinite;
  animation-duration: var(--fluid-shimmer-duration, 1.5s);
}

@keyframes fluid-skeleton-pulse {
  0%, 100% { opacity: 0; }
  50%       { opacity: 1; }
}

/* ─── Shimmer — Frosted+ tier ────────────────────────────────────────────────── */

:host([data-shimmer]) [part="surface"]::after,
:host([data-shimmer]) [part="line"]::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    oklch(1 0 0 / 0.5) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  background-position: -200% 0;
  animation: fluid-shimmer 1.4s ease-in-out infinite;
  animation-duration: var(--fluid-shimmer-duration, 1.4s);
}

@keyframes fluid-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}

/* ─── Slot: content container sits behind shimmer surface ────────────────────── */

slot {
  display: none;
}

/* ─── prefers-reduced-motion ─────────────────────────────────────────────────── */

@media (prefers-reduced-motion: reduce) {
  :host(:not([data-shimmer])) [part="surface"]::after,
  :host(:not([data-shimmer])) [part="line"]::after {
    animation: none;
    opacity: 0;
  }

  :host([data-shimmer]) [part="surface"]::after,
  :host([data-shimmer]) [part="line"]::after {
    animation: none;
    background: none;
  }
}

/* ─── prefers-contrast: more ─────────────────────────────────────────────────── */

@media (prefers-contrast: more) {
  :host {
    border: 1px solid currentColor;
    backdrop-filter: none;
  }

  :host([data-shimmer]) [part="surface"]::after,
  :host([data-shimmer]) [part="line"]::after,
  :host(:not([data-shimmer])) [part="surface"]::after,
  :host(:not([data-shimmer])) [part="line"]::after {
    animation: none;
    background: none;
    opacity: 0;
  }
}

/* ─── forced-colors ──────────────────────────────────────────────────────────── */

@media (forced-colors: active) {
  :host {
    background: ButtonFace;
    border: 1px solid ButtonText;
    forced-color-adjust: auto;
  }

  :host([data-shimmer]) [part="surface"]::after,
  :host([data-shimmer]) [part="line"]::after,
  :host(:not([data-shimmer])) [part="surface"]::after,
  :host(:not([data-shimmer])) [part="line"]::after {
    display: none;
  }
}
`

export default styles
