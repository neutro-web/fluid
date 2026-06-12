export const rules = {
  'no-shadow-piercing': {
    meta: { type: 'problem' as const, docs: { description: 'Disallow shadow-piercing CSS combinators (::slotted, :host, >>)' } },
    create() { return {}; }
  },
  'icon-button-aria-label': {
    meta: { type: 'problem' as const, docs: { description: 'Require aria-label on fluid-icon-button elements' } },
    create() { return {}; }
  }
};
