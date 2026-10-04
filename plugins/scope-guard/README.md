# Scope Guard

Scope Guard notices when Claude starts to change things you did not ask for. Clear drift waits for your answer; milder drift is flagged above the prompt.

![Scope Guard preview](assets/preview.png)

```sh
claude plugin marketplace add theonly1me/claude-code-mods
claude plugin install scope-guard@claude-code-mods
```

Register the marketplace once. Run `/reload-plugins` in an open session after installing. Requires Claude Code 2.1.289 or later; no build step or runtime dependencies.

## How it works

Scope Guard keeps your last three prompts as the task. Before each `Edit`, `Write`, `NotebookEdit`, and each shell command that deletes or moves files (`rm`, `git rm`, `mv`, `git mv`), it checks cheap rules first:

- The file is not in your request, and Claude did not read or search it this turn.
- The file is outside the project.
- The change deletes or moves files.
- The change rewrites most of a long file, or an edit removes 40 lines or more.
- The file is the one that reaches the many-files limit for this turn (8 by default).

A file your request names, a file Claude already changed this turn, and scratch files under `/tmp` never count. When the rules find enough, Sonnet 5.5 reads your task, what Claude said just before the change, and the change itself, and decides: in scope, mild drift, or clear drift. If the model call fails, the rules decide alone.

## How to use

Install it and work as usual. Nothing shows until Claude drifts.

- `/scope`: show the task Scope Guard keeps, the paths you allowed, and the recent flags.
- `/scope off` and `/scope on`: stop or start the checks. The choice stays for the next sessions.
- `/scope flag`: flag drift above the prompt but never stop Claude.
- `/scope ask`: stop clear drift with a question again (the default).

## How to interact

On clear drift, Claude waits on Claude Code's own question dialog:

```
Scope
Claude wants to delete docs/old.md, outside your request. The request is about math.js only. Allow it?
❯ 1. Allow once
  2. Allow for this task
  3. Stop
```

- **Allow once** lets this change run.
- **Allow for this task** lets this file and its folder through until your next new request.
- **Stop** refuses the change, and Claude reads why. Text typed under "Other" goes to Claude with the refusal.

Milder drift runs, and a band above the prompt flags it:

```
▌ SCOPE Claude chose to edit README.md, which looks outside your request.
  The README is related but the request was only about math.js.
7: Pull back  8: Fine  9: Allow the top folder  type the number, Enter
```

- **7 Pull back** tells Claude to stay in scope and revert the change if the request does not need it. During a turn the note reaches Claude mid-turn; after the turn it becomes your next prompt.
- **8 Fine** clears the flag.
- **9 Allow this folder** clears every flag in that folder and stops new ones there for this task.

Type the number and press Enter. When the prompt is empty and Claude is not streaming text, the number alone works too. The status line shows how many flags are open.

## Settings

Change these in `/plugin`:

- `mode` (`ask`): `ask`, `flag`, or `off`, as with the commands above.
- `confirmModel` (`claude-sonnet-5-5`): the model that confirms a drift the rules found.
- `manyFiles` (`8`): how many distinct files Claude may change in one turn before that counts as drift.

Most changes never reach the model. Each change the rules flag costs one short confirm call at medium effort, and Claude waits for it (20 seconds at most) before the change runs.

See the [marketplace README](../../README.md) for configuration, privacy, updates, and removal.
