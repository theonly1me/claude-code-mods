# Slayer Corps

Tanjiro, Nezuko, Zenitsu, and Inosuke fight their way through the Long Night to Muzan, one demon at a time, while you and Claude work. The story picks up where it left off every time you start a session.

![Slayer Corps preview](assets/preview.png)

```sh
claude plugin marketplace add theonly1me/claude-code-mods
claude plugin install slayer-corps@claude-code-mods
```

Register the marketplace once. Run `/reload-plugins` in an open session after installing. Requires Claude Code 2.1.289 or later; no build step or runtime dependencies.

## How the fight works

- Reading and searching: Tanjiro's Water Breathing, a blue crescent.
- Edits: Inosuke leaps in with Beast Breathing.
- Commands: Zenitsu's Thunderclap and Flash, a bolt across the stage.
- Subagents: the Flame Hashira runs in with a sweep of fire.
- Each prompt you send: Nezuko's Blood Demon Art.
- Each finished turn: Tanjiro's Sun Dance, the strongest form.
- A failed or denied tool lets the demon strike back. The red pips under the Corps are their strength. If they run out, the Corps regroups and the demon recovers some health.

Zenitsu falls asleep when nothing happens for a while.

## The story

Twelve chapters, from a mountain pass in the snow, through a lantern market, a drum house, a forest strung with thread, a night train, and the lantern quarter, to four Upper Moons and the Infinity Castle. Each demon lasts about one working session. A toast opens each chapter and closes it when the demon turns to ash. Beat Muzan and the sun rises over the Corps. Then a new night begins, and every demon comes back stronger.

## Command

`/slayer` shows or hides the fight and prints the chapter and the demon's health. `/slayer story` tells the story so far and how the fight works. The scene is 8 rows tall, needs at least 56 columns, stacks with other game mods, and steps aside for question dialogs. The desktop app shows a one-line summary.

Fan content. The characters belong to Koyoharu Gotouge's *Demon Slayer: Kimetsu no Yaiba*. The demons and the story here are original.

See the [marketplace README](../../README.md) for configuration, privacy, updates, and removal.
