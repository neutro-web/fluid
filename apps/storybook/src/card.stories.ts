import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import '@neutro/fluid/card'
import '@neutro/fluid/button'

const meta: Meta = {
  title: 'Surface / Card',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A physics-grounded glass material surface. Layer 1 (Surface), thin material ' +
          '(8px blur, 0.55 tint alpha). Supports optional header, media, and actions slots. ' +
          'Interactive variant adds a stretched button trigger with elevate/flatten hover ' +
          'and depress/release press physics.',
      },
    },
  },
  argTypes: {
    interactive: {
      control: 'boolean',
      description: 'Makes the card a pressable target with pointer + keyboard activation',
    },
    layout: {
      control: 'boolean',
      description: 'Enables FLIP animation on position/size change',
    },
    loading: {
      control: 'boolean',
      description: 'Shows skeleton overlay, sets aria-busy',
    },
    error: {
      control: 'boolean',
      description: 'Activates error state — destructive border and error message region',
    },
    'error-message': {
      control: 'text',
      description: 'Message shown in the error state region',
    },
    elevation: {
      control: 'select',
      options: ['flat', 'raised', 'floating'],
      description: 'Shadow depth tier',
    },
  },
  args: {
    interactive: false,
    layout: false,
    loading: false,
    error: false,
    'error-message': '',
    elevation: 'raised',
  },
}

export default meta
type Story = StoryObj<typeof meta>

// ─── Variants ──────────────────────────────────────────────────────────────────

export const Default: Story = {
  render: () => html`
    <fluid-card style="max-width:360px">
      <h2 slot="header" style="margin:0;font-size:1rem;font-weight:600">Notification</h2>
      <p style="margin:0;line-height:1.5">
        Your report finished processing. Download is available for the next 48 hours.
      </p>
    </fluid-card>
  `,
}

export const WithMedia: Story = {
  render: () => html`
    <fluid-card style="max-width:340px">
      <div slot="media" style="height:180px;background:linear-gradient(135deg,hsl(220 80% 60%),hsl(280 70% 50%));display:flex;align-items:center;justify-content:center">
        <span style="font-size:3rem">🏞</span>
      </div>
      <h2 slot="header" style="margin:0;font-size:1rem;font-weight:600">Mountain Trail</h2>
      <p style="margin:0;line-height:1.5">A guided hike through pristine alpine terrain with panoramic views of the valley below.</p>
      <div slot="actions">
        <fluid-button variant="primary">Book now</fluid-button>
        <fluid-button variant="ghost">Learn more</fluid-button>
      </div>
    </fluid-card>
  `,
}

export const Interactive: Story = {
  render: () => html`
    <fluid-card interactive aria-label="View project details" style="max-width:360px;cursor:pointer">
      <h2 slot="header" style="margin:0;font-size:1rem;font-weight:600">Design System v2.0</h2>
      <p style="margin:0;line-height:1.5">
        Physics-grounded glass material system. Click anywhere on the card to navigate.
      </p>
      <div slot="actions">
        <fluid-button variant="ghost">Share</fluid-button>
      </div>
    </fluid-card>
  `,
}

export const ContentOnly: Story = {
  render: () => html`
    <fluid-card style="max-width:360px">
      <p style="margin:0;line-height:1.5">
        A minimal glass surface — no header, no media, no actions. Just content in the default slot.
        The surface provides the glass material and depth cues.
      </p>
    </fluid-card>
  `,
}

export const WithActions: Story = {
  render: () => html`
    <fluid-card style="max-width:360px">
      <h2 slot="header" style="margin:0;font-size:1rem;font-weight:600">Delete account</h2>
      <p style="margin:0;line-height:1.5">
        This action is permanent and cannot be undone. All your data will be removed within 30 days.
      </p>
      <div slot="actions">
        <fluid-button variant="destructive">Delete account</fluid-button>
        <fluid-button variant="ghost">Cancel</fluid-button>
      </div>
    </fluid-card>
  `,
}

// ─── Elevation variants ─────────────────────────────────────────────────────────

export const ElevationFlat: Story = {
  render: () => html`
    <fluid-card elevation="flat" style="max-width:340px">
      <h2 slot="header" style="margin:0;font-size:1rem;font-weight:600">Flat surface</h2>
      <p style="margin:0;line-height:1.5">No box-shadow — sits flush against the background layer.</p>
    </fluid-card>
  `,
}

