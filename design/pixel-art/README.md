# Pixel-art proposal (inspiration, not yet built)

Chosen direction: **A, the side-view street**. In town every adventurer walks on
their own errand between the temple, tavern, board, smith, apothecary, enchanter
and guild; past the gate the company marches as one cluster under its banner.
The expedition view follows the company you pick: road, encounters, the way back.

Canvas with the mockups, sprite sheet and the top-down alternative:
https://claude.ai/code/artifact/d2e8d74f-1092-473b-8403-8c4307a0bec2

`gen.mjs` regenerates the artboards from ASCII sprite maps (`node design/pixel-art/gen.mjs`):
8×12 figures with one shared body, four head styles and twelve class colours,
procedural facades, monsters, and the palette from `src/ui/style.css`. Generated
files are ignored by git. The renderer, when it comes, subscribes to `game.onEvent`
and reads `game.parties` / `game.quests` like the text UI does.
