# Turn 08, correction 1 report

The roster no longer exports a free merger, burial or disbanding operation.
`merge`, `bury` and `disband` resolve owned companies; merging uses configured
capacity. `updateActive` exposes deeply read-only companies. Game retains idle
work selection and investigation decisions, using explicit roster operations
for company mutations, services, Board departure and Expedition advancement.
Expedition calls its supplied `disband` operation, connected to the roster by
Game, at the same wipe point.

Party imports no roster code. The size constants are defined once in Party;
`company-size.ts` and the duplicate `isFull`/`hasRoom` rules are removed. The
single `defaultTownServiceSteps` list factory is used by Game and standalone
service visits; Game contributes roster retirement. Both company-roster
rule-question issues now reference `src/adventurers/company-roster.ts`.

Verification: `pnpm typecheck` passed; `pnpm test` passed 493 tests across
23 files; `git diff --check` passed. The regression snapshot is byte-for-byte
identical (SHA-256
`84469c230e1e08ca637af7dc7bdec70af68e619b7d04a1ef6f04c8899763c39a`).
All 589 existing matchers and their expected values in the five adapted files
are unchanged. No test case was dropped. New ownership tests refuse mutation
of unowned companies and verify configured capacity through hourly views;
compile-time checks prohibit hourly membership, member and status mutation.
Source searches find membership/disbanding writes only inside the roster and
no exported free merger, burial or disbanding function. No requested work is
unfinished. The earlier 150-seed combat sweep belongs to the extraction turn;
this correction was verified with the regression suite.

## Edited tests

### `test/coin-movements.test.ts`

- **records a $cost gp purchase at the $service** — The service call now uses the single default service-list factory with no contributed company action.
- **charges $spent gp for a homecoming from a $gold gp purse (success=$success)** — The Expedition context now registers its company in a roster and supplies roster-owned disbanding.

<!-- test/coin-movements.test.ts: 21 test definitions preserved; 2 bodies/titles changed. -->

### `test/company-roster-interface.test.ts`

- **merges, buries and disbands owned companies through the roster** — The former compatibility-export test now calls owned roster merge, burial and disbanding, with all expected values preserved.

<!-- test/company-roster-interface.test.ts: 20 test definitions preserved; 1 bodies/titles changed. -->

### `test/company-roster.test.ts`

- **four living adventurers are a full company, and the dead do not count** — The readiness checks now call the roster’s configured `isReady` rule.
- **a company has room until six living adventurers, and the dead do not count** — The capacity checks now call the roster’s configured `hasRoom` rule.
- **moves every survivor while the host has room for six** — The merge call now goes through an owned roster and its configured capacity.
- **leaves the fallen with the donor** — The merge call now goes through an owned roster and its configured capacity.
- **brings the donor purse into the host purse** — The merge call now goes through an owned roster and its configured capacity.
- **brings the donor potions into the host pack** — The merge call now goes through an owned roster and its configured capacity.
- **brings the donor finds into the host stash** — The merge call now goes through an owned roster and its configured capacity.
- **keeps the greater renown when the host has $hostRenown and the donor has $donorRenown** — The merge call now goes through an owned roster and its configured capacity.
- **returns the living who do not fit, and not the dead** — The merge call now goes through an owned roster and its configured capacity.
- **a host of six takes nobody** — The merge call now goes through an owned roster and its configured capacity.
- **returns the fallen and leaves the living** — Both burial calls now resolve the company through roster `bury`.

<!-- test/company-roster.test.ts: 69 test definitions preserved; 11 bodies/titles changed. -->

### `test/expedition.test.ts`

Only the shared setup changed: it registers its company in a roster and supplies `context.disband`; every test body and expected value is unchanged. The affected test definitions are listed by name below.

