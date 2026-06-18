import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import '@neutro/fluid/link'

const meta: Meta = {
  title: 'Actions / Link',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A styled, token-aware anchor primitive. No glass surface, no spring interaction — intentionally minimal so it composes well (breadcrumb, sidebar, nav). Uses a shadow `<a>` for native link semantics and keyboard behavior.',
      },
    },
  },
  argTypes: {
    href: {
      control: 'text',
      description: 'Navigation target. Absent → JS-driven activation only.',
    },
    target: {
      control: 'select',
      options: ['', '_blank', '_self', '_parent', '_top'],
      description: 'Link target. `_blank` auto-applies `rel="noopener noreferrer"`.',
    },
    current: {
      control: 'boolean',
      description: 'Marks this link as the current page → `aria-current="page"`.',
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled — not focusable, not activatable, `href` removed.',
    },
    label: {
      control: 'text',
      description: 'Link text content.',
    },
  },
  args: {
    href: '#about',
    target: '',
    current: false,
    disabled: false,
    label: 'About us',
  },
}

export default meta
type Story = StoryObj<typeof meta>

// ─── Default ───────────────────────────────────────────────────────────────────

export const Default: Story = {
  render: (args) => html`
    <fluid-link
      href=${args.href || ''}
      ?current=${args.current}
      ?disabled=${args.disabled}
    >${args.label}</fluid-link>
  `,
}

// ─── With icon ─────────────────────────────────────────────────────────────────

export const WithIcon: Story = {
  render: () => html`
    <fluid-link href="https://www.google.com" target="_blank">
      <svg slot="icon" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M5 2H2v10h10V9M9 2h3m0 0v3m0-3L6 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Open Google
    </fluid-link>
  `,
}

// ─── Current (active nav link) ─────────────────────────────────────────────────

export const Current: Story = {
  render: () => html`
    <nav aria-label="Site navigation" style="display:flex;gap:16px">
      <fluid-link href="#home" current>Home</fluid-link>
      <fluid-link href="#about">About</fluid-link>
      <fluid-link href="#contact">Contact</fluid-link>
    </nav>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'The active link carries `current` → `aria-current="page"`. This is the canonical nav-link pattern (contrast with `aria-selected` on tab roles).',
      },
    },
  },
}

// ─── Disabled ──────────────────────────────────────────────────────────────────

export const Disabled: Story = {
  render: () => html`
    <fluid-link href="#premium" disabled>Premium features</fluid-link>
  `,
}

// ─── External (target="_blank") ────────────────────────────────────────────────

export const ExternalBlank: Story = {
  name: 'External (target="_blank")',
  render: () => html`
    <fluid-link href="https://www.google.com" target="_blank">
      Open Google in new tab
    </fluid-link>
  `,
  parameters: {
    docs: {
      description: {
        story: '`rel="noopener noreferrer"` is applied automatically when `target="_blank"`.',
      },
    },
  },
}

// ─── In nav context ────────────────────────────────────────────────────────────

export const InNavContext: Story = {
  render: () => html`
    <nav aria-label="Breadcrumb" style="display:flex;gap:8px;align-items:center">
      <fluid-link href="#home">Home</fluid-link>
      <span aria-hidden="true">/</span>
      <fluid-link href="#products">Products</fluid-link>
      <span aria-hidden="true">/</span>
      <fluid-link current>Widgets</fluid-link>
    </nav>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'Composing `fluid-link` elements in a `<nav>` for breadcrumb-style navigation. The last crumb carries `current`.',
      },
    },
  },
}

// ─── Tier note ─────────────────────────────────────────────────────────────────
// fluid-link renders identically at all tiers (no glass, no spring, no tier-gated behavior).
// A single story covers all tiers — no need for 4 tier variants.
