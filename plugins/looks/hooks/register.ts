import type { Register } from 'claude-code'

import { installBanner } from './banner'
import { installChrome } from './chrome'
import { configureLooks, settingsFrom } from './looks/state'
import { installReply } from './reply'
import { installRows } from './rows'
import { installSwitcher } from './switcher'
import { installWatchers } from './watchers'

export const register: Register = (on, options) => {
  configureLooks(settingsFrom(options))
  installSwitcher(on)
  installWatchers(on)
  installRows(on)
  installReply(on)
  installChrome(on)
  installBanner(on)
}
