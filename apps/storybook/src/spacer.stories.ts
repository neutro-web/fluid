import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import '@neutro/fluid/stack'
import '@neutro/fluid/spacer'

const meta: Meta = {
  title: 'Layout / Spacer',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A flexible whitespace primitive for use inside `fluid-stack`. ' +
          'Transparent to assistive technology (`aria-hidden="true"`). ' +
          'Use `grow` to fill remaining space, or `size` (xs/sm/md/lg/xl or arbitrary CSS) ' +
          'with optional `axis` (horizontal/vertical) to insert a fixed gap.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

// ─── Helpers ───────────────────────────────────────────────────────────────────

const box = (label = '', color = '#6366f1') =>
  html`<div
    style="
      width:60px;height:60px;
      background:${color};
      border-radius:6px;
      display:flex;align-items:center;justify-content:center;
      color:#fff;font:bold 11px/1 system-ui;
      flex-shrink:0;
    "
  >${label}</div>`

// ─── Grow ──────────────────────────────────────────────────────────────────────

export const GrowBetween: Story = {
  render: () => html`
    <fluid-stack direction="horizontal" style="width:100%;padding:16px;box-sizing:border-box">
      ${box('A')}
      <fluid-spacer grow></fluid-spacer>
      ${box('B')}
    </fluid-stack>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'A single `<fluid-spacer grow>` between two boxes pushes them to opposite ends of the stack.',
      },
    },
  },
}

export const GrowMultiple: Story = {
  render: () => html`
    <fluid-stack direction="horizontal" style="width:100%;padding:16px;box-sizing:border-box">
      ${box('A')}
      <fluid-spacer grow></fluid-spacer>
      ${box('B')}
      <fluid-spacer grow></fluid-spacer>
      ${box('C')}
    </fluid-stack>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'Multiple `<fluid-spacer grow>` elements between boxes distribute the remaining space evenly.',
      },
    },
  },
}

// ─── Fixed Size ────────────────────────────────────────────────────────────────

export const FixedSize: Story = {
  render: () => html`
    <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start;padding:16px">
      ${(['xs', 'sm', 'md', 'lg', 'xl'] as const).map(
        (token) => html`
          <fluid-stack direction="vertical" style="align-items:center">
            <div style="font:600 11px/1 system-ui;color:#6b7280;margin-bottom:4px">${token}</div>
            ${box()}
            <fluid-spacer
              size=${token}
              style="background:#e0e7ff;display:block"
            ></fluid-spacer>
            ${box()}
          </fluid-stack>
        `,
      )}
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'All five size tokens — xs (4 px), sm (8 px), md (16 px), lg (24 px), xl (40 px). ' +
          'The indigo tint shows the spacer dimensions.',
      },
    },
  },
}

// ─── Axis ──────────────────────────────────────────────────────────────────────

export const AxisHorizontal: Story = {
  render: () => html`
    <fluid-stack direction="vertical" style="align-items:flex-start;padding:16px">
      ${box('Top')}
      <fluid-spacer
        size="xl"
        axis="horizontal"
        style="background:#e0e7ff;display:block"
      ></fluid-spacer>
      ${box('Bot')}
    </fluid-stack>
  `,
  parameters: {
    docs: {
      description: {
        story:
          '`axis="horizontal"` sets only `width`; `height` is cleared. ' +
          'Inside a vertical stack the spacer occupies no vertical space — only horizontal extent is applied.',
      },
    },
  },
}

export const AxisVertical: Story = {
  render: () => html`
    <fluid-stack direction="vertical" style="align-items:flex-start;padding:16px">
      ${box('Top')}
      <fluid-spacer
        size="xl"
        axis="vertical"
        style="background:#e0e7ff;display:block"
      ></fluid-spacer>
      ${box('Bot')}
    </fluid-stack>
  `,
  parameters: {
    docs: {
      description: {
        story:
          '`axis="vertical"` sets only `height`; `width` is cleared. ' +
          'The spacer creates vertical breathing room without any horizontal footprint.',
      },
    },
  },
}
