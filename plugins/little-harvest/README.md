# Little Harvest

Your files are the field. Every file that changes in a session becomes a plot on a small pixel farm, the seasons turn every five minutes, and the farmer never stands still.

![Little Harvest preview](assets/preview.gif)

```sh
claude plugin marketplace add theonly1me/claude-code-mods
claude plugin install little-harvest@claude-code-mods
```

Register the marketplace once. Run `/reload-plugins` in an open session after installing. Requires Claude Code 2.1.289 or later; no build step or runtime dependencies.

## How to use

The farm is hidden until you ask for it.

- `/farm` shows the farm. Run it again to hide it.
- `/farm on` and `/farm off` set it directly.
- `/farm stats` lists every plot with its crop, stage, and lines changed, and leaves the farm as it is.

When you turn the farm on, it comes back in every new session until you turn it off. One game shows at a time: turning on another game from this marketplace (for example `/dojo`) hides the farm, and the farm stays off until you run `/farm` again. Closing the pane with its close mark also turns it off.

In the fullscreen layout (`CLAUDE_CODE_NO_FLICKER=1`) the farm docks in a side column beside the transcript, with a log of what the farmer is doing under the scene. On the main screen it sits above the prompt. A pane that opens by itself at the start of a session needs a wide terminal (144 columns); if yours is narrower, run `/farm` to show it. The desktop app shows a one-line summary.

The farm is for watching. Nothing in it needs a key.

## How it plays

| File | Crop |
| --- | --- |
| Tests | Pumpkins |
| Source code | Corn |
| Docs | Sunflowers |
| Styles | Tulips |
| Config | Wheat |
| Anything else | Carrots |

Real work moves the farm:

- Each file Claude edits, and each file you change yourself (the farm reads `git diff` every 20 seconds), becomes a plot. Crops grow with the lines changed: seed, sprout, growing, then ripe. The farmer drops what they are doing and hoes that plot.
- A failing test brings a storm, and test plots wilt until the next passing run. A passing test brings sun.
- When a turn with a passing test ends, the ripe crops fly into the barn and the bushel count goes up. The count stays across sessions.

Between work, the farm keeps busy on its own. The farmer waters plots, hoes new rows, pulls weeds, carries hay from the barn, feeds the chickens, shoos crows off the field, fixes the scarecrow, and rests under the cherry tree. Chickens peck and wander, a crow lands now and then, and a cat naps on the fence. This is only for show: chores never grow crops or add bushels.

The seasons turn every five minutes, in step with the Samurai Dojo: winter (snow on the fence, the barn, and the crops), cherry blossom (falling petals), summer (fireflies), and autumn (falling leaves). The sky also follows your local time of day.

See the [marketplace README](../../README.md) for configuration, privacy, updates, and removal.
