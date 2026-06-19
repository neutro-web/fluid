const navBarStyles = /* css */ `
@property --fluid-nav-shrink-progress {
  syntax: '<number>';
  inherits: false;
  initial-value: 0;
}

@keyframes fluid-nav-shrink {
  from { --fluid-nav-shrink-progress: 0; }
  to { --fluid-nav-shrink-progress: 1; }
}

:host {
  display: block;
  position: sticky;
  top: 0;
  z-index: var(--fluid-z-raised, 200);
  width: 100%;
  overflow: hidden;
  contain: layout style;
  height: calc(
    var(--fluid-nav-full-height, 64px) *
    (1 - var(--fluid-nav-shrink-progress, 0) * (1 - var(--fluid-nav-shrink-amount, 0.6)))
  );
  backdrop-filter: blur(calc(var(--fluid-blur-regular, 20px) + var(--fluid-blur-delta, 0) * 1px));
  -webkit-backdrop-filter: blur(calc(var(--fluid-blur-regular, 20px) + var(--fluid-blur-delta, 0) * 1px));
  background: oklch(var(--fluid-tint-l, 0.98) 0 0 / var(--fluid-tint-alpha, 0.65));
  box-shadow:
    0 calc(var(--fluid-shadow-depth, 0) * 2px)
    calc(var(--fluid-shadow-depth, 0) * 8px + 2px)
    oklch(0 0 0 / calc(0.06 + var(--fluid-shadow-depth, 0) * 0.06));
  transition: height 0.3s ease;
}

:host([data-scroll-driven]) {
  animation: fluid-nav-shrink linear both;
  animation-timeline: scroll(root);
  animation-range: var(--fluid-nav-shrink-start-px, 48px) var(--fluid-nav-shrink-end-px, 96px);
  transition: none;
}

:host([data-shrink-mode="stepped"][data-scroll-driven]) {
  animation-timing-function: step-start;
}

:host([data-expanding]) {
  transition: --fluid-nav-shrink-progress 200ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  :host,
  :host([data-expanding]) {
    transition: none;
  }
}

[part="skip-link"] {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
  text-decoration: none;
  color: inherit;
  pointer-events: none;
}

[part="skip-link"]:focus {
  position: fixed;
  top: 8px;
  inset-inline-start: 8px;
  width: auto;
  height: auto;
  padding: 8px 16px;
  margin: 0;
  overflow: visible;
  clip: auto;
  white-space: normal;
  pointer-events: auto;
  background: var(--fluid-color-primary, oklch(0.4 0.2 270));
  color: oklch(1 0 0);
  border-radius: 4px;
  z-index: 10000;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  outline: 2px solid oklch(1 0 0);
  outline-offset: 2px;
}

[part="surface"] {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 0 var(--fluid-space-4, 16px);
  box-sizing: border-box;
  gap: var(--fluid-space-4, 16px);
}

[part="leading"] {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-inline-end: auto;
}

[part="content"] {
  display: flex;
  align-items: center;
  gap: var(--fluid-space-4, 16px);
}

[part="trailing"] {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-inline-start: auto;
}

@media (forced-colors: active) {
  :host {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    background: Canvas;
    border-bottom: 1px solid ButtonText;
    forced-color-adjust: none;
    box-shadow: none;
  }
}
`

export default navBarStyles
