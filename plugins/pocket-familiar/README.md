# Pocket Familiar

A fox spirit lives on a small hill above your prompt. Your work is the only thing that cares for it.

```sh
claude plugin marketplace add theonly1me/claude-code-mods
claude plugin install pocket-familiar@claude-code-mods
```

Register the marketplace once. Run `/reload-plugins` in an open session after installing. Requires Claude Code 2.1.289 or later; no build step or runtime dependencies.

## How it lives

- **Fullness** goes up when a test command passes. It drops slowly while you work and about 4 points an hour while you are away.
- **Joy** goes up when a turn finishes and when Claude creates a new file. It fades about 2 points an hour while you are away.
- **Energy** drains during long sessions and comes back while it naps or while you are away.
- After five quiet minutes it falls asleep. Any prompt or tool call wakes it.
- An error makes it sweat. Three failures in a row and it brings you a rubber duck, which stays until something works.

It also mirrors what Claude is doing: a book while Claude reads, a laptop while Claude edits, a magnifier while tests run, and thought dots while Claude thinks.

## How it grows

Every successful tool call gives 1 XP, a passing test gives 5, and a finished turn gives 3. The speckled egg hatches at 20 XP into a round fox kit. At 120 XP it becomes a fox spirit, and it grows one more tail at each milestone, up to a nine-tailed kitsune at 5,500 XP. A toast tells you each time it grows. The sky follows your local time of day, with fireflies at night.

## Command

`/pet` shows or hides the familiar and prints its stats, its mood, and the XP it needs for the next stage. The scene is 8 rows tall and stacks with other game mods. Question dialogs take priority. The desktop app shows a one-line summary.

![Pocket Familiar preview](assets/preview.png)

See the [marketplace README](../../README.md) for configuration, privacy, updates, and removal.
