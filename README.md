# Claude Code Mods

Mods I use in Claude Code: six that make working with Claude clearer and cleaner, and five pixel games that play themselves while you and Claude work.

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
claude plugin install unslop@claude-code-mods
claude plugin install scope-guard@claude-code-mods
claude plugin install looks@claude-code-mods
claude plugin install samurai-dojo@claude-code-mods
claude plugin install slayer-corps@claude-code-mods
claude plugin install night-feast@claude-code-mods
claude plugin install little-harvest@claude-code-mods
claude plugin install pocket-familiar@claude-code-mods
```

Run `/reload-plugins` in an open session, or start a new one. To try this checkout without installing, pass one `--plugin-dir` per mod, for example `claude --plugin-dir ./plugins/grill --plugin-dir ./plugins/samurai-dojo`.

The panes look best in the fullscreen layout: start Claude Code with `CLAUDE_CODE_NO_FLICKER=1`. Panes then dock in a column beside the transcript. Without it, they open above the prompt.

## Mods for working

| Mod | Command | What it does |
| --- | --- | --- |
| [Change Journal](#change-journal) | `/changes` | A live page in your browser with every change Claude makes: diffs, the reason for each edit, checks, and before and after behavior flows. |
| [Decision Lens](#decision-lens) | `/why` | The decisions Claude made in each turn, why, and what it chose not to do. Keep or stop a behavior with one key. |
| [Grill](#grill) | `/grill` | Sharp questions about your task while Claude works. Your answers reach Claude mid-turn. |
| [Unslop](#unslop) | `/unslop` | Finds AI slop in Claude's edits (dashes, comment blocks, slop tests, filler words) and has Claude remove it. |
| [Scope Guard](#scope-guard) | `/scope` | Notices when Claude edits outside what you asked for, and asks you first. |
| [Looks](#looks) | `/theme` | Four themes (Retro CRT, Punk, Synthwave, Zen paper), tidier tool calls, and optional one-line rows and centered replies. |

The work mods use `claude-sonnet-5-5` at `medium` effort as their helper model. Unslop uses `haiku` for its quick slop check. Each mod has settings in `/plugin` to change the model or turn the calls off.

### Change Journal

![Change Journal page](plugins/change-journal/assets/preview.png)

The page opens in your browser on Claude's first edit and updates live: each turn, each diff, the reason Claude gave for the edit, the test runs, and a Behavior tab with before and after flows.

- **Use:** `/changes` opens the pane in the terminal. `/changes open` opens the page. `/changes path` prints where the page is.
- **Interact:** in the pane, press `1` to `9` to show an edit's reason and diff, `o` to open the page on that turn, `c` to copy the path, and Esc to go back to the prompt.

[Details](plugins/change-journal/README.md)

### Decision Lens

![Decision Lens pane](plugins/decision-lens/assets/preview.png)

After each turn, the lens lists the decisions Claude made: what it chose, why, and what it did not do. A keep or avoid rule goes into Claude's system prompt for this project.

- **Use:** `/why` opens the lens on the latest turn. `/why keep 2`, `/why avoid 2`, and `/why ask 2` act on card 2 without opening anything. `/why rules` lists your rules.
- **Interact:** press `1` to `5` to pick a card, then `k` to keep, `a` to avoid, or `w` to ask Claude why. `p` and `n` move between turns. Esc goes back to the prompt.

[Details](plugins/decision-lens/README.md)

### Grill

![Grill band](plugins/grill/assets/preview.png)

When you send a task, Grill asks three to five questions that would change the result, one at a time above the prompt. Each answer goes into Claude's running turn.

- **Use:** it starts by itself on a task prompt. `/grill brainstorm` switches to "what if" ideas, `/grill chat` opens a side chat, and `/grill off` stops it.
- **Interact:** type the answer's number and press Enter. At an empty prompt, the number alone also works.

[Details](plugins/grill/README.md)

### Unslop

![Unslop pane](plugins/unslop/assets/preview.png)

Unslop checks each edit Claude makes for slop: em and en dashes, large comment blocks, comments that repeat the code, slop tests, and AI filler words in docs. Claude gets a note right after the edit and removes the slop. Unslop never edits files. It also asks Claude to write chat replies in plain, short sentences.

- **Use:** `/unslop` lists every finding and whether it was removed. `/unslop fix` asks Claude to remove the open ones. `/unslop off` pauses it.
- **Interact:** in the pane, press `f` to send the open findings to Claude, `c` to clear the removed ones, and Esc to go back to the prompt.

[Details](plugins/unslop/README.md)

### Scope Guard

![Scope Guard question](plugins/scope-guard/assets/preview.png)

Scope Guard remembers what you asked for. When Claude edits a file you did not mention, deletes files, or rewrites a large part of a file, it checks with the helper model. Clear drift opens Claude Code's question dialog before the edit runs. Smaller drift shows as a note above the prompt.

- **Use:** it runs by itself. `/scope` shows the task it recorded, the allowed paths, and recent flags. `/scope off` stops it.
- **Interact:** in the dialog, choose Allow once, Allow for this task, or Stop. For a note above the prompt, press `7` to pull Claude back, `8` if it is fine, or `9` to allow that folder.

[Details](plugins/scope-guard/README.md)

### Looks

![Looks with a theme on](plugins/looks/assets/preview.png)

Looks makes the transcript look the way you like. Themes restyle your prompt rows, the reply frame, and the hint line, and keep Claude Code's own spinner words unless you turn on `themeWords`, and set a matching Claude Code base theme. Tool calls get a header line with their output in a short bar under it. Two more changes are off by default and you turn them on in `/plugin`: `toolCalls: compact` makes each tool call one line, and `layout: centered` centers replies at a comfortable width.

- **Use:** `/theme` (or `/looks`) opens the picker. `/theme retro`, `/theme punk`, `/theme synthwave`, `/theme zen`, and `/theme off` switch directly. `/theme off` puts your own base theme back, and `/theme base` opens Claude Code's own theme list.
- **Interact:** in the picker, press `r`, `p`, `s`, or `z` to apply a theme and `o` to turn themes off. Tab moves the preview between themes, `b` opens the base themes, and Esc closes the picker. ctrl+o shows the full tool rows.

[Details](plugins/looks/README.md)

## Games

Each game draws a pixel scene in a pane. They play themselves from what you and Claude do, and between work they keep busy on their own. There is nothing to control.

- Games are hidden until you run their command. Once on, a game comes back in each new session until you turn it off.
- One game shows at a time. Turning on another game turns the current one off.
- In the fullscreen layout the game docks beside the transcript, with a stats line and a log of what just happened. Otherwise it sits above the prompt.
- Ambient action is for show. Only real work counts toward kills, story progress, crops, or the pet's stats.
- Each command also takes `on`, `off`, and `stats` (which prints the stats without opening the pane).

| Mod | Command | What happens |
| --- | --- | --- |
| [Samurai Dojo](#samurai-dojo) | `/dojo` | A Claude samurai cuts down a Codex, Gemini, or ChatGPT foe for every tool call, and meditates, trains, and duels between them through four seasons. |
| [Slayer Corps](#slayer-corps) | `/slayer` | Tanjiro, Nezuko, Zenitsu, and Inosuke take turns against twelve chapters of demons up to Muzan. The story continues every session. |
| [Night Feast](#night-feast) | `/feast` | A vampire feeds on finished tool calls while the moon tracks your context window. Dawn means it is time to compact. |
| [Little Harvest](#little-harvest) | `/farm` | Every changed file becomes a crop. Tests bring sun or storms, passing turns fill the barn, and the seasons turn. |
| [Pocket Familiar](#pocket-familiar) | `/pet` | A fox spirit fed by passing tests and finished turns. It plays between them and grows up to nine tails. |

### Samurai Dojo

![Samurai Dojo](plugins/samurai-dojo/assets/preview.gif)

Each tool call sends a foe into the dojo, and the samurai cuts it down when the call finishes. Failed calls cost a parried strike, subagents bring crowned elites, and lifetime kills earn ranks. Between calls the samurai meditates, practices kata, duels a wandering ronin, or fights off a wave. The season changes every 5 minutes.

- **Use:** `/dojo` turns it on or off. `/dojo stats` prints your rank and kills.

[Details](plugins/samurai-dojo/README.md)

### Slayer Corps

![Slayer Corps](plugins/slayer-corps/assets/preview.gif)

Each tool call is a strike, and the four slayers take turns with their own forms. Your prompts bring Nezuko in, subagents call a Hashira, and a finished turn lands a finishing form. Between strikes they spar with the demon. Each defeated demon moves the campaign to the next chapter.

- **Use:** `/slayer` turns it on or off. `/slayer stats` prints the chapter and the demon's health, and `/slayer-story` tells the story so far.

[Details](plugins/slayer-corps/README.md)

### Night Feast

![Night Feast](plugins/night-feast/assets/preview.gif)

The moon crosses the sky as your context window fills. The vampire feeds on each finished tool call and recoils from errors. At 90% the sky turns to dawn and a toast tells you to compact. Between feeds it stalks the rooftops, swoops as a bat, and chases villagers.

- **Use:** `/feast` turns it on or off. `/feast stats` prints the night, the blood meter, and the context fill.

[Details](plugins/night-feast/README.md)

### Little Harvest

![Little Harvest](plugins/little-harvest/assets/preview.gif)

Each file that changes becomes a plot, with the crop chosen by the file kind. Failing tests bring a storm and passing tests bring sun. When a turn with a passing test ends, the ripe crops fly into the barn. Between edits the farmer waters, weeds, feeds the chickens, and shoos crows. The seasons turn in step with the dojo.

- **Use:** `/farm` turns it on or off. `/farm stats` lists every plot.

[Details](plugins/little-harvest/README.md)

### Pocket Familiar

![Pocket Familiar](plugins/pocket-familiar/assets/preview.gif)

A fox spirit whose fullness, joy, and energy come only from your work. It reads, types, and checks tests along with Claude, sleeps when you are idle, and grows from an egg to nine tails. Between work it chases butterflies, pounces on leaves, and digs for pebbles.

- **Use:** `/pet` turns it on or off. `/pet stats` prints its stat bars.

[Details](plugins/pocket-familiar/README.md)

## Privacy and persistence

Game progress (ranks, chapters, bushels, the pet's stats), Decision Lens rules, and your theme stay in Claude's local plugin store. The active game is named in `~/.claude/mods/active-game`. The Change Journal page stays on your machine in `~/.claude/change-journal/`. Helper-model calls go through your configured Claude provider, with secrets redacted and secret files left out. No telemetry or separate backend is added.

## Previews

Open [the preview gallery](previews/index.html). Game animations are rendered by each game's own simulation. Work mod images are captures from real sessions.

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
