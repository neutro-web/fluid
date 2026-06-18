const styles = /* css */ `
/* ─── Host ──────────────────────────────────────────────────────────────────── */

:host {
  display: block;
  position: sticky;
  top: 0;
  z-index: var(--fluid-z-raised, 100);
  width: 100%;
}

/* ─── Skip link ─────────────────────────────────────────────────────────────── */

[part="skip-link"] {
  position: absolute;
  left: -9999px;
  top: auto;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

[part="skip-link"]:focus {
  position: fixed;
  top: 0;
  left: 0;
  width: auto;
  height: auto;
  overflow: visible;
  padding: 8px 16px;
  background: var(--fluid-color-surface, #fff);
  color: var(--fluid-color-on-surface, #000);
  z-index: 9999;
}

/* ─── Surface ────────────────────────────────────────────────────────────────── */

[part="surface"] {
  display: flex;
  align-items: center;
  width: 100%;
  height: var(--fluid-nav-full-height, 64px);
}

/* ─── Shrink via custom property ─────────────────────────────────────────────── */

:host([data-scroll-driven]) {
  animation: none;
}

/* ─── Slots ──────────────────────────────────────────────────────────────────── */

[part="leading"] {
  flex: 0 0 auto;
}

[part="content"] {
  flex: 1 1 auto;
}

[part="trailing"] {
  flex: 0 0 auto;
}
`

export default styles
