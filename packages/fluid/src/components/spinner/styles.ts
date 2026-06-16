const styles = /* css */ `
/* ─── Host ─────────────────────────────────────────────────────────────────── */

:host {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
  flex-shrink: 0;
}

/* ─── Sizes ─────────────────────────────────────────────────────────────────── */

:host,
:host([data-size="md"]) {
  width: 24px;
  height: 24px;
}

:host([data-size="sm"]) {
  width: 16px;
  height: 16px;
}

/* spec: lg is 40px (not 36px) */
:host([data-size="lg"]) {
  width: 40px;
  height: 40px;
}

/* ─── Track ─────────────────────────────────────────────────────────────────── */

[part="track"] {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

/* ─── Arc ───────────────────────────────────────────────────────────────────── */

[part="arc"] {
  width: 100%;
  height: 100%;
  border: 2px solid var(--fluid-color-neutral-200);
  border-top-color: var(--fluid-color-brand);
  border-radius: 50%;
  animation: fluid-spin 0.8s linear infinite;
  animation-duration: var(--fluid-spin-duration, 0.8s);
  box-sizing: border-box;
  /* spec: eligible for compositor-thread animation */
  will-change: transform;
}

/* ─── Variant: glass (default) ───────────────────────────────────────────────── */

:host([data-variant="glass"]) [part="arc"],
:host(:not([data-variant])) [part="arc"] {
  border-color: var(--fluid-color-neutral-200);
  border-top-color: var(--fluid-color-brand);
}

/* ─── Variant: brand ─────────────────────────────────────────────────────────── */

:host([data-variant="brand"]) [part="arc"] {
  border-color: color-mix(in oklch, var(--fluid-color-brand) 25%, transparent);
  border-top-color: var(--fluid-color-brand);
}

/* ─── Variant: neutral ───────────────────────────────────────────────────────── */

:host([data-variant="neutral"]) [part="arc"] {
  border-color: var(--fluid-color-neutral-200);
  border-top-color: var(--fluid-color-neutral-400);
}

/* ─── Keyframes ─────────────────────────────────────────────────────────────── */

@keyframes fluid-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes fluid-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}

/* ─── prefers-reduced-motion ────────────────────────────────────────────────── */

@media (prefers-reduced-motion: reduce) {
  [part="arc"] {
    animation: fluid-pulse 1.5s ease-in-out infinite;
    animation-duration: var(--fluid-spin-duration, 1.5s);
    transform: none;
  }
}

/* ─── prefers-contrast: more ─────────────────────────────────────────────────── */

@media (prefers-contrast: more) {
  [part="arc"] {
    border-width: 4px;
    backdrop-filter: none;
  }
}

/* ─── forced-colors ─────────────────────────────────────────────────────────── */

@media (forced-colors: active) {
  [part="arc"] {
    border-color: ButtonText;
    border-top-color: Highlight;
  }
}
`

export default styles
