import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import '@neutro/fluid/tab-bar'

const meta: Meta = {
  title: 'Navigation / Tab Bar',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A compound tab navigation component with automatic or manual activation, roving tabindex, FLIP-animated selection indicator, and support for vertical orientation.',
      },
    },
  },
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
      description: 'Tab bar orientation — horizontal (default) or vertical',
    },
    activation: {
      control: 'select',
      options: ['automatic', 'manual'],
      description: 'Activation mode — automatic (default, selects on arrow key) or manual (requires Enter/Space)',
    },
  },
  args: {
    orientation: 'horizontal',
    activation: 'automatic',
  },
}

export default meta
type Story = StoryObj<typeof meta>

// ─── Horizontal (default) ──────────────────────────────────────────────────────

export const Horizontal: Story = {
  render: () => html`
    <fluid-tab-bar aria-label="Example tabs">
      <fluid-tab tab-id="tab-1" panel="panel-1">Overview</fluid-tab>
      <fluid-tab tab-id="tab-2" panel="panel-2">Details</fluid-tab>
      <fluid-tab tab-id="tab-3" panel="panel-3">Settings</fluid-tab>

      <fluid-tab-panel panel-id="panel-1" slot="panel">
        <p style="margin:0">Overview content goes here.</p>
      </fluid-tab-panel>
      <fluid-tab-panel panel-id="panel-2" slot="panel">
        <p style="margin:0">Details content goes here.</p>
      </fluid-tab-panel>
      <fluid-tab-panel panel-id="panel-3" slot="panel">
        <p style="margin:0">Settings content goes here.</p>
      </fluid-tab-panel>
    </fluid-tab-bar>
  `,
}

// ─── Vertical ──────────────────────────────────────────────────────────────────

export const Vertical: Story = {
  render: () => html`
    <div style="display:flex;gap:24px;align-items:flex-start">
      <fluid-tab-bar orientation="vertical" aria-label="Vertical tabs">
        <fluid-tab tab-id="tab-1" panel="panel-1">Overview</fluid-tab>
        <fluid-tab tab-id="tab-2" panel="panel-2">Details</fluid-tab>
        <fluid-tab tab-id="tab-3" panel="panel-3">Settings</fluid-tab>

        <fluid-tab-panel panel-id="panel-1" slot="panel">
          <p style="margin:0">Overview content goes here.</p>
        </fluid-tab-panel>
        <fluid-tab-panel panel-id="panel-2" slot="panel">
          <p style="margin:0">Details content goes here.</p>
        </fluid-tab-panel>
        <fluid-tab-panel panel-id="panel-3" slot="panel">
          <p style="margin:0">Settings content goes here.</p>
        </fluid-tab-panel>
      </fluid-tab-bar>
    </div>
  `,
}

// ─── Manual Activation ─────────────────────────────────────────────────────────

export const ManualActivation: Story = {
  render: () => html`
    <fluid-tab-bar activation="manual" aria-label="Manual activation tabs">
      <fluid-tab tab-id="tab-1" panel="panel-1">Overview</fluid-tab>
      <fluid-tab tab-id="tab-2" panel="panel-2">Details</fluid-tab>
      <fluid-tab tab-id="tab-3" panel="panel-3">Settings</fluid-tab>

      <fluid-tab-panel panel-id="panel-1" slot="panel">
        <p style="margin:0;color:#666">Manual activation — press Enter or Space to activate after focusing.</p>
      </fluid-tab-panel>
      <fluid-tab-panel panel-id="panel-2" slot="panel">
        <p style="margin:0;color:#666">Manual activation — press Enter or Space to activate after focusing.</p>
      </fluid-tab-panel>
      <fluid-tab-panel panel-id="panel-3" slot="panel">
        <p style="margin:0;color:#666">Manual activation — press Enter or Space to activate after focusing.</p>
      </fluid-tab-panel>
    </fluid-tab-bar>
  `,
}

// ─── With Disabled Tab ─────────────────────────────────────────────────────────

export const WithDisabledTab: Story = {
  render: () => html`
    <fluid-tab-bar aria-label="Tabs with disabled option">
      <fluid-tab tab-id="tab-1" panel="panel-1">Alpha</fluid-tab>
      <fluid-tab tab-id="tab-2" panel="panel-2">Beta</fluid-tab>
      <fluid-tab tab-id="tab-3" panel="panel-3" disabled>Gamma (disabled)</fluid-tab>
      <fluid-tab tab-id="tab-4" panel="panel-4">Delta</fluid-tab>

      <fluid-tab-panel panel-id="panel-1" slot="panel">
        <p style="margin:0">Alpha content.</p>
      </fluid-tab-panel>
      <fluid-tab-panel panel-id="panel-2" slot="panel">
        <p style="margin:0">Beta content.</p>
      </fluid-tab-panel>
      <fluid-tab-panel panel-id="panel-3" slot="panel">
        <p style="margin:0">Gamma content (unavailable).</p>
      </fluid-tab-panel>
      <fluid-tab-panel panel-id="panel-4" slot="panel">
        <p style="margin:0">Delta content.</p>
      </fluid-tab-panel>
    </fluid-tab-bar>
  `,
}

// ─── Controlled ────────────────────────────────────────────────────────────────

export const Controlled: Story = {
  render: () => {
    const onChange = (e: Event): void => {
      const detail = (e as CustomEvent).detail
      const bar = e.currentTarget as HTMLElement
      bar.setAttribute('active-tab', detail.activeId)
    }
    return html`
      <fluid-tab-bar
        @fluid:change=${onChange}
        aria-label="Controlled tabs"
      >
        <fluid-tab tab-id="tab-1" panel="panel-1">Overview</fluid-tab>
        <fluid-tab tab-id="tab-2" panel="panel-2">Details</fluid-tab>
        <fluid-tab tab-id="tab-3" panel="panel-3">Settings</fluid-tab>

        <fluid-tab-panel panel-id="panel-1" slot="panel">
          <p style="margin:0">Overview content (controlled mode).</p>
        </fluid-tab-panel>
        <fluid-tab-panel panel-id="panel-2" slot="panel">
          <p style="margin:0">Details content (controlled mode).</p>
        </fluid-tab-panel>
        <fluid-tab-panel panel-id="panel-3" slot="panel">
          <p style="margin:0">Settings content (controlled mode).</p>
        </fluid-tab-panel>
      </fluid-tab-bar>
    `
  },
}
