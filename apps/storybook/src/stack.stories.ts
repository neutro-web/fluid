import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import '@neutro/fluid/stack'

const meta: Meta = {
  title: 'Layout / Stack',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A flex-based layout primitive that arranges children vertically or horizontally with configurable gap, alignment, and optional FLIP animation when children are reordered.',
      },
    },
  },
  argTypes: {
    direction: {
      control: 'select',
      options: ['vertical', 'horizontal'],
      description: 'Main axis direction',
    },
    gap: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Space between children — token (xs=4px, sm=8px, md=16px, lg=24px, xl=40px) or any CSS length',
    },
    align: {
      control: 'select',
      options: ['stretch', 'center', 'start', 'end'],
      description: 'CSS align-items applied to the flex container',
    },
    justify: {
      control: 'select',
      options: ['start', 'center', 'end', 'space-between'],
      description: 'CSS justify-content applied to the flex container',
    },
    wrap: {
      control: 'boolean',
      description: 'Boolean attribute — enables flex-wrap on the container',
    },
    layout: {
      control: 'boolean',
      description: 'Boolean attribute — enables tier-aware FLIP animation on child reorder',
    },
  },
  args: {
    direction: 'vertical',
    gap: 'md',
    align: 'stretch',
    justify: 'start',
    wrap: false,
    layout: false,
  },
}

export default meta
type Story = StoryObj<typeof meta>

// ─── Vertical (default) ────────────────────────────────────────────────────────

export const Vertical: Story = {
  render: () => html`
    <fluid-stack>
      <div style="width:60px;height:60px;background:#6366f1;border-radius:6px"></div>
      <div style="width:60px;height:60px;background:#f59e0b;border-radius:6px"></div>
      <div style="width:60px;height:60px;background:#10b981;border-radius:6px"></div>
    </fluid-stack>
  `,
}

// ─── Horizontal ────────────────────────────────────────────────────────────────

export const Horizontal: Story = {
  render: () => html`
    <fluid-stack direction="horizontal">
      <div style="width:60px;height:60px;background:#6366f1;border-radius:6px"></div>
      <div style="width:60px;height:60px;background:#f59e0b;border-radius:6px"></div>
      <div style="width:60px;height:60px;background:#10b981;border-radius:6px"></div>
    </fluid-stack>
  `,
}

// ─── Gap Variants ──────────────────────────────────────────────────────────────

export const GapVariants: Story = {
  render: () => html`
    <div style="display:flex;gap:32px;align-items:flex-start;flex-wrap:wrap">
      ${(['xs', 'sm', 'md', 'lg', 'xl'] as const).map(
        (gap) => html`
          <div>
            <p style="margin:0 0 8px;font-family:system-ui;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">${gap}</p>
            <fluid-stack gap=${gap}>
              <div style="width:40px;height:40px;background:#6366f1;border-radius:6px"></div>
              <div style="width:40px;height:40px;background:#f59e0b;border-radius:6px"></div>
              <div style="width:40px;height:40px;background:#10b981;border-radius:6px"></div>
            </fluid-stack>
          </div>
        `
      )}
    </div>
  `,
}

// ─── Align Center ──────────────────────────────────────────────────────────────

export const AlignCenter: Story = {
  render: () => html`
    <fluid-stack direction="horizontal" align="center" gap="md">
      <div style="width:60px;height:40px;background:#6366f1;border-radius:6px"></div>
      <div style="width:60px;height:80px;background:#f59e0b;border-radius:6px"></div>
      <div style="width:60px;height:60px;background:#10b981;border-radius:6px"></div>
      <div style="width:60px;height:100px;background:#ef4444;border-radius:6px"></div>
    </fluid-stack>
  `,
}

// ─── Justify Space Between ─────────────────────────────────────────────────────

export const JustifySpaceBetween: Story = {
  render: () => html`
    <div style="width:400px;border:1px dashed #d1d5db;border-radius:8px;padding:16px">
      <fluid-stack direction="horizontal" justify="space-between">
        <div style="width:60px;height:60px;background:#6366f1;border-radius:6px"></div>
        <div style="width:60px;height:60px;background:#f59e0b;border-radius:6px"></div>
        <div style="width:60px;height:60px;background:#10b981;border-radius:6px"></div>
      </fluid-stack>
    </div>
  `,
}

// ─── Wrap ──────────────────────────────────────────────────────────────────────

export const Wrap: Story = {
  render: () => html`
    <div style="width:300px;border:1px dashed #d1d5db;border-radius:8px;padding:16px">
      <fluid-stack direction="horizontal" gap="sm" wrap>
        <div style="width:60px;height:60px;background:#6366f1;border-radius:6px"></div>
        <div style="width:60px;height:60px;background:#f59e0b;border-radius:6px"></div>
        <div style="width:60px;height:60px;background:#10b981;border-radius:6px"></div>
        <div style="width:60px;height:60px;background:#ef4444;border-radius:6px"></div>
        <div style="width:60px;height:60px;background:#8b5cf6;border-radius:6px"></div>
        <div style="width:60px;height:60px;background:#ec4899;border-radius:6px"></div>
        <div style="width:60px;height:60px;background:#14b8a6;border-radius:6px"></div>
        <div style="width:60px;height:60px;background:#f97316;border-radius:6px"></div>
      </fluid-stack>
    </div>
  `,
}

// ─── Layout FLIP ───────────────────────────────────────────────────────────────

export const LayoutFlip: Story = {
  render: () => html`
    <div>
      <button
        style="margin-bottom:12px;padding:6px 14px;font-family:system-ui;font-size:14px;border:1px solid #d1d5db;border-radius:6px;cursor:pointer;background:#fff"
        onclick="const s=this.nextElementSibling,ch=[...s.children];for(let i=ch.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[ch[i],ch[j]]=[ch[j],ch[i]]}ch.forEach(c=>s.appendChild(c))"
      >Shuffle</button>
      <fluid-stack layout gap="md">
        <div style="width:60px;height:60px;background:#6366f1;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#fff;font-family:system-ui;font-size:14px;font-weight:600">1</div>
        <div style="width:60px;height:60px;background:#f59e0b;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#fff;font-family:system-ui;font-size:14px;font-weight:600">2</div>
        <div style="width:60px;height:60px;background:#10b981;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#fff;font-family:system-ui;font-size:14px;font-weight:600">3</div>
        <div style="width:60px;height:60px;background:#ef4444;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#fff;font-family:system-ui;font-size:14px;font-weight:600">4</div>
      </fluid-stack>
    </div>
  `,
}

// ─── Interactive (controls-driven) ─────────────────────────────────────────────

export const Interactive: Story = {
  render: (args) => html`
    <fluid-stack
      direction=${args['direction']}
      gap=${args['gap']}
      align=${args['align']}
      justify=${args['justify']}
      ?wrap=${args['wrap']}
      ?layout=${args['layout']}
    >
      <div style="width:60px;height:60px;background:#6366f1;border-radius:6px"></div>
      <div style="width:60px;height:60px;background:#f59e0b;border-radius:6px"></div>
      <div style="width:60px;height:60px;background:#10b981;border-radius:6px"></div>
    </fluid-stack>
  `,
}
