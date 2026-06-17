import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import '@neutro/fluid/fieldset'
import '@neutro/fluid/button'
import '@neutro/fluid/icon-button'

const meta: Meta = {
  title: 'Layout / Fieldset',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Semantic fieldset grouping with a glass header surface. Provides disabled context ' +
          'to nested fluid form inputs via the WCCG context protocol. ' +
          'The <code>legend</code> attribute is required for accessibility — a dev warning fires if absent.',
      },
    },
  },
  argTypes: {
    legend: {
      control: 'text',
      description: 'Label text shown in the glass header',
    },
    disabled: {
      control: 'boolean',
      description: 'Dims the header and propagates disabled context to child inputs',
    },
  },
  args: {
    legend: 'Personal information',
    disabled: false,
  },
}

export default meta
type Story = StoryObj<typeof meta>

const inputStyle = 'padding:8px 12px;border:1px solid rgba(0 0 0/.15);border-radius:6px;font:14px/1 system-ui;width:100%;box-sizing:border-box'
const labelStyle = 'display:flex;flex-direction:column;gap:4px;font:14px/1.4 system-ui'
const fieldsStyle = 'display:flex;flex-direction:column;gap:12px'
const footerStyle = 'display:flex;gap:8px;justify-content:flex-end;margin-top:4px'

// ─── Default ────────────────────────────────────────────────────────────────

export const Default: Story = {
  render: () => html`
    <fluid-fieldset legend="Personal information">
      <div style=${fieldsStyle}>
        <label style=${labelStyle}>
          <span>First name</span>
          <input type="text" placeholder="Jane" style=${inputStyle}/>
        </label>
        <label style=${labelStyle}>
          <span>Last name</span>
          <input type="text" placeholder="Smith" style=${inputStyle}/>
        </label>
        <div style=${footerStyle}>
          <fluid-button variant="ghost">Cancel</fluid-button>
          <fluid-button variant="primary">Save</fluid-button>
        </div>
      </div>
    </fluid-fieldset>
  `,
}

// ─── Disabled ───────────────────────────────────────────────────────────────

export const Disabled: Story = {
  render: () => html`
    <fluid-fieldset legend="Billing address" disabled>
      <div style=${fieldsStyle}>
        <label style=${labelStyle}>
          <span>Street</span>
          <input type="text" value="123 Main St" disabled style=${inputStyle}/>
        </label>
        <label style=${labelStyle}>
          <span>City</span>
          <input type="text" value="San Francisco" disabled style=${inputStyle}/>
        </label>
        <div style=${footerStyle}>
          <fluid-button variant="ghost">Cancel</fluid-button>
          <fluid-button variant="primary">Update address</fluid-button>
        </div>
      </div>
    </fluid-fieldset>
  `,
}

// ─── Header actions slot ────────────────────────────────────────────────────

export const HeaderActions: Story = {
  render: () => html`
    <fluid-fieldset legend="Notification settings">
      <fluid-icon-button
        slot="header-actions"
        variant="ghost"
        size="sm"
        aria-label="Edit notification settings"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M11.5 1.5L14.5 4.5L5 14H2V11L11.5 1.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/>
        </svg>
      </fluid-icon-button>
      <div style=${fieldsStyle}>
        <label style="display:flex;align-items:center;gap:8px;font:14px/1 system-ui">
          <input type="checkbox" checked/> Email notifications
        </label>
        <label style="display:flex;align-items:center;gap:8px;font:14px/1 system-ui">
          <input type="checkbox"/> Push notifications
        </label>
        <div style=${footerStyle}>
          <fluid-button variant="primary">Save preferences</fluid-button>
        </div>
      </div>
    </fluid-fieldset>
  `,
}

// ─── Legend slot ────────────────────────────────────────────────────────────

export const LegendSlot: Story = {
  render: () => html`
    <fluid-fieldset>
      <span slot="legend" style="display:flex;align-items:center;gap:6px">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/>
          <path d="M7 4v3.5L9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        Schedule
      </span>
      <div style=${fieldsStyle}>
        <label style=${labelStyle}>
          <span>Start date</span>
          <input type="date" style=${inputStyle}/>
        </label>
        <label style=${labelStyle}>
          <span>End date</span>
          <input type="date" style=${inputStyle}/>
        </label>
        <div style=${footerStyle}>
          <fluid-button variant="ghost">Clear</fluid-button>
          <fluid-button variant="primary">Apply</fluid-button>
        </div>
      </div>
    </fluid-fieldset>
  `,
}

// ─── Nested fieldsets ───────────────────────────────────────────────────────

export const Nested: Story = {
  render: () => html`
    <fluid-fieldset legend="Account settings">
      <div style=${fieldsStyle}>
        <fluid-fieldset legend="Profile">
          <div style=${fieldsStyle}>
            <label style=${labelStyle}>
              <span>Display name</span>
              <input type="text" placeholder="Jane Smith" style=${inputStyle}/>
            </label>
            <label style=${labelStyle}>
              <span>Bio</span>
              <input type="text" placeholder="Short description" style=${inputStyle}/>
            </label>
            <div style=${footerStyle}>
              <fluid-button variant="primary">Save profile</fluid-button>
            </div>
          </div>
        </fluid-fieldset>
        <fluid-fieldset legend="Security" disabled>
          <div style=${fieldsStyle}>
            <label style=${labelStyle}>
              <span>Current password</span>
              <input type="password" value="••••••••" disabled style=${inputStyle}/>
            </label>
            <label style=${labelStyle}>
              <span>New password</span>
              <input type="password" placeholder="••••••••" disabled style=${inputStyle}/>
            </label>
            <div style=${footerStyle}>
              <fluid-button variant="ghost">Cancel</fluid-button>
              <fluid-button variant="primary">Change password</fluid-button>
            </div>
          </div>
        </fluid-fieldset>
      </div>
    </fluid-fieldset>
  `,
}

// ─── Interactive ─────────────────────────────────────────────────────────────

export const Interactive: Story = {
  render: (args) => html`
    <fluid-fieldset
      legend=${args['legend']}
      ?disabled=${args['disabled']}
    >
      <div style=${fieldsStyle}>
        <label style=${labelStyle}>
          <span>First name</span>
          <input type="text" placeholder="Jane" style=${inputStyle}/>
        </label>
        <label style=${labelStyle}>
          <span>Last name</span>
          <input type="text" placeholder="Smith" style=${inputStyle}/>
        </label>
        <div style=${footerStyle}>
          <fluid-button variant="ghost">Cancel</fluid-button>
          <fluid-button variant="primary">Save</fluid-button>
        </div>
      </div>
    </fluid-fieldset>
  `,
}
