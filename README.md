# Claude Code Mods

Mods I use in Claude Code. Install any of them from this marketplace.

Requires **Claude Code 2.1.287 or later**. Mods install as plugins and load TypeScript directly. No Node.js installation, file copying, or build step is needed to use them. See Anthropic's [mods overview](https://code.claude.com/docs/en/plugins/mods/overview).

These plugins use Claude Code's mod runtime. Codex compatibility would require a separate integration.

## Install

Register the marketplace once:

```sh
claude plugin marketplace add theonly1me/claude-code-mods
```

Install any combination:

```sh
claude plugin install night-feast@claude-code-mods
claude plugin install little-harvest@claude-code-mods
claude plugin install change-journal@claude-code-mods
claude plugin install behavior-map@claude-code-mods
claude plugin install pocket-familiar@claude-code-mods
claude plugin install samurai-dojo@claude-code-mods
```

Run `/reload-plugins` in an open Claude session, or start a new session. To try the working tree:

```sh
claude --plugin-dir ./plugins --settings '{"enabledPlugins":{"bugbound@claude-code-mods":false}}'
```

The local command loads this checkout and disables the previous vampire plugin for that session. It does not change your saved settings.

To install from a local checkout, run `claude plugin marketplace add .`, then use the install commands above. Keep that checkout in place.

## Pick a mod

| Mod | Command | What happens |
| --- | --- | --- |
| [Night Feast](plugins/night-feast/README.md) | `/feast` | A custom vampire hunts human villagers in a moonlit platformer. Play along with keyboard or mouse. |
| [Little Harvest](plugins/little-harvest/README.md) | `/farm` | Every turn plants seeds. Work grows crops; normal completion harvests them. |
| [Change Journal](plugins/change-journal/README.md) | `/changes` | Confirmed edits, inferred explanations, observed checks, and expandable code snippets. |
| [Behavior Map](plugins/behavior-map/README.md) | `/behavior` | Paired before-and-after flows with links to the supporting edits. |
| [Pocket Familiar](plugins/pocket-familiar/README.md) | `/pet` | A persistent companion hatches and grows as turns complete. |
| [Samurai Dojo](plugins/samurai-dojo/README.md) | `/dojo` | Search battles, meditation, bamboo practice, training dummies, and rival duels. |

Scene commands accept `show`, `hide`, `compact`, and `expanded`. `/dojo` alone toggles its scene. Other bare scene commands show theirs. Night Feast also accepts `play` and `watch`.

Every mod starts hidden, including the pet and update strips. Reloading plugins or starting a session hides them again. Open one with its command. Click Feast, Farm, Dojo, or Pet below a scene to switch. Hide and size buttons sit beside these controls. The pet's companion strip appears only after you open the pet.

Scenes open compact, with at most six animation rows. Expanded scenes use at most twelve. Both sizes take no more than a third of the available rows for the animation, leaving space for the conversation and prompt. Small terminals fall back to a status line, and question dialogs take priority.

The CLI uses pixel animation. Desktop uses colored text pixels. Headless sessions run the hooks without drawing. Run `/feast play`, then click the game to focus it. Use Left/Right or A/D to move and Space/Up/W to jump. The on-screen buttons also work. A mouse click moves toward that side and jumps. Walk into a villager to feed. Escape returns focus to Claude. `/feast watch` returns to automatic play. The character follows your work; it doesn't edit files or run tests.

## Live explanations

Both useful mods default to:

```json
{ "model": "claude-sonnet-5-5", "effort": "medium" }
```

Change Journal provides one shared analysis when both mods are enabled. Behavior Map makes its own requests when that service is missing, disabled, or unavailable. `/changes` and `/behavior` open detailed panes without taking keyboard focus.

| Setting | Default | Meaning |
| --- | --- | --- |
| `liveSummaries` | `true` | Enable model explanations. Uses additional tokens through your configured Claude provider. |
| `summaryModel` | `claude-sonnet-5-5` | Model for explanations. |
| `summaryEffort` | `medium` | `low`, `medium`, `high`, `xhigh`, or `max`. |

Use `/plugin` to configure each installed plugin. You can also install with options:

```sh
claude plugin install change-journal@claude-code-mods --config liveSummaries=false
claude plugin install behavior-map@claude-code-mods --config liveSummaries=false
```

Disable both to stop all automatic explanations. Factual edits and check results still appear. Automatic analysis runs only while its view is open. Hiding or closing the view stops requests; observed edits remain available when you reopen it.

Edits are batched for two seconds. Requests are at least ten seconds apart, capped at six per top-level turn with one slot reserved for completion. Each request has a 4,096-token output cap and a twenty-second timeout. Malformed or stale responses are discarded. Model failures leave the factual view available.

Explanations and flows are labeled **inferred**. Check rows show **observed** outcomes. Unknown shell commands do not count as tests. Bounded Git comparisons show tracked-file changes observed during a command, including partial changes from failed commands. Simultaneous user edits cannot be conclusively attributed to Claude. Untracked shell-created files and changes beyond the comparison limit may be absent.

## Privacy and persistence

Pet growth, harvest totals, and dojo victories stay in Claude's local plugin store. Each session writes its own contribution so sessions do not replace a shared total. Code snippets and semantic history stay in session memory and clear with the session.

Live analysis sends bounded, sanitized change evidence through Claude's configured provider. Credential paths are excluded and recognizable secrets are redacted. No telemetry service or separate backend is added. Previews and tests use synthetic projects.

## Previews

Open [the preview gallery](previews/index.html), or the preview in each mod's README. Frame strips show different activities using the actual scene renderers; utility previews use synthetic evidence.

## Update or remove

```sh
claude plugin marketplace update claude-code-mods
claude plugin update night-feast@claude-code-mods
claude plugin uninstall night-feast@claude-code-mods
```

The vampire plugin was previously called Bugbound. If you installed it, uninstall `bugbound@claude-code-mods` and install `night-feast@claude-code-mods`.

Substitute another plugin name as needed. Reload plugins or restart Claude after updates. `/plugin` also provides enable, disable, configure, and uninstall controls.

## Development

See [development and validation](DEVELOPMENT.md). The shared folder is a development source: `npm run prepare` copies helpers and state contracts into each plugin. Every published plugin contains its own runtime files and has no runtime dependencies.

MIT licensed. Independent community mods, unaffiliated with Anthropic or other assistant vendors.
