export const VH_STYLE_ID = 'fluid-visually-hidden-global-styles'

export const visuallyHiddenStyles = /* css */ `
fluid-visually-hidden {
  display: block;
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}
`
