# Samurai Dojo

A Claude samurai guards your session. Every tool call Claude makes sends a Codex, Gemini, or ChatGPT foe into the dojo, and the samurai cuts it down when the call finishes. Between calls the samurai never stands still: it meditates, practices kata, duels wandering ronin, and fights off ambient waves, through winter, cherry blossom, summer, and autumn.

![Samurai Dojo](assets/preview.gif)

```sh
claude plugin marketplace add theonly1me/claude-code-mods
claude plugin install samurai-dojo@claude-code-mods
```

Register the marketplace once. Run `/reload-plugins` in an open session after installing. Requires Claude Code 2.1.289 or later; no build step or runtime dependencies.

## How to use

1. Type `/dojo`. The dojo opens in a pane.
2. Keep working. Each tool call Claude makes becomes a foe, and each finished call is a cut.
3. Type `/dojo` again to close it.

- The dojo is hidden until you open it. Once open, it opens again in each new session until you close it.
- Only one game shows at a time. Opening another game (for example `/farm`) closes the dojo.
- In the fullscreen layout (`CLAUDE_CODE_NO_FLICKER=1`), the pane docks beside the transcript and shows a log of what the samurai did. Otherwise it sits above the prompt.
- A pane that opens by itself at session start needs a terminal 144 columns wide (110 once you have opened it before). If yours is narrower, a toast tells you, and `/dojo` shows it at any width.
- Close the pane with its close mark or ctrl+x x. That also turns it off for the next session.

| Command | What it does |
| --- | --- |
| `/dojo` | Open or close the dojo |
| `/dojo on`, `/dojo off` | Open or close it explicitly |
| `/dojo stats` | Print your rank, kills, and flurries without opening the pane |

The game plays itself. It has no keys to press.

## How it plays

Real work:

- Each tool call spawns a foe. Codex pods, Gemini stars, and ChatGPT orbs take turns.
- When the call finishes, the samurai dashes in and cuts it down.
- A subagent call spawns a crowned elite that takes two strikes.
- A failed or denied call costs a parried strike first: a clang, a flinch, then the kill.
- Three kills in quick succession draw a gold flurry crescent.
- When Claude finishes a turn, the samurai salutes.

Between calls, the samurai picks the next activity:

- **Meditation:** it sits with the sword laid down, and ki rises around it.
- **Kata:** rising and falling cuts in place.
- **Duels:** a grey ronin walks in. They trade cuts until one clean cut ends it, or both bow.
- **Waves:** a few ChatGPT, Gemini, and Codex foes attack, sometimes led by a crowned captain.

This ambient action is decoration. Only real work counts toward kills and ranks. When a tool call starts, the samurai drops what it is doing, and a dueling ronin runs off.

## Seasons

The season changes every 5 minutes: winter (snow on the floor and a bare tree), cherry blossom (pink petals), summer (fireflies), and autumn (falling red leaves). The farm in Little Harvest uses the same clock, so both show the same season.

## Ranks

Lifetime kills earn ranks, shown by the color of the samurai's headband and sash: Ronin (red), Hatamoto at 100 (blue), Daimyo at 500 (violet), and Shogun at 2,000 (gold).

See the [marketplace README](../../README.md) for configuration, privacy, updates, and removal.
