# Decision Lens

See the decisions Claude made in each turn, why it made them, and what it chose not to do. Then steer the next turns: keep a behavior you like, or stop one you do not.

![Decision Lens preview](assets/preview.png)

```sh
claude plugin marketplace add theonly1me/claude-code-mods
claude plugin install decision-lens@claude-code-mods
```

Register the marketplace once. Run `/reload-plugins` in an open session after installing. Requires Claude Code 2.1.289 or later; no build step or runtime dependencies.

## How it works

The lens records each turn as Claude works: what Claude wrote, any thinking the model shares, and every tool call with its result. When the turn ends, a helper model reads that trace and names up to five real decisions. The status line then shows `◆ 3 decisions · /why`.

Each decision is a card with:

- what Claude did, and why the trace says it did it,
- the options it did not take,
- a short quote or fact from the trace as evidence,
- how sure the reading is (three dots).

## Steering

Every card has three buttons:

- **Keep doing this** saves a rule that tells Claude to repeat the behavior.
- **Don't do this** saves a rule that tells Claude to stop.
- **Ask why** asks Claude itself, through the session's own model and cached conversation, to explain the decision in its own words.

Rules go into Claude's system prompt from the next request and in every later session. They are saved for this project. On the Rules tab you can make a rule global or remove it. No repository files change.

## Command

`/why` opens the lens on the latest turn. Use the arrow buttons to move between the last 20 turns. `/why rules` opens the Rules tab.

## Settings

Change these in `/plugin`:

- `explainTurns` (on): read each turn with the helper model. This uses extra tokens.
- `helperModel` (`haiku`): the model that reads each turn. Ask why always uses the session's model.

Some models share no thinking text. The lens then works from what Claude wrote and the tool calls it made.

See the [marketplace README](../../README.md) for configuration, privacy, updates, and removal.
