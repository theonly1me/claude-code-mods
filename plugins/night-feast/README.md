# Night Feast

A vampire hunts a small village beside your transcript, and the night sky is your context window.

![Night Feast preview](assets/preview.gif)

```sh
claude plugin marketplace add theonly1me/claude-code-mods
claude plugin install night-feast@claude-code-mods
```

Register the marketplace once. Run `/reload-plugins` in an open session after installing. Requires Claude Code 2.1.289 or later; no build step or runtime dependencies.

## How to use

The game is hidden until you turn it on.

- `/feast` shows the night. Run it again to hide it.
- `/feast on` and `/feast off` set it directly.
- `/feast stats` prints the night, the context fill, the blood level, your feeds, and garlic hits, and leaves the pane as it is.

When you turn the night on, it comes back in each new session until you turn it off. Only one game mod shows at a time: if you turn on another game (for example `/dojo` or `/farm`), the night closes, and the other game is the one that comes back next session.

In fullscreen mode (`CLAUDE_CODE_NO_FLICKER=1`) on a terminal 110 columns or wider, the night docks in a column beside the transcript, with a log of what the vampire did under the scene. Otherwise it sits in a pane above the prompt. A pane that opens by itself at session start needs a wide terminal (144 columns); `/feast` shows it at any width. Closing the pane with its close mark also turns the night off. The desktop app shows a one-line summary.

There is nothing to control. The game plays by itself.

## How it plays

Your work drives the score:

- The moon moves across the sky as the context fills. At 80% the horizon starts to warm, and at 90% dawn is near. A toast tells you to run `/compact` before the sun comes up.
- Each tool call Claude finishes is a meal: the vampire turns into a bat, swoops down on a villager, and fills its blood vial. The villager wanders off dizzy.
- A failed or denied tool call is garlic. The vampire recoils and loses blood.
- Each prompt you send brings a new villager into the street.
- When Claude finishes a turn, the vampire spreads its cape in front of the castle while bats circle.
- A compaction ends the night. The sky resets to dusk and a new night begins.

Between meals the village never stands still. The vampire stalks down the lane, roosts on the castle tower to watch the street, swoops low over the rooftops, hides in the shadows with only its eyes showing, and lies in wait for a lantern bearer who runs for the nearest door. Clouds drift across the moon, an owl on a dead tree turns its head, bats circle the moon, and a black cat prowls the rooftops. This ambient action is only for show: blood, feeds, garlic, and nights change only from real work and the context window.

See the [marketplace README](../../README.md) for configuration, privacy, updates, and removal.
