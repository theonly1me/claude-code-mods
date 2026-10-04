# Little Harvest

Your files are the field. Every file that changes in a session becomes a plot above the prompt, and the crop shows what kind of file it is:

| File | Crop |
| --- | --- |
| Tests | Pumpkins |
| Source code | Corn |
| Docs | Sunflowers |
| Styles | Tulips |
| Config | Wheat |
| Anything else | Carrots |

Crops grow with the lines changed in their file: seed, sprout, growing, then ripe. Claude's edits count, and so do yours (the farm reads `git diff` every 20 seconds). The farmer walks to the plot that just changed and hoes it.

A failing test brings a storm, and test plots wilt until the next passing run. A passing test brings sun. When a turn with a passing test ends, the ripe crops fly into the barn and the bushel count goes up. The count stays across sessions. The sky follows your local time of day.

```sh
claude plugin marketplace add theonly1me/claude-code-mods
claude plugin install little-harvest@claude-code-mods
```

Register the marketplace once. Run `/reload-plugins` in an open session after installing. Requires Claude Code 2.1.289 or later; no build step or runtime dependencies.

The farm plays by itself and shows when a session starts. `/farm` hides or shows it and lists every plot with its crop, stage, and lines changed. The farm makes room for question dialogs and narrow terminals. The desktop app shows a one-line summary.

![Little Harvest preview](assets/preview.png)

See the [marketplace README](../../README.md) for configuration, privacy, updates, and removal.
