# Turn 06 — issue 07: apothecary production

Implemented `.scratch/potions-and-short-rest/issues/07-apothecary-production.md` on the current branch, against starting commit `c75fa65`.

Each potion now sinks its independently configured production cost from the apothecary's treasury, then transfers its full selling price from the company's purse using `service`. Multi-potion purchases repeat adjacent pairs and keep the existing single receipt. No adventurer is named and no event occurs between movements. Buying policy, resurrection reserve and log wording are preserved. Every tier remains available while the apothecary is not ruined, even with a treasury in debt; no shelf, production reserve, treasury gate or random draw was added.

`potions.tiers` now requires `productionCost` and `productionTicks`. Defaults are 25 / 100 / 1,000 / 10,000 gp and zero ticks throughout. Both fields are finite, non-negative whole numbers. The service reads ticks; nonzero ticks deliberately leave production instant. The coin table's new `production` reason moves only `spent` and lifetime `goldSpentOnProduction`. The statistic appears in `Game.view().stats`, the Town summary, the statistics bar and the existing tuning report. The configuration, architecture, interface catalogue, domain glossary and changelog match the change. Decisions are under the issue's Comments.

Check results:

| Command or check | Result |
| --- | --- |
| `pnpm typecheck` | Pass, including after the review corrections. Earlier typecheck identified two catalogue fixtures needing the required fields; migrated them. |
| `pnpm test` | Final pass: 34 files passed, 2 skipped; 727 tests passed, 6 skipped (733). First full run found one stale no-production treasury assertion in `test/town-services.test.ts`; corrected its production fixture and literal accounting expectations, then reran. |
| `pnpm test test/coin.test.ts` | Red first: unknown production reason. Green after accounting implementation: 20 passed. |
| `pnpm test test/game-config.test.ts` | Red first: absent fields and validation. Intermediate runs corrected the new integer specification and matched existing validator error wording. Final green: 25 passed. |
| `pnpm test test/apothecary-production.test.ts` | Red first: no production sink; corrected the new game fixture's readiness configuration. Green after service wiring: 7 passed. |
| `pnpm test test/apothecary-production.test.ts test/potion-buying.test.ts test/coin.test.ts test/tune.test.ts` | Pass: 84 tests, before the additional real-game tuning test. |
| `pnpm test test/coin-movements.test.ts` | Pass: 42 tests, including full treasury identities and world conservation with production sinks. |
| `pnpm test test/tune.test.ts` | Pass: 35 tests, including real-game configured production spending printed as 14 gp. |
| `pnpm test test/town-services.test.ts` | Pass: 23 tests after correcting the production accounting assertion. |
| `pnpm build` | Pass. Vite emitted its bundle-size warning; no build errors. |
| `SEEDS=1 SCALES=1.15 TICKS=50 pnpm dlx vite-node scripts/tune.ts` | Pass: prints `goldSpentOnProduction 325`; apothecary treasury at end 1,681 gp. Baseline comparison unavailable as expected for this short sample. Baseline file untouched. |
| `FROM=1 TO=150 HOURS=1500 pnpm dlx vite-node scripts/combat-sweep.ts` | Pass: no crashes in seeds 1–150 for 1,500 hours each (225,000 total hours). |
| Targeted mutations, each followed by the relevant `pnpm test` file(s) | All 11 killed: sale-before-sink; price-derived cost; treasury gate; nonzero-tick delay; each of six production effect flags flipped; service also counting production. Original code restored before final checks. |
| `git diff --check` | Pass. |
| Standards and Spec reviews | Two independent code-review agents against `c75fa65`. Standards: no hard violations or actionable smells. Spec initially found missing UI exposure and stale glossary wording; corrected both. Final review: no remaining findings on either axis. |
| Browser smoke | `pnpm dev --host 127.0.0.1` initially failed with sandbox EPERM; approved retry started Vite. UI automation then reported no browser connector, and access to the available Dia app was denied. The 30-step / four-tab / fastest-speed / difficulty-1.5 browser check could not be completed. |

Regression guard: the six hash tests and their snapshots are unchanged and remain skipped. `scripts/tune-baseline.json` was not re-recorded. Smoke, combat-space seed 75, lairs seed 14, deployment and company roster seeded loops all pass with their original seeds and expectations. Company roster changes add the required statistic to direct coin fixtures only. The economic conservation audit now counts production sinks, and potion treasury expectations include the sink, required by the first and fourth acceptance criteria; no unrelated economic expectation changed.

Acceptance coverage:

| Acceptance criterion | Covering test or check |
| --- | --- |
| Sale sinks production cost first, receives full price second, and nets price minus cost | `test/apothecary-production.test.ts`: “sinks each potion cost before its full sale, with one receipt after both pairs”. Exact intermediate treasury balances -25 / 25 / 0 / 50; actual movement reasons, amounts, statistics and final receipt. |
| `production` moves only `spent` and `goldSpentOnProduction` | `test/coin.test.ts`: “production sinks treasury gold and moves only spent and lifetime production spending”. Starts with nonzero counters and statistics, verifies exact results and unchanged adventurer spending. A transfer through the same public interface exercises the otherwise invisible earned flag. All six flag mutations fail. Other built-in reason tests retain the production statistic at 19. |
| Statistic exposed with other gold statistics and printed by tuning | Every-tier game-view and synchronous receipt assertions in `test/apothecary-production.test.ts`; `test/tune.test.ts`: “prints production spending from a real game purchase with configured cost and ticks”, exact 14 gp after two 7-gp costs and repeated tracker observation. UI reads the same view field in both gold displays; build passes. |
| Every treasury equals opening plus earned minus spent | `test/coin-movements.test.ts`: existing `watchBooks` audit checks every treasury and purse, plus world conservation. Every-tier game-view tests check the -1 opening treasury identity and exact final balances 24 / 99 / 999 / 9,999. |
| Every non-ruined apothecary offers every tier regardless of treasury; no gate/reserve | `test/apothecary-production.test.ts`: four “offers … from a treasury in debt” cases through a real game hour; zero-treasury service purchase; “a ruined apothecary makes and sells nothing even with a wealthy treasury”. Gate mutation fails. Source and docs confirm no production reserve or `reserveDays`. |
| Costs and ticks configurable and validated | `test/game-config.test.ts`: independent costs/ticks, invalid negative/fractional/non-finite values and required fields. Service and real-game tests configure cost 7 at price 50 and ticks 3; deriving cost from price fails both seams. |
| All production ticks default to zero | `test/game-config.test.ts`: exact four default rows in “configures independent production costs and instant production ticks for every tier”. Nonzero-tick tests prove sales remain instant. |
| Six hashes remain skipped, not re-recorded | Empty diff for both regression files and snapshots; final suite reports six skipped. |
| Suite green | Final `pnpm typecheck` and `pnpm test` pass. |

Questions: none. Choices were made and recorded under Comments as instructed.

Bug found, left outside scope under rule 5: `src/sim/config.ts` already accepts fractional potion selling prices while `src/town/coin.ts` requires whole gold pieces. Reproduced with an affordable 1.5-gp basic tier, production cost 7 and ticks 0: configuration resolves successfully, then the production sink completes before the per-potion service transfer throws “A coin movement needs a whole number of gold pieces, not 1.5.” The temporary reproduction script was removed. Price validation/fractional coin support requires separate work; aggregating sales would violate this issue's adjacent per-potion pairs.

Not done: browser smoke, because no connected browser surface was available and native browser access was denied. The referenced `RTK.md` was unavailable in the repository and searched instruction locations. No issue acceptance criterion is left unimplemented. No push; the orchestrator pushes.
