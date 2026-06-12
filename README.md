# fluid

**A physics-grounded glass material system for the web.**

`@neutro/fluid` &nbsp;·&nbsp; Web Components &nbsp;·&nbsp; Spring Physics &nbsp;·&nbsp; Progressive Enhancement

[Documentation](#) &nbsp;·&nbsp; [Storybook](#) &nbsp;·&nbsp; [Roadmap](docs/fluid-roadmap.md) &nbsp;·&nbsp; [Contributing](#contributing)

---

## What

Fluid is a web component library that brings Apple's Liquid Glass design system to the web — but the right way. Not as a visual style. As a **physical material**.

Real glass refracts light, reflects at edges, transmits colour, deforms under pressure, and springs back with surface tension. Fluid simulates all of it — using spring dynamics for motion, `backdrop-filter` for transmission, Houdini worklets for refraction, and a four-tier progressive enhancement system so the experience degrades gracefully across every browser.

Every component in Fluid is made of glass, is behind glass, or is interacting with glass. The physics of that relationship determine every visual and behavioural outcome.

---

## Why

Every major web component library is a **visual style**, not a physics system.

Material Design gives you colours, elevation shadows, and ripple ink. Fluent gives you Acrylic and Reveal. Both are aesthetics — you can implement either purely with CSS. Neither component *feels* like it has weight, resistance, or physical presence.

Fluid is different in three ways.

**Springs, not easing curves.** Every state transition uses spring dynamics — mass, stiffness, damping. When you interrupt an animation mid-flight, the new animation starts with the current velocity, not from rest. This is why Apple's UI feels continuous and alive while most web UIs feel like slideshows. Bezier easing curves describe paths. Springs describe systems with memory.

**The material responds to its environment.** A Fluid glass surface samples the content behind it, adapts its tint to the ambient luminance, intensifies colours through vibrancy, and shows a specular highlight from a simulated light source. It is not a frosted CSS filter. It is a material that knows where it is.

**Progressive enhancement with physical integrity.** Fluid renders across four capability tiers — from a no-backdrop-filter fallback to Houdini-powered true refraction. At every tier, the interface is glass. It does not become a different material on an older browser. A matte window and a clear window are both glass.

---

## Quick Start

```bash
npm install @neutro/fluid
```

```html
<link rel="stylesheet" href="@neutro/fluid/theme/default">

<script type="module">
  import '@neutro/fluid/button'
  import '@neutro/fluid/card'
  import '@neutro/fluid/nav-bar'
</script>

<fluid-theme brand-hue="280" font-family="'Inter', sans-serif">

  <fluid-nav-bar>
    <span slot="title">My App</span>
  </fluid-nav-bar>

  <fluid-card>
    <span slot="header">Welcome</span>
    <p>Your content lives here, behind glass.</p>
    <fluid-button slot="actions" variant="primary">Get started</fluid-button>
  </fluid-card>

</fluid-theme>
```

Framework adapters are available for React, Vue, Svelte, and Angular:

```typescript
import { FluidButton, FluidCard } from '@neutro/fluid/adapters/react'
import { FluidButton, FluidCard } from '@neutro/fluid/adapters/vue'
import { FluidButton, FluidCard } from '@neutro/fluid/adapters/svelte'
```

Or use the functional API directly:

```typescript
import { fluid, motion, spring } from '@neutro/fluid/core'

const card = fluid.card({ layer: 'raised' })
  .children([
    fluid.button({ variant: 'primary' })
      .label('Save')
      .on('fluid:activate', save)
  ])
  .appendTo(document.body)
```

---

## Key Concepts

### The Four Rendering Tiers

Fluid detects browser capabilities at startup and renders accordingly. You write one component. It works across the full spectrum.

| Tier | Target | What you get |
|---|---|---|
| 🪨 Matte | Any browser | Opaque tinted surface, full accessibility |
| 🌫️ Frosted | All modern browsers | `backdrop-filter` blur and vibrancy |
| 💎 Crystalline | Chrome 115+, Safari 17+, Firefox 126+ | True spring physics, environment-aware tinting |
| 🔬 Optical | Chrome 128+ | Houdini refraction, compositor-thread springs |

Chrome enriches the experience. Other modern browsers are not degraded — they receive genuine glass at the Crystalline tier.

### Spring Physics

Every animation in Fluid is a spring. Five named presets, each tuned to a physical scenario:

| Preset | Character | Use case |
|---|---|---|
| `snappy` | Fast, slight bounce | Button presses, toggles |
| `bouncy` | Elastic snap-back | Drag release, floating elements |
| `gentle` | Slow, no overshoot | Panels, drawers, sidebars |
| `smooth` | Modal weight | Dialogs, sheets, overlays |
| `precise` | Tight positioning | Tooltips, anchored popovers |

When an animation is interrupted — a user presses a button while the hover animation is mid-flight — the new spring starts with the current velocity. No jarring cuts. No restart from rest.

### Theming

Fluid is **opinionated on physics, agnostic on aesthetics**. The glass physics — blur radii, spring constants, refraction index — are physical constants you do not override. The look — colours, typography, radius scale — is yours.

Two CSS properties get you 80% of a branded product:

```css
fluid-theme {
  --fluid-hue-brand: 280;
  --fluid-font-family-display: 'Your Font', sans-serif;
}
```

### What Fluid Is Not

- **Not a CSS utility library.** Use Tailwind for that.
- **Not a port of Apple's HIG.** Inspired by Liquid Glass — not a translation of it.
- **Not a re-skin of another component library.** Built from the platform up: Custom Elements, Web Animations API, Houdini, PointerEvents.
- **Not framework-specific.** The adapters are thin translation layers. The components are the library.

---

## Status

Fluid is under active development. The foundational design — physics model, rendering architecture, component taxonomy, testing strategy, and implementation roadmap — is complete. Implementation begins with the core physics engine.

See the [roadmap](docs/fluid-roadmap.md) for the full implementation plan and current status.

---

## Contributing

Fluid is open source under the MIT licence.

Before contributing, read:

- [Foundation Document](docs/fluid-foundation-v5.md) — the physics model, design axioms, and component specifications
- [Testing Strategy](docs/fluid-testing-strategy.md) — how components are tested and what done means
- [Roadmap](docs/fluid-roadmap.md) — current implementation status and open tasks
- [AGENTS.md](AGENTS.md) — critical rules and architecture lookup (useful for human contributors too)

The single most important rule: every state transition uses spring dynamics. If you are adding an animation and reaching for `cubic-bezier`, stop. Bezier easing is only used as a Matte-tier fallback approximation.

---

## Licence

MIT &nbsp;·&nbsp; [`@neutro`](https://github.com/neutro) organisation
