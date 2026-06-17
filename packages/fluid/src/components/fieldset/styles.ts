const styles = /* css */ `

[hidden] { display: none !important; }

/* ─── Host ──────────────────────────────────────────────────────────────────── */

:host {
  display: block;
  position: relative;
  color-scheme: light dark;
}

/* ─── Fieldset reset — strip UA border, margin, padding ─────────────────────── */

[part="fieldset"] {
  display: block;
  border: none;
  margin: 0;
  padding: 0;
  min-inline-size: 0;
}

/* ─── Header (thin glass material — legend area only) ────────────────────────── */

[part="header"] {
  display: flex;
  align-items: center;
  gap: var(--fluid-space-2, 0.5rem);
  padding-block: var(--fluid-space-2, 0.5rem);
  padding-inline: var(--fluid-space-3, 0.75rem);
  border-radius: var(--fluid-fieldset-header-radius, var(--fluid-radius-sm, 6px));
  position: relative;
  overflow: hidden;
  transform-origin: center;

  /* Adapts to color scheme when no theme token is set; full §IX weight/shadow compensation is future work */
  color: var(--fluid-color-on-surface, light-dark(#111111, #f0f0f0));
  /* Matte: opaque neutral background with depth separation */
  background: var(--fluid-color-neutral-100, hsl(0 0% 96%));
  box-shadow:
    0 1px 3px hsl(0 0% 0% / 0.08),
    0 1px 1px hsl(0 0% 0% / 0.04);
}

/* Frosted+: backdrop-filter glass surface */
[part="header"][data-glass] {
  backdrop-filter: blur(8px) saturate(var(--fluid-vibrancy, 1.8));
  background: var(--fluid-tint-light, hsl(0 0% 100% / 0.55));
  box-shadow:
    0 1px 3px hsl(0 0% 0% / 0.08),
    0 1px 1px hsl(0 0% 0% / 0.04);
  --fluid-blur-current: 8;
}

/* ─── Specular rim on header (glass edge highlight) ──────────────────────────── */

[part="header"]::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  border: 1px solid;
  border-color:
    color-mix(in srgb, white 25%, transparent)
    color-mix(in srgb, white 12%, transparent)
    color-mix(in srgb, black 6%, transparent)
    color-mix(in srgb, white 18%, transparent);
}

/* No specular rim on matte (opaque, no glass) */
[part="header"]:not([data-glass])::after {
  display: none;
}

/* ─── Legend ─────────────────────────────────────────────────────────────────── */

[part="legend"] {
  flex: 1 1 auto;
  min-inline-size: 0;
  font-size: var(--fluid-font-size-sm, 0.875rem);
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--fluid-color-on-surface, light-dark(#111111, #f0f0f0));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

[part="legend-text"] {
  /* Inline flow — renders the legend attribute text */
}

/* ─── Header actions ─────────────────────────────────────────────────────────── */

[part="header-actions"] {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: var(--fluid-space-1, 0.25rem);
}

/* ─── Body ───────────────────────────────────────────────────────────────────── */

[part="body"] {
  padding-block: var(--fluid-space-3, 0.75rem);
  padding-inline-start: var(--fluid-space-1, 0.25rem);
}

/* ─── Disabled state — header only, not body ─────────────────────────────────── */

:host([disabled]) [part="header"] {
  opacity: 0.5;
  pointer-events: none;
}

/* ─── prefers-reduced-motion — no animate override needed (header uses spring) ── */

@media (prefers-reduced-motion: reduce) {
  [part="header"] {
    transition: none !important;
  }
}

/* ─── prefers-contrast: more ─────────────────────────────────────────────────── */

@media (prefers-contrast: more) {
  [part="header"] {
    background: Canvas !important;
    backdrop-filter: none !important;
    border: 2px solid currentColor;
    box-shadow: none !important;
  }

  [part="header"]::after {
    display: none;
  }

  [part="legend"] {
    color: ButtonText;
  }
}

/* ─── forced-colors ──────────────────────────────────────────────────────────── */

@media (forced-colors: active) {
  [part="header"] {
    background: Canvas !important;
    border: 1px solid ButtonText !important;
    backdrop-filter: none !important;
    box-shadow: none !important;
  }

  [part="header"]::after {
    display: none;
  }

  [part="legend"] {
    color: ButtonText !important;
  }
}

/* ─── Print ──────────────────────────────────────────────────────────────────── */

@media print {
  [part="header"] {
    background: white !important;
    border: 1px solid #ccc !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
  }

  [part="header"]::after {
    display: none;
  }
}
`

export default styles
