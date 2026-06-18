import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import '@neutro/fluid/nav-bar'

const meta: Meta = {
  title: 'Navigation / Nav Bar',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A sticky glass navigation bar with scroll-linked shrink. Uses a CSS `animation-timeline: scroll()` at Crystalline+ and a JS scroll-listener fallback at Frosted/Matte. Shrink is structural (all tiers, including reduced-motion); depth cue (`elevate`/`flatten`) is suppressed under reduced motion.',
      },
    },
  },
  argTypes: {
    shrinkStart: {
      control: { type: 'range', min: 0, max: 300, step: 8 },
      description: 'Scroll distance (px) before shrink begins.',
    },
    shrinkAmount: {
      control: { type: 'range', min: 0.1, max: 1.0, step: 0.05 },
      description: 'Fraction of full height the bar shrinks TO. 0.6 = 60% of full height.',
    },
    shrinkMode: {
      control: 'select',
      options: ['continuous', 'stepped'],
      description: '`continuous` = scroll-linked interpolation. `stepped` = snap at threshold.',
    },
    expandOnScrollUp: {
      control: 'boolean',
      description: 'When true, any upward scroll re-expands the bar (instead of waiting for scroll-to-top).',
    },
  },
  args: {
    shrinkStart: 48,
    shrinkAmount: 0.6,
    shrinkMode: 'continuous',
    expandOnScrollUp: false,
  },
}

export default meta
type Story = StoryObj<typeof meta>

const scrollWrapper = (content: unknown) => html`
  <div style="height:200vh; padding-top:0;">
    ${content}
    <div style="padding: 80px 24px; max-width: 640px; margin: 0 auto;">
      <h2 style="margin-top:0">Scroll down to see the nav-bar shrink</h2>
      <p>The nav bar at the top shrinks as you scroll past the threshold. Scroll back up (or scroll all the way to the top) to see it expand.</p>
      ${Array.from({ length: 20 }, (_, i) => html`<p>Content paragraph ${i + 1} — just filler to create scroll room.</p>`)}
      <div id="fluid-main-content" tabindex="-1" style="padding:8px; border:1px dashed currentColor; border-radius:4px;">
        ← Skip link target: <code>#fluid-main-content</code>
      </div>
    </div>
  </div>
`

// ─── Default ───────────────────────────────────────────────────────────────────

export const Default: Story = {
  render: (args) => scrollWrapper(html`
    <fluid-nav-bar
      aria-label="Primary navigation"
      shrink-start=${args.shrinkStart}
      shrink-amount=${args.shrinkAmount}
      shrink-mode=${args.shrinkMode}
      ?expand-on-scroll-up=${args.expandOnScrollUp}
      style="--fluid-nav-full-height: 64px"
    >
      <span slot="leading" style="font-weight:600;font-size:18px">Fluid</span>
      <a href="#" style="text-decoration:none;color:inherit">Home</a>
      <a href="#" style="text-decoration:none;color:inherit">About</a>
      <a href="#" style="text-decoration:none;color:inherit">Docs</a>
      <span slot="trailing">
        <button style="border:none;background:none;cursor:pointer">⚙</button>
      </span>
    </fluid-nav-bar>
  `),
}

// ─── Continuous mode ───────────────────────────────────────────────────────────

export const ContinuousMode: Story = {
  name: 'Shrink mode: continuous',
  render: () => scrollWrapper(html`
    <fluid-nav-bar
      aria-label="Primary navigation"
      shrink-mode="continuous"
      shrink-start="48"
      shrink-amount="0.6"
      style="--fluid-nav-full-height: 64px"
    >
      <span slot="leading" style="font-weight:600">Fluid</span>
      <a href="#" style="text-decoration:none;color:inherit">Home</a>
    </fluid-nav-bar>
  `),
  parameters: {
    docs: {
      description: { story: 'Height interpolates linearly with scroll — no snapping.' },
    },
  },
}

// ─── Stepped mode ─────────────────────────────────────────────────────────────

export const SteppedMode: Story = {
  name: 'Shrink mode: stepped',
  render: () => scrollWrapper(html`
    <fluid-nav-bar
      aria-label="Primary navigation"
      shrink-mode="stepped"
      shrink-start="48"
      shrink-amount="0.6"
      style="--fluid-nav-full-height: 64px"
    >
      <span slot="leading" style="font-weight:600">Fluid</span>
      <a href="#" style="text-decoration:none;color:inherit">Home</a>
    </fluid-nav-bar>
  `),
  parameters: {
    docs: {
      description: { story: 'Height snaps between full and shrunk at the `shrink-start` threshold.' },
    },
  },
}

// ─── Expand on scroll up ──────────────────────────────────────────────────────

export const ExpandOnScrollUp: Story = {
  name: 'expand-on-scroll-up',
  render: () => scrollWrapper(html`
    <fluid-nav-bar
      aria-label="Primary navigation"
      shrink-start="48"
      expand-on-scroll-up
      style="--fluid-nav-full-height: 64px"
    >
      <span slot="leading" style="font-weight:600">Fluid</span>
      <a href="#" style="text-decoration:none;color:inherit">Home</a>
    </fluid-nav-bar>
  `),
  parameters: {
    docs: {
      description: { story: 'Bar re-expands on any upward scroll, even when mid-page.' },
    },
  },
}

// ─── Expanded state ────────────────────────────────────────────────────────────

export const ExpandedState: Story = {
  name: 'State: expanded',
  render: () => html`
    <div style="padding:0;background:var(--fluid-surface-bg,#f5f5f5)">
      <fluid-nav-bar aria-label="Primary navigation" style="--fluid-nav-full-height:64px;--fluid-nav-shrink-progress:0">
        <span slot="leading" style="font-weight:600">Fluid</span>
        <a href="#" style="text-decoration:none;color:inherit">Home</a>
        <a href="#" style="text-decoration:none;color:inherit">About</a>
        <span slot="trailing"><button style="border:none;background:none;cursor:pointer">⚙</button></span>
      </fluid-nav-bar>
    </div>
  `,
}

// ─── Shrunk state ──────────────────────────────────────────────────────────────

export const ShrunkState: Story = {
  name: 'State: shrunk',
  render: () => html`
    <div style="padding:0;background:var(--fluid-surface-bg,#f5f5f5)">
      <fluid-nav-bar aria-label="Primary navigation" style="--fluid-nav-full-height:64px;--fluid-nav-shrink-progress:1;--fluid-nav-shrink-amount:0.6">
        <span slot="leading" style="font-weight:600">Fluid</span>
        <a href="#" style="text-decoration:none;color:inherit">Home</a>
        <a href="#" style="text-decoration:none;color:inherit">About</a>
        <span slot="trailing"><button style="border:none;background:none;cursor:pointer">⚙</button></span>
      </fluid-nav-bar>
    </div>
  `,
  parameters: {
    docs: {
      description: { story: 'Progress forced to 1 via inline CSS var for static preview.' },
    },
  },
}
