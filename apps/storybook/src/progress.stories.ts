import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import '@neutro/fluid/progress'
import '@neutro/fluid/card'

const meta: Meta = {
  title: 'Feedback / Progress',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A progressbar component supporting linear and circular variants. ' +
          'Determinate mode shows a specific value; indeterminate mode animates continuously ' +
          'when the `indeterminate` attribute is present. Fully ARIA-compliant with role="progressbar".',
      },
    },
  },
  argTypes: {
    value: {
      control: 'number',
      description: 'Current value (numeric). Use `indeterminate` attribute for indeterminate mode.',
    },
    min: {
      control: 'number',
      description: 'Minimum value (default: 0)',
    },
    max: {
      control: 'number',
      description: 'Maximum value (default: 100)',
    },
    variant: {
      control: 'select',
      options: ['linear', 'circular'],
      description: 'Visual variant — linear track or circular arc',
    },
  },
  args: {
    value: 50,
    min: 0,
    max: 100,
    variant: 'linear',
  },
}

export default meta
type Story = StoryObj<typeof meta>

// ─── Linear determinate ─────────────────────────────────────────────────────

export const LinearDeterminate: Story = {
  name: 'Linear — Determinate',
  render: () => html`
    <div style="display:flex;flex-direction:column;gap:24px;max-width:400px">
      <div>
        <p style="margin:0 0 8px;font-size:0.875rem;font-weight:600">25%</p>
        <fluid-progress aria-label="Upload progress" value="25"></fluid-progress>
      </div>
      <div>
        <p style="margin:0 0 8px;font-size:0.875rem;font-weight:600">50%</p>
        <fluid-progress aria-label="Upload progress" value="50"></fluid-progress>
      </div>
      <div>
        <p style="margin:0 0 8px;font-size:0.875rem;font-weight:600">75%</p>
        <fluid-progress aria-label="Upload progress" value="75"></fluid-progress>
      </div>
      <div>
        <p style="margin:0 0 8px;font-size:0.875rem;font-weight:600">100%</p>
        <fluid-progress aria-label="Upload progress" value="100"></fluid-progress>
      </div>
    </div>
  `,
}

// ─── Linear indeterminate ───────────────────────────────────────────────────

export const LinearIndeterminate: Story = {
  name: 'Linear — Indeterminate',
  render: () => html`
    <div style="max-width:400px">
      <p style="margin:0 0 8px;font-size:0.875rem;font-weight:600">Loading…</p>
      <fluid-progress aria-label="Loading content" indeterminate></fluid-progress>
    </div>
  `,
}

// ─── Circular determinate ───────────────────────────────────────────────────

export const CircularDeterminate: Story = {
  name: 'Circular — Determinate',
  render: () => html`
    <div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap">
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px">
        <fluid-progress aria-label="Progress 0%" variant="circular" value="0"></fluid-progress>
        <span style="font-size:0.75rem">0%</span>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px">
        <fluid-progress aria-label="Progress 25%" variant="circular" value="25"></fluid-progress>
        <span style="font-size:0.75rem">25%</span>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px">
        <fluid-progress aria-label="Progress 50%" variant="circular" value="50"></fluid-progress>
        <span style="font-size:0.75rem">50%</span>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px">
        <fluid-progress aria-label="Progress 75%" variant="circular" value="75"></fluid-progress>
        <span style="font-size:0.75rem">75%</span>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px">
        <fluid-progress aria-label="Progress 100%" variant="circular" value="100"></fluid-progress>
        <span style="font-size:0.75rem">100%</span>
      </div>
    </div>
  `,
}

// ─── Circular indeterminate ─────────────────────────────────────────────────

export const CircularIndeterminate: Story = {
  name: 'Circular — Indeterminate',
  render: () => html`
    <div style="display:flex;flex-direction:column;align-items:center;gap:8px;width:60px">
      <fluid-progress aria-label="Loading content" variant="circular" indeterminate></fluid-progress>
      <span style="font-size:0.75rem;white-space:nowrap">Loading…</span>
    </div>
  `,
}

// ─── All values ─────────────────────────────────────────────────────────────

export const AllValues: Story = {
  name: 'All values (0, 25, 50, 75, 100)',
  render: () => html`
    <div style="display:flex;flex-direction:column;gap:20px;max-width:480px">
      <h3 style="margin:0;font-size:1rem;font-weight:600">Linear</h3>
      ${[0, 25, 50, 75, 100].map(v => html`
        <div style="display:flex;align-items:center;gap:16px">
          <span style="font-size:0.875rem;font-weight:500;min-width:36px">${v}%</span>
          <fluid-progress
            aria-label="${v}% complete"
            aria-valuetext="${v} of 100 percent"
            value="${v}"
            style="flex:1"
          ></fluid-progress>
        </div>
      `)}

      <h3 style="margin:1rem 0 0;font-size:1rem;font-weight:600">Circular</h3>
      <div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap">
        ${[0, 25, 50, 75, 100].map(v => html`
          <div style="display:flex;flex-direction:column;align-items:center;gap:8px">
            <fluid-progress
              aria-label="${v}% complete"
              variant="circular"
              value="${v}"
            ></fluid-progress>
            <span style="font-size:0.75rem">${v}%</span>
          </div>
        `)}
      </div>

      <h3 style="margin:1rem 0 0;font-size:1rem;font-weight:600">Indeterminate</h3>
      <div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap">
        <div style="flex:1;max-width:300px">
          <p style="margin:0 0 8px;font-size:0.875rem">Linear</p>
          <fluid-progress aria-label="Loading, please wait" indeterminate></fluid-progress>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px">
          <fluid-progress aria-label="Loading, please wait" variant="circular" indeterminate></fluid-progress>
          <span style="font-size:0.75rem">Circular</span>
        </div>
      </div>
    </div>
  `,
}