export const ElevationRaised: Story = {
  render: () => html`
    <fluid-card elevation="raised" style="max-width:340px">
      <h2 slot="header" style="margin:0;font-size:1rem;font-weight:600">Raised surface</h2>
      <p style="margin:0;line-height:1.5">Default elevation — subtle shadow anchors the card.</p>
    </fluid-card>
  `,
}

export const ElevationFloating: Story = {
  render: () => html`
    <fluid-card elevation="floating" style="max-width:340px">
      <h2 slot="header" style="margin:0;font-size:1rem;font-weight:600">Floating surface</h2>
      <p style="margin:0;line-height:1.5">Stronger shadow — visually lifted above the page.</p>
    </fluid-card>
  `,
}

// ─── States ─────────────────────────────────────────────────────────────────────

export const Loading: Story = {
  render: () => html`
    <fluid-card loading style="max-width:360px">
      <h2 slot="header" style="margin:0;font-size:1rem;font-weight:600">Loading…</h2>
      <p style="margin:0;line-height:1.5">
        Processing your request. The skeleton overlay covers content while data loads.
      </p>
    </fluid-card>
  `,
}

export const Error: Story = {
  render: () => html`
    <fluid-card error error-message="Failed to save changes. Check your connection and try again." style="max-width:360px">
      <h2 slot="header" style="margin:0;font-size:1rem;font-weight:600">Autosave failed</h2>
      <p style="margin:0;line-height:1.5">
        Your latest edits could not be saved. They are preserved locally in this session.
      </p>
      <div slot="actions">
        <fluid-button variant="destructive">Retry save</fluid-button>
        <fluid-button variant="ghost">Dismiss</fluid-button>
      </div>
    </fluid-card>
  `,
}

// ─── Interactive states side-by-side ────────────────────────────────────────────

export const AllStates: Story = {
  render: () => html`
    <div style="display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start">
      <fluid-card style="max-width:280px">
        <h3 slot="header" style="margin:0;font-size:0.875rem;font-weight:600">Default</h3>
        <p style="margin:0;font-size:0.875rem;line-height:1.4">Normal resting state.</p>
      </fluid-card>

      <fluid-card interactive aria-label="Hover / focus example" style="max-width:280px">
        <h3 slot="header" style="margin:0;font-size:0.875rem;font-weight:600">Interactive (hover me)</h3>
        <p style="margin:0;font-size:0.875rem;line-height:1.4">Elevate on hover, depress on press.</p>
      </fluid-card>

      <fluid-card loading style="max-width:280px">
        <h3 slot="header" style="margin:0;font-size:0.875rem;font-weight:600">Loading</h3>
        <p style="margin:0;font-size:0.875rem;line-height:1.4">Skeleton shimmer covers content.</p>
      </fluid-card>

      <fluid-card error error-message="Something went wrong." style="max-width:280px">
        <h3 slot="header" style="margin:0;font-size:0.875rem;font-weight:600">Error</h3>
        <p style="margin:0;font-size:0.875rem;line-height:1.4">Destructive border + error region.</p>
      </fluid-card>
    </div>
  `,
}

// ─── Controls-driven story ──────────────────────────────────────────────────────

export const Playground: Story = {
  render: (args) => html`
    <fluid-card
      ?interactive=${args['interactive']}
      ?layout=${args['layout']}
      ?loading=${args['loading']}
      ?error=${args['error']}
      error-message=${args['error-message'] || ''}
      elevation=${args['elevation']}
      aria-label=${args['interactive'] ? 'Playground card — click to activate' : ''}
      style="max-width:360px"
    >
      <div slot="media" style="height:160px;background:linear-gradient(135deg,hsl(220 70% 55%),hsl(260 60% 45%))"></div>
      <h2 slot="header" style="margin:0;font-size:1rem;font-weight:600">Playground card</h2>
      <p style="margin:0;line-height:1.5">
        Use the controls panel to explore all attribute combinations. Tier switcher and
        dark mode apply globally.
      </p>
      <div slot="actions">
        <fluid-button variant="primary">Primary action</fluid-button>
        <fluid-button variant="ghost">Secondary</fluid-button>
      </div>
    </fluid-card>
  `,
}
