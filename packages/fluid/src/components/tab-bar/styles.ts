const styles = /* css */ `

/* ─── Tab Bar host ──────────────────────────────────────────────────────────── */

:host {
  display: flex;
  flex-direction: column;
  position: relative;
  contain: layout style;
}

/* ─── Tablist container (wraps the default slot / fluid-tabs) ───────────────── */

[part="tablist"] {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 0;
  position: relative;
  border-bottom: 1px solid var(--fluid-color-border, color-mix(in srgb, var(--fluid-color-on-surface, #111827) 15%, transparent));
  overflow-x: auto;
  scrollbar-width: none;
}
[part="tablist"]::-webkit-scrollbar { display: none; }

:host([orientation="vertical"]) [part="tablist"] {
  flex-direction: column;
  border-bottom: none;
  border-inline-end: 1px solid var(--fluid-color-border, color-mix(in srgb, var(--fluid-color-on-surface, #111827) 15%, transparent));
}

/* ─── Active indicator (FLIP-animated, absolutely positioned) ───────────────── */

[part="indicator"] {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: var(--fluid-color-brand, #005FCC);
  pointer-events: none;
  will-change: transform;
  transition: none;
}

:host([orientation="vertical"]) [part="indicator"] {
  bottom: auto;
  top: 0;
  left: auto;
  inset-inline-end: 0;
  width: 2px;
  height: 0;
  border-radius: 2px 0 0 2px;
}

/* ─── Panel area ────────────────────────────────────────────────────────────── */

[part="panels"] {
  flex: 1;
}

`

export default styles
