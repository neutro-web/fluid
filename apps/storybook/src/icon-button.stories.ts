import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import '@neutro/fluid/icon-button'

// ─── Shared icon fixtures ──────────────────────────────────────────────────────

const CloseIcon = html`
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>
`

const AddIcon = html`
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M10 4V16M4 10H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>
`

const EditIcon = html`
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M14.5 2.5L17.5 5.5L7 16H4V13L14.5 2.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/>
  </svg>
`

const DeleteIcon = html`
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M4 6H16M8 6V4H12V6M7 6V16H13V6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`

const ShareIcon = html`
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <circle cx="15" cy="4" r="2" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="15" cy="16" r="2" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="5" cy="10" r="2" stroke="currentColor" stroke-width="1.5"/>
    <path d="M7 9L13 5M7 11L13 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>
`

const SmallIcon = html`
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M8 2L8 14M2 8L14 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>
`

const LargeIcon = html`
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 3L12 21M3 12L21 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>
`

// ─── Meta ──────────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: 'Actions / Icon Button',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A circular icon-only button with spring press deformation (scale 0.94) and ripple at Frosted+. ' +
          'aria-label is mandatory — a FluidError is thrown in dev if absent.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost'],
      description: 'Visual hierarchy',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Physical size of the circular target',
    },
    disabled: {
      control: 'boolean',
    },
    loading: {
      control: 'boolean',
    },
    ariaLabel: {
      control: 'text',
      name: 'aria-label',
      description: 'Required accessible name',
    },
  },
  args: {
    variant: 'secondary',
    size: 'md',
    disabled: false,
    loading: false,
    ariaLabel: 'Add item',
  },
}

export default meta
type Story = StoryObj<typeof meta>

// ─── Variants ──────────────────────────────────────────────────────────────────

export const Primary: Story = {
  render: () => html`
    <fluid-icon-button variant="primary" aria-label="Add item">
      ${AddIcon}
    </fluid-icon-button>
  `,
}

export const Secondary: Story = {
  render: () => html`
    <fluid-icon-button variant="secondary" aria-label="Edit">
      ${EditIcon}
    </fluid-icon-button>
  `,
}

export const Ghost: Story = {
  render: () => html`
    <fluid-icon-button variant="ghost" aria-label="Share">
      ${ShareIcon}
    </fluid-icon-button>
  `,
}

export const AllVariants: Story = {
  render: () => html`
    <div style="display:flex;align-items:center;gap:12px">
      <fluid-icon-button variant="primary" aria-label="Add item">
        ${AddIcon}
      </fluid-icon-button>
      <fluid-icon-button variant="secondary" aria-label="Edit">
        ${EditIcon}
      </fluid-icon-button>
      <fluid-icon-button variant="ghost" aria-label="Share">
        ${ShareIcon}
      </fluid-icon-button>
    </div>
  `,
}

// ─── Sizes ─────────────────────────────────────────────────────────────────────

export const Sizes: Story = {
  render: () => html`
    <div style="display:flex;align-items:center;gap:12px">
      <fluid-icon-button variant="primary" size="sm" aria-label="Add item (small)">
        ${SmallIcon}
      </fluid-icon-button>
      <fluid-icon-button variant="primary" size="md" aria-label="Add item (medium)">
        ${AddIcon}
      </fluid-icon-button>
      <fluid-icon-button variant="primary" size="lg" aria-label="Add item (large)">
        ${LargeIcon}
      </fluid-icon-button>
    </div>
  `,
}

// ─── States ────────────────────────────────────────────────────────────────────

export const Default: Story = {
  render: () => html`
    <fluid-icon-button variant="secondary" aria-label="Close panel">
      ${CloseIcon}
    </fluid-icon-button>
  `,
}

export const Disabled: Story = {
  render: () => html`
    <div style="display:flex;align-items:center;gap:12px">
      <fluid-icon-button variant="primary" disabled aria-label="Add item (disabled)">
        ${AddIcon}
      </fluid-icon-button>
      <fluid-icon-button variant="secondary" disabled aria-label="Edit (disabled)">
        ${EditIcon}
      </fluid-icon-button>
      <fluid-icon-button variant="ghost" disabled aria-label="Share (disabled)">
        ${ShareIcon}
      </fluid-icon-button>
    </div>
  `,
}

export const Loading: Story = {
  render: () => html`
    <div style="display:flex;align-items:center;gap:12px">
      <fluid-icon-button variant="primary" loading aria-label="Saving…">
        ${AddIcon}
      </fluid-icon-button>
      <fluid-icon-button variant="secondary" loading aria-label="Processing…">
        ${EditIcon}
      </fluid-icon-button>
    </div>
  `,
}

// ─── All states side-by-side ────────────────────────────────────────────────────

export const AllStates: Story = {
  render: () => html`
    <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;font:11px/1 system-ui;opacity:.6">
        <fluid-icon-button variant="secondary" aria-label="Default state">
          ${CloseIcon}
        </fluid-icon-button>
        Default
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;font:11px/1 system-ui;opacity:.6">
        <fluid-icon-button variant="secondary" disabled aria-label="Disabled state">
          ${CloseIcon}
        </fluid-icon-button>
        Disabled
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;font:11px/1 system-ui;opacity:.6">
        <fluid-icon-button variant="secondary" loading aria-label="Loading state">
          ${CloseIcon}
        </fluid-icon-button>
        Loading
      </div>
    </div>
  `,
}

// ─── Interactive (controls-driven) ─────────────────────────────────────────────

export const Interactive: Story = {
  render: (args) => html`
    <fluid-icon-button
      variant=${args['variant']}
      size=${args['size']}
      ?disabled=${args['disabled']}
      ?loading=${args['loading']}
      aria-label=${args['ariaLabel'] || 'Button'}
    >
      ${AddIcon}
    </fluid-icon-button>
  `,
}
