import { DEFAULT_HELPER_MODEL } from './helper'
import type { JournalSettings } from './types'

let settings: JournalSettings = { liveSummaries: true, helperModel: DEFAULT_HELPER_MODEL, helperEffort: 'medium', autoOpen: true }

export function configureJournal(next: JournalSettings): void {
  settings = next
}

export function journalSettings(): JournalSettings {
  return settings
}
