# Changelog

All notable changes to d20 Town, grouped by the day they landed. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions
follow [Semantic Versioning](https://semver.org/).

## [1.0.0] - Unreleased

Everything below is part of the first release, which has not been tagged yet.

### 2026-09-10

- MIT licence for the project, with battlecast-engine's MIT text and the SRD 5.2
  CC-BY-4.0 attribution reproduced in `THIRD-PARTY-NOTICES.md`.
- `docs/ARCHITECTURE.md`: layers and dependency direction, what each module owns,
  the order of work inside a tick, the party state machine, the engine API the
  combat adapter touches, seeding, and where to add a theme, holding, item or
  renderer.

### 2026-09-08

- Companies of four to six. Merging fills a company up to six; bigger companies
  meet proportionally more monsters and split pay and XP more ways. Survivors
  still short-handed after three days sign on with the first company in town
  that has room.
- Ambushes from the rear: an ambush now either closes in around a surprised side
  caught in a knot, or hits its back line from behind while it stands in
  marching order.
- Surprise costs initiative, not a turn: the surprised side takes 5 off its
  initiative (the 2024 rules' disadvantage, flattened) and acts normally when
  its turn comes.
- Formations: companies deploy with fighters, barbarians, paladins and monks in
  front and everyone else behind; monsters put their cheapest bodies forward and
  their leaders back, or scatter when there are only a couple.
- Who sees whom: chance decides which side spots the other first; that side
  sneaks as a group (Stealth against the other side's best passive Perception,
  half must pass, stat-block values for monsters). Deep in a lair the defenders
  are ever more likely to be the ones watching.
- Quieter log: level-ups, armour, resurrections, deaths and shared-out loot that
  happen to several members at once collapse into one line.

### 2026-09-07

- Lairs behind the raids: two or three lairs per town (crime syndicate, goblin
  warcamp, dragon's roost, necromancer's crypt...), each with a boss, level 5-8.
  Trouble of a lair's kind at a holding is its raid; unanswered raids make it
  stronger, richer and quicker. A company wiped out on a lair's business feeds
  its hoard.
- Lair assaults: the guild posts a standing bounty once a company in town is
  near the lair's level. Three to five fights ending with the boss, no retreat
  from the last one; the hoard, a rare item, renown and a quiet spell for every
  holding that kind of trouble had taken. Some days later something worse moves in.
- Learning about a job: Persuasion DC 15 at the tavern (bards with advantage),
  Survival DC 15 on the road (rangers and druids with advantage), a temple
  divination for the rich, or a round at the tavern for one fact at a time.
- Companies cover the four classic roles (front line, support, skirmisher,
  arcane), so bards, rangers and druids actually show up.
- Contracts of two to six fights, short ones common and long ones rare. Only the
  first fight is public; whatever is still unknown comes out on arrival.
- After a slow day a company stretches one level either way rather than only down.
- Pixel-art proposal kept as inspiration under `design/pixel-art`: a side-view
  street where figures walk on their own errands in town and the company moves
  as one cluster outside, plus a sprite generator.
- Level matching: contracts are posted at the levels of the companies in town,
  never below the greenest; a company only takes work at its own level, or one
  below after a slow day, so veterans stop hoarding the small jobs.
- Magic items go to whoever carries the least.
- Difficulty scale on every encounter's XP budget, tuned with `scripts/tune.ts`
  against whole-town runs rather than single fights.
- Far more monster variety: threat rosters include every SRD monster of the
  matching creature type on top of the curated names, a fey theme for wooded
  holdings, and fights composed as solos, hordes, leader-with-minions or mixed
  packs (about 190 different monsters over a long run instead of 60).
- Scarce magic items sold by real shops (enchanter, temple, smith) that restock
  slowly; each item maps onto engine overrides (AC, +1 weapons, hit points,
  speed, resistances). Contracts occasionally pay in kind.
- A wiped-out company leaves gold and gear on the field for the next company to
  find; retreating companies lose the gear of the fallen.
- Temple blessings (extra hit points for the next contract), an adventurers'
  guild with weekly dues that gates noble and faction contracts, carousing after
  a clean success that raises renown, and retirement: a level 8 adventurer with
  25,000 gp buys a business, becomes an employer and favours their old company.
- Employers with holdings: quest givers own interests (mines, roads, the docks,
  passes, shrines...) and each kind attracts its own threats. A threat stops the
  holding's income and makes the owner post a contract.
- Town economy: employers keep a treasury with daily income and upkeep; a
  retaken holding pays a windfall, an unanswered contract means looters and a
  holding that stays overrun, three days in the red means ruin.
- Coin for adventurers to spend: rooms at the inn, potions from the apothecary,
  armour from the smith (real AC in combat). Every coin lands in the
  shopkeeper's treasury. Idle companies favour reputable employers.
- First playable version: a procedurally generated town (nobles, merchants,
  factions, temple), a quest board with three-encounter contracts, companies of
  four adventurers levelling on 5e XP, temple resurrections and merging of
  broken companies. Combat resolved by battlecast-engine used as a library;
  encounter XP bands calibrated with `scripts/calibrate.ts`. Text-log browser UI
  with Vite.
