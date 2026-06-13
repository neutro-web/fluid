import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import '@neutro/fluid/portal'

const meta: Meta = {
  title: 'Layout / Portal',
  parameters: {
    docs: {
      description: {
        component:
          'Non-rendering host that teleports children to document.body, forwarding --fluid-* theme tokens and managing z-index allocation.',
      },
    },
  },
}

export default meta

export const Default: StoryObj = {
  name: 'Default (overlay layer)',
  render: () => html`
    <p style="font-family: system-ui; font-size: 0.875rem; color: #666; margin-bottom: 16px;">
      The portal root is rendered at document.body — inspect it in DevTools.
    </p>
    <fluid-portal>
      <div
        style="
          position: fixed;
          bottom: 24px;
          right: 24px;
          padding: 12px 20px;
          background: hsl(220 70% 52%);
          color: #fff;
          border-radius: 8px;
          font-family: system-ui;
          font-size: 0.875rem;
          box-shadow: 0 4px 12px hsl(0 0% 0% / 0.2);
        "
      >
        Rendered via fluid-portal (bottom-right)
      </div>
    </fluid-portal>
  `,
}

export const SheetLayer: StoryObj = {
  name: 'Sheet layer (z-index 500–999)',
  render: () => html`
    <p style="font-family: system-ui; font-size: 0.875rem; color: #666; margin-bottom: 16px;">
      layer="sheet" allocates a z-index in the 500–999 range, above overlays.
    </p>
    <fluid-portal layer="sheet">
      <div
        style="
          position: fixed;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          padding: 12px 20px;
          background: hsl(0 65% 52%);
          color: #fff;
          border-radius: 8px;
          font-family: system-ui;
          font-size: 0.875rem;
          box-shadow: 0 4px 12px hsl(0 0% 0% / 0.25);
        "
      >
        Sheet-layer portal (top-center)
      </div>
    </fluid-portal>
  `,
}

export const SystemLayer: StoryObj = {
  name: 'System layer (z-index 1000+)',
  render: () => html`
    <p style="font-family: system-ui; font-size: 0.875rem; color: #666; margin-bottom: 16px;">
      layer="system" allocates z-index ≥ 1000 — above sheets and overlays.
    </p>
    <fluid-portal layer="system">
      <div
        style="
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          padding: 8px 16px;
          background: hsl(0 0% 10%);
          color: #fff;
          font-family: system-ui;
          font-size: 0.8rem;
          letter-spacing: 0.02em;
        "
      >
        System-layer notification bar
      </div>
    </fluid-portal>
  `,
}

export const ThemeInheritance: StoryObj = {
  name: 'Theme token inheritance',
  render: () => html`
    <style>
      .demo-theme-wrap {
        padding: 24px;
        border: 1px dashed #ccc;
        border-radius: 8px;
        font-family: system-ui;
      }
      .demo-theme-wrap p {
        font-size: 0.875rem;
        color: #666;
        margin: 0 0 12px;
      }
    </style>
    <div class="demo-theme-wrap">
      <p>fluid-theme with brand-hue="40" (orange). The portal root inherits this hue.</p>
      <fluid-theme brand-hue="40" style="--fluid-hue-brand: 40">
        <fluid-portal>
          <div
            style="
              position: fixed;
              bottom: 24px;
              left: 24px;
              padding: 12px 20px;
              background: hsl(var(--fluid-hue-brand, 40) 80% 52%);
              color: #fff;
              border-radius: 8px;
              font-family: system-ui;
              font-size: 0.875rem;
              box-shadow: 0 4px 12px hsl(0 0% 0% / 0.2);
            "
          >
            Brand hue: 40 (orange) — inherited from fluid-theme
          </div>
        </fluid-portal>
      </fluid-theme>
    </div>
  `,
}