- **reads the road before arriving and reveals the contract** — Its shared setup now supplies roster-owned disbanding.
- **uses one world seed per fight, takes a short rest, and returns after clearing the contract** — Its shared setup now supplies roster-owned disbanding.
- **leaves all possessions before settlement when the company is wiped out** — Its shared setup now supplies roster-owned disbanding.
- **hands a wiped company’s %s to settlement once and resets progress** — Its shared setup now supplies roster-owned disbanding.
- **passes a blessing and the no-retreat rule into the final lair fight** — Its shared setup now supplies roster-owned disbanding.
- **leaves fallen gear on retreat and defers settlement until homecoming** — Its shared setup now supplies roster-owned disbanding.
- **sends survivors home after a defeat with two deaths** — Its shared setup now supplies roster-owned disbanding.
- **abandons an unfinished contract after a costly victory** — Its shared setup now supplies roster-owned disbanding.
- **settles before charging for rooms, then rests back to idle** — Its shared setup now supplies roster-owned disbanding.
- **heads home after a stalemate without leaving loot or settling in the field** — Its shared setup now supplies roster-owned disbanding.
- **retreats after victory with %s of four starting fighters alive at full HP** — Its shared setup now supplies roster-owned disbanding.
- **at $hp% average HP, ends the victory hour $status** — Its shared setup now supplies roster-owned disbanding.
- **shares rounded-down XP among survivors and gives the dead none** — Its shared setup now supplies roster-owned disbanding.
- **reports one company chronicle event when every survivor reaches the same level** — Its shared setup now supplies roster-owned disbanding.
- **names the heroes in the chronicle when only some survivors level up** — Its shared setup now supplies roster-owned disbanding.
- **names the heroes in the chronicle when all survivors level to different levels** — Its shared setup now supplies roster-owned disbanding.
- **passes no-retreat false and no blessing into a non-boss %s fight** — Its shared setup now supplies roster-owned disbanding.
- **accounts for combat potions after a %s outcome** — Its shared setup now supplies roster-owned disbanding.
- **heals first, then shares $potions potions among heroes still Bloodied** — Its shared setup now supplies roster-owned disbanding.
- **uses the default half-HP short rest, rounded up and capped at $maxHp** — Its shared setup now supplies roster-owned disbanding.
- **keeps the supply at zero when a scripted resolver reports excessive consumption** — Its shared setup now supplies roster-owned disbanding.
- **settles an incomplete contract as failed and does not carouse** — Its shared setup now supplies roster-owned disbanding.
- **charges exactly three gold per company level and living member for rooms** — Its shared setup now supplies roster-owned disbanding.
- **beds down in the stables with a %s and makes no payment** — Its shared setup now supplies roster-owned disbanding.
- **spends $spree gold on carousing from $afterRooms gold after rooms** — Its shared setup now supplies roster-owned disbanding.
- **does not carouse because of a %s** — Its shared setup now supplies roster-owned disbanding.
- **reports each resurrection cost at the temple and clears the blessing** — Its shared setup now supplies roster-owned disbanding.
- **reveals exactly one %s piece on success and tries only once per contract** — Its shared setup now supplies roster-owned disbanding.
- **reveals nothing on failure and does not retry** — Its shared setup now supplies roster-owned disbanding.
- **allows a fresh road check for a different contract** — Its shared setup now supplies roster-owned disbanding.
- **makes no check for a fully known contract** — Its shared setup now supplies roster-owned disbanding.
- **rejects an idle company** — Its shared setup now supplies roster-owned disbanding.
- **rejects a %s company with a %s quest** — Its shared setup now supplies roster-owned disbanding.

<!-- test/expedition.test.ts: 33 test definitions preserved; 0 bodies/titles changed. -->

### `test/party.test.ts`

- **takes every donor survivor while there is room for six** — The merge and readiness calls now use an owned roster with the default capacity.

<!-- test/party.test.ts: 4 test definitions preserved; 1 bodies/titles changed. -->

## Added tests

`test/company-roster-ownership.test.ts` adds:

- **refuses merges, burial and disbanding of companies outside the roster before changing them** — Checks refusal before any company changes.
- **uses configured capacity when merging through read-only hourly views** — Checks that an hourly callback invokes the owned merge at the configured limit.
