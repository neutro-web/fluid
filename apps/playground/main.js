import '@neutro/fluid/theme/default'
import '@neutro/fluid/theme/dark'
import { initToolbar } from './toolbar.js'
import { navigateCurrent } from './router.js'

initToolbar(navigateCurrent)
