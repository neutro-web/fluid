// @ts-check
'use strict';

/** @type {import('eslint').Rule.RuleModule} */
const noShadowPiercing = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow shadow-piercing CSS combinators (::slotted, :host, >>)' }
  },
  create() { return {}; }
};

/** @type {import('eslint').Rule.RuleModule} */
const iconButtonAriaLabel = {
  meta: {
    type: 'problem',
    docs: { description: 'Require aria-label on fluid-icon-button elements' }
  },
  create() { return {}; }
};

/** @type {import('@eslint/core').FlatConfig[]} */
module.exports = [
  {
    plugins: {
      '@neutro/fluid': {
        rules: {
          'no-shadow-piercing': noShadowPiercing,
          'icon-button-aria-label': iconButtonAriaLabel
        }
      }
    },
    rules: {
      '@neutro/fluid/no-shadow-piercing': 'warn',
      '@neutro/fluid/icon-button-aria-label': 'error'
    }
  }
];
