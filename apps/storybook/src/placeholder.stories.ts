import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'

const meta: Meta = {
  title: 'Getting Started / Welcome',
}

export default meta

export const Welcome: StoryObj = {
  render: () => html`
    <div style="font-family: system-ui, sans-serif; padding: 40px; max-width: 600px;">
      <h1 style="font-size: 2rem; margin-bottom: 8px;">@neutro/fluid</h1>
      <p style="color: #666; font-size: 1.1rem; margin-bottom: 24px;">
        Physics-grounded glass material system for the web.
      </p>
      <p style="color: #999;">
        Components are coming soon. Check back after Phase 2 is complete.
      </p>
    </div>
  `,
}
