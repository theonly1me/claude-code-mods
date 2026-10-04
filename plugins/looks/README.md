# Looks

Make Claude Code look the way you like: four themes you switch with `/theme`, and two optional layout changes, one line per tool call and replies in a centered reading column.

![Looks preview](assets/preview.png)

```sh
claude plugin marketplace add theonly1me/claude-code-mods
claude plugin install looks@claude-code-mods
```

Register the marketplace once. Run `/reload-plugins` in an open session after installing. Requires Claude Code 2.1.289 or later; no build step or runtime dependencies.

## How it works

Looks redraws the rows of the transcript. It never changes what Claude reads or does. Out of the box it tidies tool calls and leaves the layout alone. Themes, compact rows, and the centered layout are choices you make.

![Synthwave with name tags, a framed reply, and a themed divider](assets/preview.png)

![Tool calls with the default tidy view](assets/tool-rows.png)

- **Tidy tool calls** (setting `toolCalls: full`, the default) draw each call as a header line: a mark, the tool, its target, and a short result such as `+4 -1` or `failed`. Under it, the output sits in a short dim bar. An edit shows only its changed lines in green and red. A shell command shows its first 6 lines and `N more lines (ctrl+o for all)`. Reads, searches, and other calls with no output add nothing under the header. A failed call shows the first lines of its error in red.
- **Compact tool calls** (setting `toolCalls: compact`) draw one line per call and hide the output. A run of reads and searches folds into one line such as `Read 3 files, ran 1 command`. Any other tool, MCP tools included, gets one line with its name and its main argument.
- **Plain tool calls** (setting `toolCalls: plain`) leave every tool row to Claude Code.
- **Centered layout** (setting `layout: centered`) puts replies, prompts, and tool lines in one column at the reading width (100 characters by default), centered in the transcript.
- **Themes** give each look its own character. With the default `themeStyle: rich`, a theme draws:
  - a name tag on your prompt and on each reply, and a colored tag on each tool name;
  - the reply in a framed, tinted panel (double green lines for Retro CRT, bold pink for Punk, rounded neon for Synthwave, thin ink for Zen paper);
  - a themed divider between turns that keeps Claude Code's own turn word and the time;
  - result bars in the theme's own glyph and color.
  
  `themeStyle: simple` only recolors text. Themes keep Claude Code's own spinner and turn footer words, unless you turn on `themeWords`.
- **Base theme**: a theme also sets the Claude Code base theme that suits it, in the same tone (dark or light) as yours. Retro CRT uses the ANSI variant, Zen paper the colorblind-friendly one, and Punk and Synthwave the plain one. If your base theme is `auto`, Looks leaves it alone. `/theme off` and `/exit` put your own base theme back.

## How to use

- `/theme` opens the theme picker.
- `/theme retro`, `/theme punk`, `/theme synthwave`, `/theme zen` switch at once. `/theme off` turns themes off and restores your base theme.
- `/theme base` opens the Claude Code base theme picker. `/looks` does the same as `/theme`.

Your choice is kept for the next sessions. If you change the base theme in `/config` while a Looks theme is on, Looks keeps your new choice as the one to restore.

## How to interact

In the picker:

1. Press `r`, `p`, `s`, or `z` to apply Retro CRT, Punk, Synthwave, or Zen paper, or `o` for Off.
2. Press Tab to move between themes. The preview box shows the theme under the focus before you apply it.
3. Press `b` to open the Claude Code base themes.
4. Press Esc to close the picker.

With tidy or compact tool calls, press ctrl+o to see every tool call in full, with diffs and output. Press ctrl+o again to return.

## Themes

Each image is a real session with the theme on.

Retro CRT: phosphor green on black, double-line panels, an amber accent, and `═` dividers.

![Retro CRT](assets/theme-retro.png)

Punk: hot pink and acid yellow, bold frames, yellow name tags, and zigzag dividers.

![Punk](assets/theme-punk.png)

Synthwave: neon magenta and cyan, rounded frames, and a divider that fades from magenta to cyan.

![Synthwave](assets/theme-synthwave.png)

Zen paper: quiet ink and moss tones, thin frames, sage name tags, and dotted dividers. It also has a light paper variant when your terminal is light.

![Zen paper](assets/theme-zen.png)

## Settings

Change these in `/plugin`:

- `theme` (`off`): the theme for new sessions until you pick one with `/theme`.
- `toolCalls` (`full`): `full` is the tidy view above. `compact` draws one line per call. `plain` keeps Claude Code's own tool rows.
- `layout` (`left`): `centered` puts rows and replies in one column at the reading width. `left` keeps them at the left edge.
- `readingWidth` (`100`): the column width in characters.
- `themeStyle` (`rich`): `rich` is the full look above. `simple` only recolors text.
- `themeWords` (off): on uses the theme's spinner and footer words, such as `CRUISING` or `Shredded`. Off keeps Claude Code's own words.

## Limits

- The text inside Claude's replies keeps Claude Code's own colors. A theme frames a reply but does not recolor it.
- With `verbose` on in `/config`, Claude Code reports every row as expanded, so ctrl+o cannot switch back to full rows. The tidy view then shows up to 30 lines of output per call. Set `toolCalls` to `plain` to see Claude Code's own rows.
- The tidy view draws its own result lines for edits and shell commands, so it does not show Claude Code's syntax-highlighted diff. ctrl+o does.
- If you quit with ctrl+c twice, the base theme stays on the theme's match until your next session with Looks, or until you run `/theme off`. `/exit` restores it.
- Looks draws only in the terminal. The desktop app and the IDE extensions keep their own look.

See the [marketplace README](../../README.md) for configuration, privacy, updates, and removal.
