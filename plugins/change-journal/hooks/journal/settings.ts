import type { JournalSettings } from './types'

let settings: JournalSettings = { liveSummaries: true, helperModel: 'haiku', autoOpen: true }

export function configureJournal(next: JournalSettings): void {
  settings = next
}

export function journalSettings(): JournalSettings {
  return settings
}
