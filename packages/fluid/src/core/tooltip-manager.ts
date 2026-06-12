export interface TooltipLike {
  show(): void
  hide(): void
}

export interface TooltipManagerOptions {
  maxVisible?: number
  hoverDelay?: number
}

export class TooltipManager {
  readonly maxVisible: number
  readonly hoverDelay: number
  private visible: TooltipLike[] = []
  private pendingTimer: ReturnType<typeof setTimeout> | null = null
  private pendingTooltip: TooltipLike | null = null

  constructor(options: TooltipManagerOptions = {}) {
    this.maxVisible = options.maxVisible ?? 1
    this.hoverDelay = options.hoverDelay ?? 300
  }

  show(tooltip: TooltipLike): void {
    if (this.pendingTimer !== null) {
      clearTimeout(this.pendingTimer)
      this.pendingTimer = null
    }
    this.pendingTooltip = tooltip
    this.pendingTimer = setTimeout(() => {
      this.pendingTimer = null
      const t = this.pendingTooltip!
      this.pendingTooltip = null
      this._doShow(t)
    }, this.hoverDelay)
  }

  hide(tooltip: TooltipLike): void {
    if (this.pendingTooltip === tooltip) {
      if (this.pendingTimer !== null) {
        clearTimeout(this.pendingTimer)
        this.pendingTimer = null
      }
      this.pendingTooltip = null
      return
    }
    const idx = this.visible.indexOf(tooltip)
    if (idx !== -1) {
      tooltip.hide()
      this.visible.splice(idx, 1)
    }
  }

  private _doShow(tooltip: TooltipLike): void {
    while (this.visible.length >= this.maxVisible) {
      this.visible.shift()!.hide()
    }
    tooltip.show()
    this.visible.push(tooltip)
  }
}

const TOOLTIP_KEY = Symbol.for('neutro.fluid.tooltipmanager')
if (!(globalThis as any)[TOOLTIP_KEY]) {
  (globalThis as any)[TOOLTIP_KEY] = new TooltipManager({ maxVisible: 1, hoverDelay: 300 })
}
export const tooltipManager: TooltipManager = (globalThis as any)[TOOLTIP_KEY]
