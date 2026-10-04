# Development and validation

Use Claude Code 2.1.289 or later and Node.js 24 or later. TypeScript is the only npm dependency, used to type-check against the installed Claude SDK. Installed mods need neither npm nor a build step.

```sh
npm ci
npm run prepare      # copy the shared helpers each plugin imports
npm run typecheck
npm run validate     # claude plugin validate --strict, marketplace and every plugin
npm test             # claude plugin test for every plugin
npm run previews     # render game storyboards and GIFs, and rebuild previews/index.html
```

To refresh the local SDK types, load any plugin once with `claude --plugin-dir ./plugins/<name>`, exit, and run `npm run sdk-types`. The types are ignored by Git because they describe your local Claude build.

## Layout

- `plugins/<name>/` is a complete, self-contained plugin. `hooks/register.ts(x)` is the entry point.
- `shared/` is the development source for small helpers: `pixel/` (bitmap, half-block cells, sprites, the 3x5 pixel font, the game stage, and the seasons kit: `seasons.ts`, `weather.ts`, `tree.ts`), `text/meter.ts`, `privacy.ts`, and `noop.ts`. `npm run prepare` copies into each plugin only the shared files that plugin imports, following imports inside the shared files. Run it after editing `shared/`. The copies under `plugins/*/hooks/shared/` are committed release inputs.
- `plugins/change-journal/page/` holds the live page (HTML, CSS, and JS). The mod copies it into `~/.claude/change-journal/<project>/<session>/` at session start.
- `tools/storyboards/<name>.ts` scripts a game's simulation. `storyboard()` makes a PNG sheet (`npm run storyboard -- <name> [output.png]`), and `animation()` makes the README GIF (`npm run animate -- <name> [output.gif]`, encoded by `tools/gif.ts`). Without an output path they write the plugin's `assets/preview.png` and `assets/preview.gif`.
- `tools/ansi2html.mjs <capture.ansi> <out.html> [first] [last]` turns a `tmux capture-pane -e -p` capture into HTML for a headless Chrome screenshot. The work mod previews are made this way from real sessions.
- `npm run journal-preview -- <folder>` writes a demo Change Journal page with sample data, for design work on the page.

## Rules the engine enforces

`claude plugin validate` reads each hooks module statically. These shapes are refused:

- `$` passed into a function from another file, into a method on an object, or placed inside an object literal. A helper that takes `$` must be a top-level function in the same file, called as `helper($, { ...options })`.
- A hook that is not a function literal or the name of one.
- Two registrations of one event without a matcher in the same plugin.
- `read` or `update` on an atom that is not built from a literal `{ plugin, key }` in the file that uses it.

Shared code therefore stays pure, or receives `on` and registers its own hooks (`installStage(on)` in `shared/pixel/stage.tsx`).

## Games

Each game is a pure simulation (`createX()` with event inputs, `tick(dtMs)`, and `frame(): Bitmap`) drawn through the shared stage in `shared/pixel/stage.tsx`:

- The stage opens a `Pane` per game. The surface docks it beside the transcript in the fullscreen layout and seats it above the prompt otherwise. Its body is an 8-row `Raster` keyed `<game>:stage`, repainted every 40 ms with `$.ui.blit`, a stats line, and in the dock a log of recent activity.
- Games are hidden by default. The game's command (registered by the stage) opens or closes the pane and writes the game's name to `~/.claude/mods/active-game`. Each game reads that file at session start and once a second, so the named game opens in new sessions and any other game closes: one game shows at a time.
- An ambient director in each simulation keeps the scene busy between work events. Ambient action never changes stats, kills, crops, or story progress.
- The dojo and the farm read the season from `seasons.ts` (5 minutes each, on the wall clock, so both agree), with `weather.ts` particles and the `tree.ts` seasonal tree.
- The desktop app gets the stats line.

## Validation record

Verified on **2026-10-04** with Claude Code **2.1.289**:

| Check | Result |
| --- | --- |
| Marketplace and eleven plugins, `claude plugin validate --strict` | Passed |
| `claude plugin test`, all plugins | 183 passed |
| `tsc --noEmit` over shared code, plugins, tools, and tests | Passed |
| Live session, all eleven mods loaded in tmux with `CLAUDE_CODE_NO_FLICKER=1` | No game at start. `/dojo` docked the dojo beside the transcript, `/farm` replaced it, and a new session opened the farm again |
| Work panes | `/why` and `/changes` opened with the keys; `/why keep 1` saved a rule; the lens docked as a tab beside the game |
| Unslop | Each edit got a note in its tool result; `/unslop fix` had Claude remove the dash and comment block, and the status line read 3 removed, 0 open |
| Scope Guard | A house rule that ran `rm -rf legacy` raised the question dialog with Sonnet's reason; Stop denied the command and Claude did not retry |
| Grill | Digit plus Enter answered a question while the model streamed, and Claude used the answer in the same turn |
| Looks | Compact tool rows and centered replies drew; `/theme punk` set the base theme to `dark`, and `/theme off` restored `dark-daltonized` |

Not verified: a running desktop app window (the desktop summary lines are covered by tests through the SDK renderer), and the base theme restore when Claude Code is killed with ctrl+c twice (at that point `$.config.set` has no session; Looks restores it on the next `/theme off`).

Before publishing, bump each changed plugin's version, run `npm run prepare`, regenerate previews, rerun the checks above, and review the full diff.
