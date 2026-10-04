# Development and validation

Use Claude Code 2.1.289 or later and Node.js 24 or later. TypeScript is the only npm dependency, used to type-check against the installed Claude SDK. Installed mods need neither npm nor a build step.

```sh
npm ci
npm run prepare      # copy the shared helpers each plugin imports
npm run typecheck
npm run validate     # claude plugin validate --strict, marketplace and every plugin
npm test             # claude plugin test for every plugin
npm run previews     # render game storyboards and rebuild previews/index.html
```

To refresh the local SDK types, load any plugin once with `claude --plugin-dir ./plugins/<name>`, exit, and run `npm run sdk-types`. The types are ignored by Git because they describe your local Claude build.

## Layout

- `plugins/<name>/` is a complete, self-contained plugin. `hooks/register.ts(x)` is the entry point.
- `shared/` is the development source for small helpers: `pixel/` (bitmap, half-block cells, sprites, the 3x5 pixel font, and the stacked game stage), `text/meter.ts`, `privacy.ts`, and `noop.ts`. `npm run prepare` copies into each plugin only the shared files that plugin imports, following imports inside the shared files. Run it after editing `shared/`. The copies under `plugins/*/hooks/shared/` are committed release inputs.
- `plugins/change-journal/page/` holds the live page (HTML, CSS, and JS). The mod copies it into `~/.claude/change-journal/<project>/<session>/` at session start.
- `tools/storyboards/<name>.ts` scripts a game's simulation into a PNG sheet: `npm run storyboard -- <name> [output.png]`. Without an output path it writes the plugin's `assets/preview.png`.
- `npm run journal-preview -- <folder>` writes a demo Change Journal page with sample data, for design work on the page.

## Rules the engine enforces

`claude plugin validate` reads each hooks module statically. These shapes are refused:

- `$` passed into a function from another file, into a method on an object, or placed inside an object literal. A helper that takes `$` must be a top-level function in the same file, called as `helper($, { ...options })`.
- A hook that is not a function literal or the name of one.
- Two registrations of one event without a matcher in the same plugin.
- `read` or `update` on an atom that is not built from a literal `{ plugin, key }` in the file that uses it.

Shared code therefore stays pure, or receives `on` and registers its own hooks (`installStage(on)` in `shared/pixel/stage.tsx`).

## Games

Each game is a pure simulation (`createX()` with event inputs, `tick(dtMs)`, and `frame(): Bitmap`) drawn through the shared stage: an 8-row `Raster` keyed by the plugin name, repainted every 40 ms with `$.ui.blit`. Each band nests what is beneath it, so several games stack. A game yields to question dialogs and narrow terminals, and the desktop app gets a one-line summary.

## Validation record

Verified on **2026-10-04** with Claude Code **2.1.289**:

| Check | Result |
| --- | --- |
| Marketplace and eight plugins, `claude plugin validate --strict` | Passed |
| `claude plugin test`, all plugins | 81 passed |
| `tsc --noEmit` over shared code, plugins, and tests | Passed |
| Live session, all eight mods loaded in tmux | All five game bands drew and stacked; the useful mods ran side by side |
| Grill answers in a running turn | Verified in the session transcript, by digit hotkey during a tool call and by digit plus Enter while the model streamed |
| Decision Lens | Decision cards rendered after real turns; previews are captures of that pane |
| Change Journal | The live page updated from real turns with summaries, inferred reasons, and diffs; it survives a plugin reload in the same session |
| Thinking chunks | `turn.step` delivers text chunks; Sonnet 5.5 and Opus 5.5 send empty thinking text, so the lens and the journal work from narration and tool calls |

Not verified: a running desktop app window (the desktop summary line is covered by tests through the SDK renderer), and the timezone the hooks environment reports for the farm and pet skies.

Before publishing, bump each changed plugin's version, run `npm run prepare`, regenerate previews, rerun the checks above, and review the full diff.
