import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import '@neutro/fluid/skeleton'
import '@neutro/fluid/card'

const meta: Meta = {
  title: 'Feedback / Skeleton',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A decorative placeholder that communicates content is loading. Renders a shimmer ' +
          'animation over a muted surface. Fully accessible — marked `aria-hidden` so screen ' +
          'readers skip it while the real content loads. Variant controls shape (rectangular, circular, ' +
          'text). Width and height are set as CSS values via attributes.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

// ─── Default ─────────────────────────────────────────────────────────────────

export const Default: Story = {
  render: () => html`
    <fluid-skeleton width="200px" height="20px"></fluid-skeleton>
  `,
}

// ─── Text Lines ───────────────────────────────────────────────────────────────

export const TextLines: Story = {
  name: 'Text lines — paragraph placeholder',
  render: () => html`
    <div style="display:flex;flex-direction:column;gap:8px;width:320px">
      <fluid-skeleton variant="text" width="85%"></fluid-skeleton>
      <fluid-skeleton variant="text" width="100%"></fluid-skeleton>
      <fluid-skeleton variant="text" width="100%"></fluid-skeleton>
      <fluid-skeleton variant="text" width="72%"></fluid-skeleton>
    </div>
  `,
}

// ─── Circle Avatar ────────────────────────────────────────────────────────────

export const CircleAvatar: Story = {
  name: 'Circular — avatar placeholder',
  render: () => html`
    <div style="display:flex;align-items:center;gap:12px">
      <fluid-skeleton variant="circular" width="48px" height="48px"></fluid-skeleton>
      <div style="display:flex;flex-direction:column;gap:6px">
        <fluid-skeleton variant="text" width="140px"></fluid-skeleton>
        <fluid-skeleton variant="text" width="100px"></fluid-skeleton>
      </div>
    </div>
  `,
}

// ─── Card Skeleton ────────────────────────────────────────────────────────────

export const CardSkeleton: Story = {
  name: 'Card skeleton — realistic loading state',
  render: () => html`
    <fluid-card style="max-width:360px">
      <div style="display:flex;flex-direction:column;gap:16px;padding:4px 0">
        <!-- Avatar row -->
        <div style="display:flex;align-items:center;gap:12px">
          <fluid-skeleton variant="circular" width="44px" height="44px"></fluid-skeleton>
          <div style="display:flex;flex-direction:column;gap:6px;flex:1">
            <fluid-skeleton variant="text" width="60%"></fluid-skeleton>
            <fluid-skeleton variant="text" width="40%"></fluid-skeleton>
          </div>
        </div>
        <!-- Content lines -->
        <div style="display:flex;flex-direction:column;gap:8px">
          <fluid-skeleton variant="text" width="100%"></fluid-skeleton>
          <fluid-skeleton variant="text" width="100%"></fluid-skeleton>
          <fluid-skeleton variant="text" width="80%"></fluid-skeleton>
        </div>
        <!-- Action row -->
        <div style="display:flex;gap:8px">
          <fluid-skeleton variant="rectangular" width="80px" height="32px"></fluid-skeleton>
          <fluid-skeleton variant="rectangular" width="80px" height="32px"></fluid-skeleton>
        </div>
      </div>
    </fluid-card>
  `,
}

// ─── All Variants ─────────────────────────────────────────────────────────────

export const AllVariants: Story = {
  name: 'All variants side by side',
  render: () => html`
    <div style="display:flex;flex-direction:column;gap:20px">
      <div style="display:flex;flex-direction:column;gap:6px">
        <span style="font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:oklch(0.5 0 0)">rectangular (default)</span>
        <fluid-skeleton variant="rectangular" width="240px" height="40px"></fluid-skeleton>
      </div>

      <div style="display:flex;flex-direction:column;gap:6px">
        <span style="font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:oklch(0.5 0 0)">circular</span>
        <fluid-skeleton variant="circular" width="56px" height="56px"></fluid-skeleton>
      </div>

      <div style="display:flex;flex-direction:column;gap:6px">
        <span style="font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:oklch(0.5 0 0)">text</span>
        <div style="display:flex;flex-direction:column;gap:6px;width:240px">
          <fluid-skeleton variant="text" width="100%"></fluid-skeleton>
          <fluid-skeleton variant="text" width="75%"></fluid-skeleton>
        </div>
      </div>
    </div>
  `,
}
