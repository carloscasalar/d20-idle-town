# Turn 13 — your questions, answered

Question 1: what purse does the one Company of the trial carry?
Decision: `resurrectionCost(level, heroes) + heroes.startingGoldPerLevel * level`, both read from `src/adventurers/hero.ts` (1,400 gp at level 5). Do not set the pack by hand; leave `services.steps` at its default.
Why: the arrival purse never passes the game's gate; exactly the resurrection cost leaves the pack always empty, and the brief lists restocking in town among what the old script lacked; a pack set by hand would copy the buying target into the script.

Question 2: is `world.maxOpenQuests: 0` the right way to keep the trial on that Lair's Bounty?
Decision: yes. Add a one-line comment naming the dependency (Bounty posting does not read the limit), and stop a trial with an error after a tick limit if the Bounty is never taken.
Why: the brief defines a trial as that Company's Expedition against the Lair's Bounty; a Contract first would change the Company before the measured Bounty.

Both are recorded in the issue's Comments. Continue the turn with them and finish every acceptance criterion. Since your last message the branch gained `1a983c6` (issue 13, correction 1: `takePotion` is exported again from `src/adventurers/potions.ts`, `potionSharingOf` is private); it does not touch `scripts/`. Replace the report file with the final one.

Done means: `pnpm typecheck` and `pnpm test` pass, and your report follows rule 9.
