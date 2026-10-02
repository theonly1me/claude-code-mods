# Night Feast

A custom vampire hunts human villagers in a pixel platformer while Claude works. Reach a human to feed, or let successful checks trigger a meal. Test edits add platforms, and failed checks bring more humans into the scene. Watch it play automatically or take the controls yourself.

![Custom vampire](assets/vampire.png)

```sh
claude plugin marketplace add theonly1me/claude-code-mods
claude plugin install night-feast@claude-code-mods
```

Register the marketplace once. Run `/reload-plugins` in an open session after installing. Requires Claude Code 2.1.287 or later; no build step or runtime dependencies.

Use `/feast play` for manual play and `/feast watch` for automatic play. Click the game to focus it. Left/Right or A/D move, Space/Up/W jump, and a mouse click moves toward that side and jumps. Buttons also work. Escape returns focus to Claude.

Use `/feast show`, `hide`, `compact`, or `expanded`. Starts hidden and opens compact with at most six animation rows. Expanded mode is capped at twelve. Click the scene buttons to switch, or Hide to close it. Question dialogs take priority. Desktop uses colored text pixels.

![Night Feast synthetic preview](assets/preview.png)

See the [marketplace README](../../README.md) for configuration, privacy, updates, and removal.
