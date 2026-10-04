# Pocket Familiar

A fox spirit lives on a small hill beside your work. Your work is the only thing that feeds it, and while you are quiet it plays.

![Pocket Familiar preview](assets/preview.gif)

```sh
claude plugin marketplace add theonly1me/claude-code-mods
claude plugin install pocket-familiar@claude-code-mods
```

Register the marketplace once. Run `/reload-plugins` in an open session after installing. Requires Claude Code 2.1.289 or later; no build step or runtime dependencies.

## How to use

The familiar is hidden until you ask for it.

- `/pet` shows the familiar. Run it again to hide it.
- `/pet on` and `/pet off` do the same without toggling.
- `/pet stats` prints its mood, stat bars, and the XP it needs for the next stage, and leaves the scene as it is.

When you show it, it comes back in each new session until you hide it again. Only one game shows at a time: showing the familiar hides any other game from this marketplace, and showing another game hides the familiar.

In the fullscreen layout (`CLAUDE_CODE_NO_FLICKER=1 claude`) the familiar docks beside the transcript, with its stats and a short log of what it did under the scene. Otherwise it sits in a pane above the prompt. A pane that opens by itself at session start needs a terminal 144 columns wide; on a narrower one it waits until you run `/pet`. The desktop app shows a one-line summary.

## How it plays

Work feeds it:

- **Fullness** goes up when a test command passes. It drops slowly while you work and about 4 points an hour while you are away.
- **Joy** goes up when a turn finishes and when Claude creates a new file. It fades about 2 points an hour while you are away.
- **Energy** drains during long sessions and comes back while it sleeps or while you are away.
- An error makes it sweat. Three failures in a row and it brings you a rubber duck, which stays until something works.

It mirrors what Claude is doing: a book while Claude reads, a laptop while Claude edits, a magnifier while tests run, and thought dots while it paces during a turn. Any tool call stops its play, and it walks home to help.

While nothing runs, it never stands still. It chases butterflies, pounces on falling leaves, bats a ball of yarn, chases its own tail until it is dizzy, grooms, digs up shiny pebbles, stretches and yawns, watches shooting stars at night and birds by day, and takes short naps. Play is only for show: it never changes fullness, joy, energy, or XP. After five quiet minutes it falls asleep for real, and any prompt or tool call wakes it.

## How it grows

Every successful tool call gives 1 XP, a passing test gives 5, and a finished turn gives 3. The speckled egg hatches at 20 XP into a round fox kit. At 120 XP it becomes a fox spirit, and it grows one more tail at each milestone, up to a nine-tailed kitsune at 5,500 XP. A toast tells you each time it grows. The sky follows your local time of day, with fireflies at night.

See the [marketplace README](../../README.md) for configuration, privacy, updates, and removal.
