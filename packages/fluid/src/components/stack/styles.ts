// packages/fluid/src/components/stack/styles.ts
export const STACK_STYLE_ID = 'fluid-stack-global-styles'

export const stackStyles = /* css */ `
fluid-stack {
  display: flex;
  box-sizing: border-box;
  container-type: inline-size;
  flex-direction: column; /* default: vertical */
}

fluid-stack[direction="horizontal"] {
  flex-direction: row;
}

/* RTL: :dir(rtl) covers attr, ancestor, and inherited computed direction */
fluid-stack[direction="horizontal"]:dir(rtl) {
  flex-direction: row-reverse;
}

/* Explicit fallback for environments without :dir() support */
[dir="rtl"] fluid-stack[direction="horizontal"],
fluid-stack[direction="horizontal"][dir="rtl"] {
  flex-direction: row-reverse;
}
`
