# Third-party notices

d20 Town is a thin game layer on top of other people's work. This file
reproduces the notices those works require.

## battlecast-engine

Every die rolled in this game is rolled by [battlecast-engine][repo], a D&D 5e
(2024 SRD) rules and combat-state engine by **Bartosz Jedrzejewski**, extracted
from [BattleCast](https://battlecast.gg). d20 Town uses it as a plain library
(no MCP server involved): the town, the companies and the contracts are ours,
but initiative, attacks, spells, conditions, movement on the grid, the combat AI
and the monster and class data are all the engine's.

- Repository: <https://github.com/bjedrzejewski/battlecast-engine>
- Package: <https://www.npmjs.com/package/battlecast-engine>
- Version depended on: see `battlecast-engine` in [package.json](package.json)

Its license, verbatim from the published package:

```
MIT License

Copyright (c) 2026 Bartosz Jedrzejewski

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## D&D 5.2 SRD

Monster stat blocks, hero classes, spells and the encounter-building thresholds
reach this game through battlecast-engine's data files, which carry this
attribution:

> Portions of the data files derive from the Dungeons & Dragons 5.2 System
> Reference Document ("SRD 5.2") by Wizards of the Coast LLC, available at
> <https://www.dndbeyond.com/srd> and licensed under the Creative Commons
> Attribution 4.0 International License (CC-BY-4.0),
> <https://creativecommons.org/licenses/by/4.0/legalcode>.

The same attribution therefore applies to the monster names, class chassis and
XP thresholds that surface in d20 Town's own code (`src/quests/themes.ts`,
`src/quests/encounters.ts`, `src/adventurers/hero.ts`).

## Build-time dependencies

TypeScript, Vite and Vitest are development dependencies, not shipped in the
bundle. Both are licensed under Apache-2.0 (TypeScript) and MIT (Vite,
Vitest); see `node_modules/<package>/LICENSE` after an install.

[repo]: https://github.com/bjedrzejewski/battlecast-engine
