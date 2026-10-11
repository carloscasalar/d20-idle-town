# Turn 04b implementation report

The Board now takes plain configuration and dispatches behavior through an
injectable kind table. Contract and Bounty rules retain the same accounting,
random draw order and narrative. A test registers an Escort without changing
Board operations. The Escort entry is defined from scratch and does not write
terminal status or clear references. The Board closes work and releases its
holding/lair links for settlement, expiry and withdrawal; kind entries apply
consequences. Settlement alone releases companies. Expedition starts the
journey; Game takes work, starts the journey, then publishes acceptance in its
single `acceptQuest` method. Subscribers still see the same traveling company
and linked work, including the existing timing of the chronicle append.

Queries expose deeply read-only work. Intelligence changes go through Board
operations, and pure readers accept read-only inputs. Scenario escape hatches
have explicit names and are called only within `Game.forTesting`;
`regressionState` reads `all()`. Expiry refuses missing employers/holdings before
closing or counting a Contract. All three requested architecture documents are
updated, including improvement entry 3.

## Final Board interface

All operations taking context place it last. `ReadonlyQuest` is recursively
read-only, including encounters, monster groups, item rewards and effects.

```ts
new Board(config: DeepReadonly<BoardConfig>, kinds: WorkKinds = WORK_KINDS)
post(kind: QuestKind, terms: WorkPosting, context: BoardContext): ReadonlyQuest
postContract(employer: Employer, holding: Asset, theme: ThemeId, level: number,
             origin: Lair | null, context: BoardContext): ReadonlyQuest
postBounty(lair: Lair, context: BoardContext): ReadonlyQuest
take(company: Party, work: ReadonlyQuest, context: BoardContext): TakenWork
settle(work: ReadonlyQuest, company: Party, success: boolean, context: BoardContext): void
expireContracts(context: BoardContext): void
withdrawOpenWork(employer: Employer, context: BoardContext): void
learnIntel(work: ReadonlyQuest): string
revealAll(work: ReadonlyQuest): void
open(): readonly ReadonlyQuest[]
taken(): readonly ReadonlyQuest[]
byId(id: string | null): ReadonlyQuest | undefined
all(): readonly ReadonlyQuest[]

// Only for Game.forTesting scenario setup:
recordsForScenario(): Quest[]
replaceForScenario(work: Quest[]): void
```

`TakenWork` contains `travelTicks` and `acceptance: BoardEvent`. It contains no
expedition state writer. `startExpedition` belongs to Expedition.

Other exports: `BoardConfig`, `DEFAULT_BOARD_CONFIG`, `BoardContext`,
`BoardLedger`, `BoardEvent`, `WorkPosting`, `WorkContext`, `WorkBehavior`,
`WorkKinds`, `TakenWork`, `Contract`, `Bounty`, and `WORK_KINDS`.
The kind table supplies `create`, `post`, `success`, `failure`, `acceptance`,
optional `expire`, and optional `withdrawOnLairBreak`. No `expire` means the work
does not expire; no withdrawal rule means breaking a lair leaves it open.

`create(kind, terms, context)` receives the selected kind and returns the new
work. `Board.post` does not overwrite it. `post(work, terms, context)` receives
the original posting terms, and Contract/Bounty rules use those exact objects
without re-fetching employers or holdings with non-null assertions. Kind
consequence callbacks receive read-only work, so they cannot assign terminal
status or the company link. Settlement callbacks retain access to mutable item
rewards for the existing transfer to company stashes; query results remain
deeply read-only.

Expiry is prepared in two steps within the Board: the entry validates its
targets and returns a consequence function; the Board closes work, clears its
links and counts expiry, then applies the function. Missing-target refusals
still happen before closure/counting, and event subscribers see the finished
state. The same Board-owned finish operation ends settlement and withdrawal;
terminal state is never an entry's responsibility.

## BoardConfig fields

Only numbers and inclusive `[min, max]` cooldown pairs appear in this object.

| Field | Default |
| --- | --- |
| `windfallDays` | 4 |
| `lootingDays` | 2 |
| `bountyRenown` | 3 |
| `contractRenown` | 1 |
| `failureRenownLoss` | 1 |
| `renownCap` | 10 |
| `reputationGain` | 1 |
| `expiryCooldown` | [4, 10] |
| `failureCooldown` | [2, 8] |
| `pruningThreshold` | 200 |
| `contractOpenTicks` | 72 |
| `travelTicks` | 2 |
| `difficultyScale` | 1.15 |
| `encounterPartySize` | 4 |
| `lairStrengthGain` | 1 |
| `lairStrengthCap` | 10 |

`GameConfig` includes the Board fields except `contractOpenTicks`; the existing
`contractDays` retains its days unit and becomes `24 * contractDays` at Board
construction. Existing `travelTicks` and `difficultyScale` retain their names
and meaning.

### One definition for each shared default

For each of these three values, the chosen option is **defaults built from the
existing constant, with other users reading that constant**:

- `renownCap` defaults from `MAX_RENOWN` in `src/adventurers/party.ts`.
  Expedition's carousing uses the same `MAX_RENOWN` constant.
- `encounterPartySize` defaults from `PARTY_SIZE` in `src/adventurers/party.ts`.
  Game and company helpers already use it; encounter scaling, lair boss
  budgets, and the assault/calibration scripts now use it instead of literal
  copies of 4.
- `lairStrengthCap` defaults from `MAX_STRENGTH` in `src/town/lairs.ts`.
  Lair raid timing uses that same constant.

No two default numbers must be kept equal by hand. Explicit Board overrides
remain local tuning, as permitted by the chosen option. GameConfig structure,
job intelligence ownership and coin movements were not restructured.

