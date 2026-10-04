# Claude Code Mods

Mods I use in Claude Code: three that make working with Claude clearer, and five pixel games that play themselves while you and Claude work.

Requires **Claude Code 2.1.289 or later**. Mods install as plugins and load TypeScript directly, with no build step and no runtime dependencies. See Anthropic's [mods overview](https://code.claude.com/docs/en/plugins/mods/overview).

## Install

Register the marketplace once:

```sh
claude plugin marketplace add theonly1me/claude-code-mods
```

Then install any combination:

```sh
claude plugin install change-journal@claude-code-mods
claude plugin install decision-lens@claude-code-mods
claude plugin install grill@claude-code-mods
claude plugin install samurai-dojo@claude-code-mods
claude plugin install slayer-corps@claude-code-mods
claude plugin install night-feast@claude-code-mods
claude plugin install little-harvest@claude-code-mods
claude plugin install pocket-familiar@claude-code-mods
```

Run `/reload-plugins` in an open session, or start a new one. To try this checkout without installing, pass one `--plugin-dir` per mod, for example `claude --plugin-dir ./plugins/grill --plugin-dir ./plugins/samurai-dojo`.

## Mods for working

| Mod | Command | What it does |
| --- | --- | --- |
| [Change Journal](plugins/change-journal/README.md) | `/changes` | A live page in your browser with every change Claude makes: diffs, the reason for each edit, checks, and before and after behavior flows for each turn. |
| [Decision Lens](plugins/decision-lens/README.md) | `/why` | The decisions Claude made in each turn, why, and what it chose not to do. Keep or stop a behavior with one button; the rule goes into Claude's system prompt. |
| [Grill](plugins/grill/README.md) | `/grill` | Sharp questions about your task while Claude works. Answer with a digit and Claude gets the answer mid-turn. Brainstorm and side chat modes too. |

These three use a helper model (`haiku` by default) for summaries, decisions, and questions. Each has a setting in `/plugin` to change the model or turn the calls off.

## Games

Each game draws an 8-row pixel scene above the prompt. They play themselves from what you and Claude do; there is nothing to control. Install several and they stack. Each game's command hides or shows it.

| Mod | Command | What happens |
| --- | --- | --- |
| [Samurai Dojo](plugins/samurai-dojo/README.md) | `/dojo` | A Claude samurai cuts down a Codex or Gemini alien for every tool call. Lifetime kills earn ranks. |
| [Slayer Corps](plugins/slayer-corps/README.md) | `/slayer` | Tanjiro, Nezuko, Zenitsu, and Inosuke fight twelve chapters to Muzan. Each tool has its own breathing form, and the story continues every session. |
| [Night Feast](plugins/night-feast/README.md) | `/feast` | A vampire feeds on finished tool calls while the moon tracks your context window. Dawn means it is time to compact. |
| [Little Harvest](plugins/little-harvest/README.md) | `/farm` | Every changed file becomes a crop. Tests bring sun or storms, and passing turns fill the barn. |
| [Pocket Familiar](plugins/pocket-familiar/README.md) | `/pet` | A fox spirit fed by passing tests and finished turns. It sleeps when you are idle and grows up to nine tails. |

The desktop app shows a one-line summary of each game.

## Privacy and persistence

Game progress (ranks, chapters, bushels, the pet's stats) and Decision Lens rules stay in Claude's local plugin store. The Change Journal page stays on your machine in `~/.claude/change-journal/`. Helper-model calls go through your configured Claude provider, with secrets redacted and secret files left out. No telemetry or separate backend is added.

## Previews

Open [the preview gallery](previews/index.html), or the preview in each mod's README. Game previews are rendered by each game's own simulation.

## Update or remove

```sh
claude plugin marketplace update claude-code-mods
claude plugin update grill@claude-code-mods
claude plugin uninstall grill@claude-code-mods
```

Substitute any mod name. `/plugin` also has enable, disable, configure, and uninstall controls.

Behavior Map is now the Behavior tab of the Change Journal page. If you installed it, uninstall `behavior-map@claude-code-mods`. The vampire mod was once called Bugbound; uninstall `bugbound@claude-code-mods` if you still have it.

## Development

See [development and validation](DEVELOPMENT.md).

MIT licensed. Independent community mods, unaffiliated with Anthropic or other assistant vendors. Slayer Corps is fan content; its characters belong to Koyoharu Gotouge.
