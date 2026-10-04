# Slayer Corps

Tanjiro, Nezuko, Zenitsu, and Inosuke fight their way through the Long Night to Muzan, one demon at a time, while you and Claude work. The story picks up where it left off every time you start a session.

![Slayer Corps preview](assets/preview.gif)

```sh
claude plugin marketplace add theonly1me/claude-code-mods
claude plugin install slayer-corps@claude-code-mods
```

Register the marketplace once. Run `/reload-plugins` in an open session after installing. Requires Claude Code 2.1.289 or later; no build step or runtime dependencies.

## How to use

The fight is hidden until you ask for it.

- `/slayer` shows the fight. It comes back in every new session until you run `/slayer` again to hide it.
- `/slayer on` and `/slayer off` show or hide it directly.
- `/slayer stats` prints the chapter, the demon's health, and your lifetime totals without showing or hiding anything.
- `/slayer-story` tells the story so far and how the fight works.

The fight opens in a pane. In the fullscreen layout (start Claude Code with `CLAUDE_CODE_NO_FLICKER=1`) the pane docks beside the transcript. Otherwise it sits above the prompt. Under the scene is one line with the chapter and the demon's health, and in the docked pane a feed of what each slayer just did.

Only one game mod shows at a time. Showing another game (for example `/dojo`) hides this one, and `/slayer` brings it back. Closing the pane with its close mark also hides it for later sessions. A pane that opens by itself at session start needs a terminal at least 144 columns wide; `/slayer` opens it at any width. The scene needs 56 columns inside the pane. The desktop app shows the summary line.

## How it plays

Every tool call Claude finishes is a strike, and the four slayers take turns so nobody sits out:

- Reading and searching lean on Tanjiro's Water Breathing, edits on Inosuke's Beast Breathing, and commands on Zenitsu's Thunderclap and Flash. When the favourite just struck, whoever has rested longest steps in with their own form.
- Subagents: the Flame Hashira runs in with a sweep of fire.
- Each prompt you send: Nezuko's Blood Demon Art.
- Each finished turn: Tanjiro's Sun Dance, the strongest form.
- A failed or denied tool lets the demon strike back. The red pips under the Corps are their strength. If they run out, the Corps regroups and the demon recovers some health.

Between strikes the Corps never stands still. They spar with the demon in turns: Tanjiro shows his forms, Zenitsu dozes off and snaps awake into a lightning dash, Inosuke charges with both blades, Nezuko kicks, and everyone feints, dodges the demon's swipes, and shifts their stance. Sparring is for show. The demon blocks every sparring blow, and only real work lowers its health or moves the story. A real strike always cuts in ahead of sparring.

## The story

Twelve chapters, from a mountain pass in the snow, through a lantern market, a drum house, a forest strung with thread, a night train, and the lantern quarter, to four Upper Moons and the Infinity Castle. Each demon lasts about one working session. While the fight is showing, a toast opens each chapter and closes it when the demon turns to ash. Beat Muzan and the sun rises over the Corps. Then a new night begins, and every demon comes back stronger. Work keeps moving the story even while the fight is hidden.

Fan content. The characters belong to Koyoharu Gotouge's *Demon Slayer: Kimetsu no Yaiba*. The demons and the story here are original.

See the [marketplace README](../../README.md) for configuration, privacy, updates, and removal.