## Exact test edit inventory

### test/board.test.ts

The following existing operation tests were edited to use configuration,
parameter-free timing/expiry operations, read-only queries, and immediate
invariant checks after every mutation. Their existing behavioral assertions
remain in place:

- posts a contract and links it to the holding
- refuses a second contract for a holding that has one
- posts a bounty and links it to the lair
- refuses a second bounty on a lair that has one
- a company takes open work and both sides name each other
- refuses work that is not open
- settles a succeeded contract and releases both sides
- settles a failed contract and releases the holding
- refuses to settle work that is not taken
- settles a succeeded bounty, clears the lair, and withdraws its open contracts
- settles a failed bounty and releases the lair
- expires an unanswered contract and releases the holding
- withdraws an employer’s open work and leaves taken work in place

The `world` fixture now accepts non-default configuration and an injected kind
table. It uses `all()` instead of the mutable scenario records. The invariant
helper verifies the four links and their live/terminal states. A holding's
work must not be a Bounty (`assault`), allowing registered kinds such as Escort;
a lair's work must be a Bounty. A raid Contract's incidental `lairId` cannot
make it a valid lair bounty link. The existing test template “holds after every
tick for seed %s” retains its three 400-hour runs for 7, 42 and 20260907.

Added test templates (parameterized cases cover each kind/outcome where shown):

- uses configured windfall days when a Contract restores income
- uses configured looting days when an unanswered Contract expires
- uses Bounty renown and its cap: $before becomes $after
- uses Contract renown and its cap: $before becomes $after
- uses configured reputation gain for a successful %s
- uses configured renown loss for a failed %s
- uses the configured %s cooldown range
- prunes finished records only above the configured threshold and keeps open and taken work
- keeps a Contract open for the configured ticks and never expires a Bounty
- supplies configured travel time while leaving expedition state to Expedition
- uses configured difficulty scale when posting a %s
- budgets a %s for the configured company size
- uses configured lair strength gain and cap on %s
- posts, takes and settles an Escort with success %s
- withdraws an Escort through its registered rule when its lair is broken
- refuses to expire a Contract missing its %s
- reveals intelligence through Board operations and exposes deeply read-only work
- publishes %s acceptance after linking work and starting the journey
- settlement releases the company after $kind $end through Game

Correction 1 adds these test templates in `test/board.test.ts`:

- “rejects a %s” (Lair naming a raid Contract; Holding naming a Bounty): proves
  the restored kind checks reject both invalid relationships.
- “posts a Contract using the supplied employer and Holding objects”: proves
  the posting rule uses the original objects rather than canonical ID lookups.
- “posts a Bounty using the supplied guild and Lair objects”: the corresponding
  Bounty posting check.
- “closes and unlinks an expired Escort even when its expiry consequences do
  nothing”: proves the Board owns status, reference release and expiry count.
- “releases a Lair link when an independent Bounty entry omits release
  consequences”: proves common Board settlement releases a lair even without
  that action in the entry.

Correction 1 also edits “posts, takes and settles an Escort with success %s”
and “withdraws an Escort through its registered rule when its lair is broken”
through their shared entry: it now defines creation, posting, success, failure,
acceptance, optional expiry and withdrawal from scratch. It never spreads or
calls a built-in Contract/Bounty entry. Its settlement and withdrawal rules
apply only consequences and omit terminal status and link release, so these
checks exercise Board ownership. The read-only intelligence/query test also
checks at compile time that kind consequences cannot assign work status or
company links. The invariant helper runs after every operation and every tick
of the existing three 400-hour runs. No tests were deleted in this correction.

These additions cover every configuration field, a third kind's ordinary
lifecycle and lair withdrawal, expiry refusals, compile-time query immutability,
intelligence writes, Game acceptance subscriber state, and Game settlement
release on both wipes and homecomings. No tests count RNG calls or spy on Board
internals.

### test/expedition.test.ts

- Renamed/edited “releases the company’s %s and encounter progress when it is
  wiped out” to “hands a wiped company’s %s to settlement once and resets
  progress” (Contract and Bounty cases). The stub verifies exactly one handoff,
  the correct work/company/outcome and reset progress. It no longer clears or
  asserts the Board-owned reference or writes the work's status.
- Edited “settles before charging for rooms, then rests back to idle”. Removed
  the assertion that the reference is already cleared inside settlement; added
  exactly-one settlement and reset-progress assertions. Rooms/rest ordering is
  unchanged.
- Edited “allows a fresh road check for a different contract” only to provide
  intelligence callbacks for the replacement work. The shared setup fixture
  also supplies those callbacks for its own mutable scenario work. All road
  intelligence expectations are unchanged.

### test/contract-lifecycle.test.ts

Deleted only “an expired Contract missing its %s is still closed and counted”
(two cases: employer and Holding), as explicitly requested. The replacement
Board test refuses both impossible states. No other lifecycle test was edited.

`test/contract-ruin.test.ts`, `test/lairs.test.ts`, all other test files, and the
regression snapshot are unchanged.

## Verification and remaining work

- `pnpm typecheck`: passed.
- `pnpm test`: passed, 324 tests across 15 files.
- `git diff --check`: passed.
- Regression snapshot: no diff; byte-for-byte identical SHA-256 before/after:
  `76b408738e20921bb37d66952cabe61799593c2be08aabf314f3775ffae3a468`.
- Requested refactor and all four correction items: complete. No commit or
  push made by the implementing agent. The previous turn was committed by the
  orchestrator as `091a2c8`.
- The supplied `@RTK.md` reference was absent from the repository root and the
  checked parent/home locations, so that ancillary file could not be read.
