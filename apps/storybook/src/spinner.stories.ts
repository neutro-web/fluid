import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import '@neutro/fluid/spinner'
import '@neutro/fluid/card'
import '@neutro/fluid/button'

const meta: Meta = {
  title: 'Feedback / Spinner',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A CSS-animated loading indicator with a rotating arc. Uses ' +
          '`role="status"` and `aria-label` for screen reader support. ' +
          'Three sizes (sm/md/lg) cover inline, button, and full-page loading contexts. ' +
          'Respects `prefers-reduced-motion` by switching from rotation to a pulsing opacity.',
      },
    },
  },
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Spinner diameter: sm=16px, md=24px, lg=36px',
    },
    'aria-label': {
      control: 'text',
      description: 'Accessible label announced by screen readers (default: "Loading")',
    },
  },
  args: {
    size: 'md',
    'aria-label': 'Loading',
  },
}

export default meta
type Story = StoryObj<typeof meta>

// ─── Default ─────────────────────────────────────────────────────────────────

export const Default: Story = {
  render: (args) => html`
    <fluid-spinner
      size=${args['size']}
      aria-label=${args['aria-label']}
    ></fluid-spinner>
  `,
}

// ─── All Sizes ───────────────────────────────────────────────────────────────

export const AllSizes: Story = {
  name: 'All sizes',
  render: () => html`
    <div style="display:flex;align-items:center;gap:24px;padding:16px">
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px">
        <fluid-spinner size="sm" aria-label="Loading"></fluid-spinner>
        <span style="font-size:0.75rem;color:oklch(0.5 0 0)">sm — 16px</span>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px">
        <fluid-spinner size="md" aria-label="Loading"></fluid-spinner>
        <span style="font-size:0.75rem;color:oklch(0.5 0 0)">md — 24px</span>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px">
        <fluid-spinner size="lg" aria-label="Loading"></fluid-spinner>
        <span style="font-size:0.75rem;color:oklch(0.5 0 0)">lg — 36px</span>
      </div>
    </div>
  `,
}

// ─── In Button ───────────────────────────────────────────────────────────────

export const InButton: Story = {
  name: 'Inside a button (loading state)',
  render: () => html`
    <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      <fluid-button loading variant="primary">Save changes</fluid-button>
      <fluid-button loading variant="secondary">Processing</fluid-button>

      <!-- Manual composition: button with a spinner instead of using fluid-button[loading] -->
      <button
        type="button"
        aria-busy="true"
        aria-label="Uploading file"
        style="
          display:inline-flex;align-items:center;gap:8px;
          padding:10px 20px;border-radius:8px;border:none;
          background:oklch(0.55 0.18 265);color:white;
          font-size:0.9375rem;font-weight:500;cursor:default
        "
      >
        <fluid-spinner size="sm" aria-label="Uploading"></fluid-spinner>
        Uploading…
      </button>
    </div>
  `,
}

// ─── In Card ─────────────────────────────────────────────────────────────────

export const InCard: Story = {
  name: 'Inside a card',
  render: () => html`
    <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start">
      <!-- Card with loading overlay centered -->
      <fluid-card style="max-width:280px;min-height:140px">
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:16px 0">
          <fluid-spinner size="lg" aria-label="Loading dashboard data"></fluid-spinner>
          <p style="margin:0;font-size:0.875rem;color:oklch(0.5 0 0)">Loading dashboard…</p>
        </div>
      </fluid-card>

      <!-- Card with inline header loading indicator -->
      <fluid-card style="max-width:280px">
        <div slot="header" style="display:flex;align-items:center;gap:8px">
          <h2 style="margin:0;font-size:1rem;font-weight:600;flex:1">Analytics</h2>
          <fluid-spinner size="sm" aria-label="Refreshing analytics"></fluid-spinner>
        </div>
        <p style="margin:0;line-height:1.5;color:oklch(0.5 0 0)">
          Fetching latest data from server…
        </p>
      </fluid-card>
    </div>
  `,
}

// ─── Custom Label ─────────────────────────────────────────────────────────────

export const CustomLabel: Story = {
  name: 'Custom aria-label',
  render: () => html`
    <div style="display:flex;flex-direction:column;gap:20px;max-width:400px">
      <div style="display:flex;align-items:center;gap:12px">
        <fluid-spinner size="sm" aria-label="Uploading file"></fluid-spinner>
        <span style="font-size:0.875rem">Uploading profile photo…</span>
      </div>

      <div style="display:flex;align-items:center;gap:12px">
        <fluid-spinner size="md" aria-label="Processing payment"></fluid-spinner>
        <span style="font-size:0.875rem">Processing payment — do not close this page</span>
      </div>

      <div style="display:flex;align-items:center;gap:12px">
        <fluid-spinner size="lg" aria-label="Generating report"></fluid-spinner>
        <span style="font-size:0.875rem">Generating report, this may take a moment</span>
      </div>
    </div>
  `,
}
