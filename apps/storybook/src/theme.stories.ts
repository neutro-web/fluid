import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import '@neutro/fluid/theme'

const meta: Meta = {
  title: 'Theming / Theme',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Token provider element. Sets --fluid-* custom properties on itself and dispatches fluidtheme:change.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

// ─── Brand hue ────────────────────────────────────────────────────────────────

export const DefaultHue: Story = {
  render: () => html`
    <fluid-theme>
      <div style="padding:16px;border-radius:8px;background:hsl(220 60% 50%);color:#fff;font-family:system-ui">
        Default hue (220)
      </div>
    </fluid-theme>
  `,
}

export const VioletBrand: Story = {
  render: () => html`
    <fluid-theme brand-hue="280">
      <div style="padding:16px;border-radius:8px;background:hsl(var(--fluid-hue-brand,280) 60% 50%);color:#fff;font-family:system-ui">
        Violet brand (hue 280)
      </div>
    </fluid-theme>
  `,
}

export const GreenBrand: Story = {
  render: () => html`
    <fluid-theme brand-hue="140">
      <div style="padding:16px;border-radius:8px;background:hsl(var(--fluid-hue-brand,140) 60% 40%);color:#fff;font-family:system-ui">
        Green brand (hue 140)
      </div>
    </fluid-theme>
  `,
}

// ─── Font family ──────────────────────────────────────────────────────────────

export const CustomFont: Story = {
  render: () => html`
    <fluid-theme font-family="'Georgia', serif">
      <p style="font-family:var(--fluid-font-family,system-ui);margin:0">
        Custom serif font via font-family attribute.
      </p>
    </fluid-theme>
  `,
}

// ─── Dark mode ────────────────────────────────────────────────────────────────

export const DarkThemeAttribute: Story = {
  render: () => html`
    <fluid-theme data-theme="dark">
      <div style="padding:16px;border-radius:8px;background:#1a1a2e;color:#eee;font-family:system-ui">
        data-theme="dark"
      </div>
    </fluid-theme>
  `,
}

// ─── Sampling ────────────────────────────────────────────────────────────────

export const MountOnlySampling: Story = {
  render: () => html`
    <fluid-theme sampling="mount-only">
      <div style="padding:16px;border-radius:8px;background:#f5f0e8;font-family:system-ui;color:#333">
        sampling="mount-only" — samples background once on mount
      </div>
    </fluid-theme>
  `,
}
