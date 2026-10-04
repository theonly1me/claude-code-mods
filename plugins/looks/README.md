# Looks

Make Claude Code look the way you like: one line per tool call, replies in a centered reading column, and four themes you switch with `/theme`.

![Looks preview](assets/preview.png)

```sh
claude plugin marketplace add theonly1me/claude-code-mods
claude plugin install looks@claude-code-mods
```

Register the marketplace once. Run `/reload-plugins` in an open session after installing. Requires Claude Code 2.1.289 or later; no build step or runtime dependencies.

## How it works

Looks redraws the rows of the transcript. It never changes what Claude reads or does.

- **Tool calls** draw as one line each: a mark, the tool, its target, and a short result such as `+4 -1`, `42 lines`, or `failed: <first line of the error>`. A run of reads and searches folds into one line such as `Read 3 files, ran 1 command`. Any other tool, MCP tools included, gets one line with its name and its main argument. Plan and question tools keep Claude Code's own rows.
- **Replies, prompts, and tool lines** sit in one column at the reading width (100 characters by default), centered in the transcript.
- **Themes** restyle your prompt row, the tool lines, a bar beside each reply, the spinner words, the turn footer, and the end of the hint line under the prompt.
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

Press ctrl+o to see every tool call in full, with diffs and output. Press ctrl+o again to return to the compact view.

## Themes

Retro CRT: phosphor green, an amber accent, a `C:\>` prompt, and `PROCESSING █` while Claude works.

![Retro CRT](assets/theme-retro.png)

Punk: hot pink and acid yellow, `✖` marks, and `SHREDDING !!`.

![Punk](assets/theme-punk.png)

Synthwave: neon magenta and cyan, `▶` and `◆` marks, and `CRUISING ~`.

![Synthwave](assets/theme-synthwave.png)

Zen paper: quiet ink and moss tones, `○` marks, and `breathing…`.

![Zen paper](assets/theme-zen.png)

## Settings

Change these in `/plugin`:

- `theme` (`off`): the theme for new sessions until you pick one with `/theme`.
- `toolCalls` (`compact`): `full` keeps Claude Code's own tool rows.
- `layout` (`centered`): `left` keeps rows at the left edge.
- `readingWidth` (`100`): the column width in characters.

## Limits

- The text inside Claude's replies keeps Claude Code's own colors. A theme frames a reply but does not recolor it.
- With `verbose` on in `/config`, tool calls stay compact in the ctrl+o view too, because Claude Code reports every row as expanded. Set `toolCalls` to `full` to see full rows.
- If you quit with ctrl+c twice, the base theme stays on the theme's match until your next session with Looks, or until you run `/theme off`. `/exit` restores it.
- Looks draws only in the terminal. The desktop app and the IDE extensions keep their own look.

See the [marketplace README](../../README.md) for configuration, privacy, updates, and removal.
