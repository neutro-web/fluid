import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import '@neutro/fluid/empty-state'
import '@neutro/fluid/button'

const meta: Meta = {
  title: 'Surface / Empty State',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'An illustrated empty state with optional CTA. Composes `fluid-card` as the glass ' +
          'surface — Layer 1 (Surface), thin material (8px blur). String attributes for headline ' +
          'and description keep the accessible name predictable. Supports a URL `illustration` ' +
          'attribute or a custom element via the `illustration` slot.',
      },
    },
  },
  argTypes: {
    headline: {
      control: 'text',
      description: 'Required. Primary empty state message.',
    },
    description: {
      control: 'text',
      description: 'Supporting text below the headline. Hidden when empty.',
    },
    illustration: {
      control: 'text',
      description: 'URL for an SVG or image. Ignored when the illustration slot has content.',
    },
  },
  args: {
    headline: 'Nothing here yet',
    description: '',
    illustration: '',
  },
}

export default meta
type Story = StoryObj<typeof meta>

// ─── Variants ──────────────────────────────────────────────────────────────────

export const Default: Story = {
  render: () => html`
    <fluid-empty-state
      headline="No results found"
      description="Try adjusting your search filters or start over."
      style="max-width:400px"
    >
      <fluid-button slot="actions" variant="primary">Clear filters</fluid-button>
    </fluid-empty-state>
  `,
}

export const HeadlineOnly: Story = {
  render: () => html`
    <fluid-empty-state
      headline="Your cart is empty"
      style="max-width:360px"
    ></fluid-empty-state>
  `,
}

export const WithDescription: Story = {
  render: () => html`
    <fluid-empty-state
      headline="No messages"
      description="When someone sends you a message, it will appear here."
      style="max-width:400px"
    ></fluid-empty-state>
  `,
}

export const WithActions: Story = {
  render: () => html`
    <fluid-empty-state
      headline="No projects yet"
      description="Create your first project to start collaborating with your team."
      style="max-width:420px"
    >
      <fluid-button slot="actions" variant="primary">Create project</fluid-button>
      <fluid-button slot="actions" variant="ghost">Learn more</fluid-button>
    </fluid-empty-state>
  `,
}

export const WithIllustrationUrl: Story = {
  name: 'Illustration — URL attribute',
  render: () => html`
    <fluid-empty-state
      headline="All caught up"
      description="No notifications to review. Check back later."
      illustration="https://api.iconify.design/solar:bell-off-linear.svg"
      style="max-width:400px"
    >
      <fluid-button slot="actions" variant="ghost">View archive</fluid-button>
    </fluid-empty-state>
  `,
}

export const WithIllustrationSlot: Story = {
  name: 'Illustration — custom slot element',
  render: () => html`
    <fluid-empty-state
      headline="No files uploaded"
      description="Drag and drop files here, or use the button below to browse."
      style="max-width:420px"
    >
      <span slot="illustration" aria-hidden="true" style="font-size:3.5rem;display:block;text-align:center">📂</span>
      <fluid-button slot="actions" variant="primary">Browse files</fluid-button>
    </fluid-empty-state>
  `,
}

// ─── States ────────────────────────────────────────────────────────────────────

export const AllVariantsSideBySide: Story = {
  name: 'All variants',
  render: () => html`
    <div style="display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start">
      <fluid-empty-state
        headline="Headline only"
        style="max-width:280px"
      ></fluid-empty-state>

      <fluid-empty-state
        headline="With description"
        description="Supporting text that provides more context about the empty state."
        style="max-width:280px"
      ></fluid-empty-state>

      <fluid-empty-state
        headline="With action"
        description="Something to do when there's nothing to show."
        style="max-width:280px"
      >
        <fluid-button slot="actions" variant="primary">Get started</fluid-button>
      </fluid-empty-state>

      <fluid-empty-state
        headline="With illustration"
        description="A visual cue reinforces the empty state."
        illustration="https://api.iconify.design/solar:inbox-linear.svg"
        style="max-width:280px"
      >
        <fluid-button slot="actions" variant="primary">Compose</fluid-button>
      </fluid-empty-state>
    </div>
  `,
}

// ─── Controls-driven story ──────────────────────────────────────────────────────

export const Playground: Story = {
  render: (args) => html`
    <fluid-empty-state
      headline=${args['headline'] || 'Nothing here yet'}
      description=${args['description'] || ''}
      illustration=${args['illustration'] || ''}
      style="max-width:420px"
    >
      <fluid-button slot="actions" variant="primary">Primary action</fluid-button>
      <fluid-button slot="actions" variant="ghost">Secondary</fluid-button>
    </fluid-empty-state>
  `,
}
