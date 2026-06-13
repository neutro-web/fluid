import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import '@neutro/fluid/button'

const meta: Meta = {
  title: 'Actions / Button',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'A physics-grounded glass material button with spring press deformation and ripple.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'destructive', 'ghost'],
      description: 'Visual hierarchy and semantic intent',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Physical target size',
    },
    disabled: {
      control: 'boolean',
    },
    loading: {
      control: 'boolean',
    },
    label: {
      control: 'text',
    },
  },
  args: {
    variant: 'secondary',
    size: 'md',
    disabled: false,
    loading: false,
    label: 'Click me',
  },
}

export default meta
type Story = StoryObj<typeof meta>

// ─── Variants ──────────────────────────────────────────────────────────────────

export const Primary: Story = {
  render: () => html`
    <fluid-button variant="primary">Save changes</fluid-button>
  `,
}

export const Secondary: Story = {
  render: () => html`
    <fluid-button variant="secondary">Cancel</fluid-button>
  `,
}

export const Destructive: Story = {
  render: () => html`
    <fluid-button variant="destructive">Delete account</fluid-button>
  `,
}

export const Ghost: Story = {
  render: () => html`
    <fluid-button variant="ghost">Learn more</fluid-button>
  `,
}

// ─── Sizes ─────────────────────────────────────────────────────────────────────

export const Sizes: Story = {
  render: () => html`
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <fluid-button variant="primary" size="sm">Small</fluid-button>
      <fluid-button variant="primary" size="md">Medium</fluid-button>
      <fluid-button variant="primary" size="lg">Large</fluid-button>
    </div>
  `,
}

// ─── All Variants ───────────────────────────────────────────────────────────────

export const AllVariants: Story = {
  render: () => html`
    <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
      <fluid-button variant="primary">Primary</fluid-button>
      <fluid-button variant="secondary">Secondary</fluid-button>
      <fluid-button variant="destructive">Destructive</fluid-button>
      <fluid-button variant="ghost">Ghost</fluid-button>
    </div>
  `,
}

// ─── States ────────────────────────────────────────────────────────────────────

export const Default: Story = {
  render: () => html`
    <fluid-button variant="primary">Submit form</fluid-button>
  `,
}

export const Disabled: Story = {
  render: () => html`
    <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
      <fluid-button variant="primary" disabled>Primary disabled</fluid-button>
      <fluid-button variant="secondary" disabled>Secondary disabled</fluid-button>
      <fluid-button variant="destructive" disabled>Destructive disabled</fluid-button>
      <fluid-button variant="ghost" disabled>Ghost disabled</fluid-button>
    </div>
  `,
}

export const Loading: Story = {
  render: () => html`
    <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
      <fluid-button variant="primary" loading>Saving…</fluid-button>
      <fluid-button variant="secondary" loading>Processing</fluid-button>
      <fluid-button variant="destructive" loading>Deleting</fluid-button>
    </div>
  `,
}

// ─── With icons ─────────────────────────────────────────────────────────────────

export const WithLeadingIcon: Story = {
  render: () => html`
    <fluid-button variant="primary">
      <svg slot="icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 2L8 14M2 8L14 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      Add item
    </fluid-button>
  `,
}

export const WithTrailingIcon: Story = {
  render: () => html`
    <fluid-button variant="secondary">
      Continue
      <svg slot="trailing-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </fluid-button>
  `,
}

// ─── Form integration ───────────────────────────────────────────────────────────

export const InForm: Story = {
  render: () => html`
    <form
      style="display:flex;flex-direction:column;gap:12px;max-width:320px"
      @submit=${(e: Event) => { e.preventDefault(); alert('Form submitted!') }}
    >
      <label style="display:flex;flex-direction:column;gap:4px;font-family:system-ui">
        Name
        <input type="text" name="name" placeholder="Your name"
          style="padding:8px 12px;border:1px solid #ccc;border-radius:6px;font:inherit">
      </label>
      <div style="display:flex;gap:8px">
        <fluid-button type="submit" variant="primary">Submit</fluid-button>
        <fluid-button type="reset" variant="ghost">Reset</fluid-button>
      </div>
    </form>
  `,
}

// ─── Interactive (controls-driven) ─────────────────────────────────────────────

export const Interactive: Story = {
  render: (args) => html`
    <fluid-button
      variant=${args['variant']}
      size=${args['size']}
      ?disabled=${args['disabled']}
      ?loading=${args['loading']}
    >${args['label']}</fluid-button>
  `,
}
