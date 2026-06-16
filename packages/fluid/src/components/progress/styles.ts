const styles = /* css */ `
/* ─── Host ──────────────────────────────────────────────────────────────────── */

:host {
  display: block;
  position: relative;
}

/* Circular variant: inline-block with size from data-size */
:host([data-variant="circular"]) {
  display: inline-block;
}

/* ─── Size: circular dimensions ──────────────────────────────────────────────── */

/* spec: sm = 24px, md = 40px (default), lg = 64px for circular */
:host([data-variant="circular"]),
:host([data-variant="circular"][data-size="md"]) {
  width: 40px;
  height: 40px;
}

:host([data-variant="circular"][data-size="sm"]) {
  width: 24px;
  height: 24px;
}

:host([data-variant="circular"][data-size="lg"]) {
  width: 64px;
  height: 64px;
}

/* ─── Variant visibility toggle ──────────────────────────────────────────────── */

:host([data-variant="circular"]) [part="linear-track"] {
  display: none;
}

:host(:not([data-variant="circular"])) [part="circular-track"] {
  display: none;
}

/* ─── Linear track ───────────────────────────────────────────────────────────── */

/* spec: default track height is 8px (md); sm = 4px; lg = 12px */
[part="linear-track"] {
  height: 8px;
  border-radius: 4px;
  background: var(--fluid-color-neutral-200);
  overflow: hidden;
  position: relative;
}

:host([data-size="sm"]) [part="linear-track"] {
  height: 4px;
  border-radius: 2px;
}

:host([data-size="lg"]) [part="linear-track"] {
  height: 12px;
  border-radius: 6px;
}

[part="linear-fill"] {
  height: 100%;
  background: var(--fluid-color-brand);
  border-radius: inherit;
  width: var(--fluid-progress-fill, 0%);
  transition: width 0.3s ease;
}

/* Indeterminate linear animation */
:host([data-indeterminate]) [part="linear-fill"] {
  width: 40%;
  animation: fluid-progress-slide 1.5s ease-in-out infinite;
  animation-duration: var(--fluid-progress-duration, 1.5s);
  transform: translateX(-200%);
}

@keyframes fluid-progress-slide {
  0%   { transform: translateX(-200%); }
  50%  { transform: translateX(150%); }
  100% { transform: translateX(-200%); }
}

/* ─── Circular track ─────────────────────────────────────────────────────────── */

[part="circular-track"] {
  display: block;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

[part="circular-bg"] {
  stroke: var(--fluid-color-neutral-200);
  fill: none;
}

[part="circular-arc"] {
  stroke: var(--fluid-color-brand);
  fill: none;
  transition: stroke-dashoffset 0.3s ease;
}

/* Indeterminate circular animation */
:host([data-indeterminate][data-variant="circular"]) [part="circular-track"] {
  animation: fluid-circular-spin 1s linear infinite;
  animation-duration: var(--fluid-progress-duration, 1s);
  transform-origin: center center;
}

@keyframes fluid-circular-spin {
  from { transform: rotate(-90deg); }
  to   { transform: rotate(270deg); }
}

/* ─── prefers-reduced-motion ─────────────────────────────────────────────────── */

@media (prefers-reduced-motion: reduce) {
  [part="linear-fill"],
  [part="circular-arc"] {
    transition: none;
  }

  :host([data-indeterminate]) [part="linear-fill"] {
    animation: none;
    transform: none;
    width: 50%; /* static placeholder per spec */
  }

  :host([data-indeterminate][data-variant="circular"]) [part="circular-track"] {
    animation: none;
  }
}

/* ─── prefers-contrast: more ─────────────────────────────────────────────────── */

@media (prefers-contrast: more) {
  [part="linear-track"] {
    border: 2px solid currentColor;
    background: var(--fluid-color-neutral-200);
    backdrop-filter: none;
  }
}

/* ─── forced-colors ──────────────────────────────────────────────────────────── */

@media (forced-colors: active) {
  [part="linear-track"],
  [part="circular-bg"] {
    stroke: ButtonText;
    background: ButtonFace;
    forced-color-adjust: auto;
  }

  [part="linear-fill"],
  [part="circular-arc"] {
    stroke: Highlight;
    background: Highlight;
    forced-color-adjust: auto;
  }
}
`

export default styles
