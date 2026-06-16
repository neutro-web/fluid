const styles = /* css */ `

[hidden] { display: none !important; }

:host {
  display: block;
  position: relative;
  contain: layout style;
}

/* ─── Content column (flex container for illustration, text, actions) ─────── */

[part="content-column"] {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--fluid-space-4, 1rem);
  padding: var(--fluid-space-4, 1rem) var(--fluid-space-2, 0.5rem);
  width: 100%;
  box-sizing: border-box;
}

/* ─── Illustration wrapper ───────────────────────────────────────────────── */

[part="illustration-wrapper"] {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
}

[part="illustration-wrapper"] ::slotted(*) {
  display: block;
  max-width: 100%;
  max-height: 100%;
}

[part="illustration-wrapper"] img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* ─── Text block ─────────────────────────────────────────────────────────── */

[part="text-block"] {
  display: flex;
  flex-direction: column;
  gap: var(--fluid-space-2, 0.5rem);
}

[part="headline"] {
  margin: 0;
  font-size: var(--fluid-font-size-lg, 1.125rem);
  font-weight: 600;
  line-height: 1.3;
  color: var(--fluid-color-text-primary, inherit);
}

[part="description"] {
  margin: 0;
  font-size: var(--fluid-font-size-sm, 0.875rem);
  line-height: 1.5;
  color: var(--fluid-color-text-secondary, color-mix(in srgb, currentColor 60%, transparent));
}

/* ─── Actions wrapper ────────────────────────────────────────────────────── */

[part="actions-wrapper"] {
  display: flex;
  flex-wrap: wrap;
  gap: var(--fluid-space-2, 0.5rem);
  justify-content: center;
  align-items: center;
}

/* ─── prefers-contrast: more ─────────────────────────────────────────────── */

@media (prefers-contrast: more) {
  [part="illustration-wrapper"] img {
    border: 2px solid currentColor;
    border-radius: var(--fluid-radius-sm, 4px);
  }

  [part="headline"] {
    color: CanvasText;
  }

  [part="description"] {
    color: CanvasText;
  }
}

/* ─── forced-colors ──────────────────────────────────────────────────────── */

@media (forced-colors: active) {
  [part="illustration-wrapper"] img {
    forced-color-adjust: none;
  }

  [part="headline"],
  [part="description"] {
    color: CanvasText;
  }
}
`

export default styles
