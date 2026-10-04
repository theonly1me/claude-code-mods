# Change Journal

A live page in your browser that shows every change Claude makes while it works: the diff, the reason for each edit, the checks it ran, and how the code behaved before and after each turn.

![Change Journal preview](assets/preview.png)

```sh
claude plugin marketplace add theonly1me/claude-code-mods
claude plugin install change-journal@claude-code-mods
```

Register the marketplace once. Run `/reload-plugins` in an open session after installing. Requires Claude Code 2.1.289 or later; no build step or runtime dependencies.

## The page

The page opens in your browser on the first edit of a session and updates itself every second and a half. It needs no server.

- **Rail:** each turn is a ring on a line, and each edit is a dot in its status color. Click any of them to jump to it.
- **Changes:** the turn's title and explanation, then one card per edit with its diff and line numbers. Each card shows Claude's reason, taken from what Claude wrote just before the edit. When Claude edited without saying why, the turn summary fills in a likely reason, marked as inferred.
- **Behavior:** before and after flows for each turn. Changed steps are highlighted and link to the edits that changed them.
- **Files:** every changed file, the busiest first. Click one to see its whole history.

The page follows new changes as they happen. When you select something, it stops following until you press "Follow new changes".

Changes made outside `Edit` and `Write` (a `sed` command, a formatter, or your own edits) show up after each turn as outside changes. Test commands appear with a pass or fail mark.

## How to use

1. Work with Claude as usual. The page opens in your browser on the first edit, and the status line shows `✎ 3 files +40 −12`.
2. Type `/changes` to see the latest turns in the terminal. The pane opens with the keys.
3. Press a number to see that edit's reason and diff, or `o` to open the page.

Commands:

- `/changes`: open the pane with the latest four turns and their edits.
- `/changes open`: open the page in your browser.
- `/changes path`: print where the page lives.

## How to interact

![Change Journal pane with an edit shown](assets/pane.png)

The hint row under the title always names the keys that work now.

| Key | What it does |
| --- | --- |
| `1` to `9` | Show that edit under the list: its reason and its first changed lines. Press the number again to hide it. |
| `o` | Open the page. With an edit shown, the page opens on that edit's turn. |
| `c` | Copy the page path. |
| `x` | Close the pane. |
| Tab, Enter | Move to the next row or button, and press it. |
| Esc | Give the keys back to the prompt. The pane stays open. |
| ctrl+x tab | Give the keys to the pane again. |

On the page, click a ring or a dot on the rail to jump to a turn or an edit. Press "Follow new changes" to go back to the newest change.

## Settings

Change these in `/plugin`:

- `autoOpen` (on): open the page on the first edit of a session.
- `liveSummaries` (on): after each turn with edits, ask the helper model for a title, an explanation, the behavior flows, and missing reasons. This uses extra tokens.
- `helperModel` (`claude-sonnet-5-5`): the model for those summaries.
- `helperEffort` (`medium`): how hard the helper model thinks (`low`, `medium`, or `high`).

## Privacy

The page and its data stay on your machine in `~/.claude/change-journal/<project>/<session>/`. Files that look like secrets (`.env`, keys, credentials) are listed without their content, and tokens in diffs are redacted. When summaries are on, a short excerpt of each diff goes to your configured Claude provider.

See the [marketplace README](../../README.md) for configuration, privacy, updates, and removal.
