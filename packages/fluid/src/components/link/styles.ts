const styles = /* css */ `
/* ─── Host ─────────────────────────────────────────────────────────────────── */

:host {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

:host([disabled]) {
  pointer-events: none;
  cursor: default;
  opacity: 0.38;
}

/* ─── Inner anchor ──────────────────────────────────────────────────────────── */

[part="anchor"] {
  display: inline-flex;
  align-items: center;
  gap: inherit;
  color: var(--fluid-color-link, var(--fluid-color-brand, #005FCC));
  text-decoration: underline;
  text-decoration-color: color-mix(in srgb, currentColor 40%, transparent);
  text-underline-offset: 2px;
  font: inherit;
  cursor: inherit;
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  outline: none;
  transition:
    color 120ms ease,
    text-decoration-color 120ms ease;
  /* RTL: inline layout mirrors automatically via text direction */
}

[part="anchor"]:hover {
  color: var(--fluid-color-link-hover, var(--fluid-color-brand, #005FCC));
  text-decoration-color: currentColor;
}

[part="anchor"]:visited {
  color: var(--fluid-color-link-visited, color-mix(in srgb, var(--fluid-color-brand, #005FCC) 70%, purple));
}

/* ─── Focus ring (§8.6 shared mixin) ───────────────────────────────────────── */

[part="anchor"]:focus-visible {
  outline: 2px solid var(--fluid-focus-ring-color, var(--fluid-color-brand, #005FCC));
  outline-offset: 2px;
  border-radius: 2px;
}

[part="anchor"]:focus:not(:focus-visible) {
  outline: none;
}

/* ─── Slots ─────────────────────────────────────────────────────────────────── */

[part="icon"] {
  display: contents;
  line-height: 1;
  /* Logical properties: icon slot naturally mirrors with text direction */
}

[part="icon"]:not(:has(> *)) {
  display: none;
}

[part="label"] {
  display: contents;
}

/* ─── current state ─────────────────────────────────────────────────────────── */

:host([current]) [part="anchor"] {
  font-weight: 600;
  text-decoration: none;
}

/* ─── disabled visual ────────────────────────────────────────────────────────── */

:host([disabled]) [part="anchor"] {
  color: var(--fluid-color-on-surface-muted, rgba(0 0 0 / 0.38));
  text-decoration: none;
  cursor: not-allowed;
}

/* ─── forced-colors ─────────────────────────────────────────────────────────── */

@media (forced-colors: active) {
  [part="anchor"] {
    color: LinkText;
    text-decoration: underline;
  }

  [part="anchor"]:visited {
    color: VisitedText;
  }

  [part="anchor"]:focus-visible {
    outline: 2px solid Highlight;
  }

  :host([disabled]) [part="anchor"] {
    color: GrayText;
  }
}
`

export default styles
