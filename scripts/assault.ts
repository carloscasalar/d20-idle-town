import { DEFAULT_COMPANY_ROSTER_CONFIG } from '../src/adventurers/company-roster';
import { DEFAULT_HERO_ECONOMY, resurrectionCost } from '../src/adventurers/hero';
import { createParty } from '../src/adventurers/party';
import { DEFAULT_POLICIES_CONFIG } from '../src/adventurers/policies';
import { Rng } from '../src/core/rng';
import { Game } from '../src/sim/game';
import { createLair, DEFAULT_LAIR_CONFIG, LAIR_THEMES } from '../src/town/lairs';

const trials = Number(process.env.TRIALS ?? 40);
const scale = Number(process.env.SCALE ?? 1.25);
const rng = new Rng(Number(process.env.SEED ?? 7));
const companySize = DEFAULT_COMPANY_ROSTER_CONFIG.companySize;
const heroes = DEFAULT_HERO_ECONOMY;
/** Hours after which a trial that has not taken its bounty stops with an error. */
const tickLimit = 1_000;

function play(lairLevel: number, companyLevel: number): { cleared: boolean; reachedBoss: boolean; deaths: number } {
  let reachedBoss = false;
  let bountyTaken = false;
  const game = Game.forTesting({
    seed: rng.seed(),
    board: { difficultyScale: scale },
    roster: { maxCompanies: 1 },
    world: { maxOpenQuests: 0 }, // Bounty posting does not read this limit.
  }, (scenario) => {
    const lair = createLair(rng, rng.pick(LAIR_THEMES), lairLevel, scenario.tick, companySize, DEFAULT_LAIR_CONFIG);
    const company = createParty(rng, companyLevel, companySize, scenario.tick, heroes.startingGoldPerLevel, DEFAULT_POLICIES_CONFIG.potionSharing);
    company.gold = resurrectionCost(companyLevel, heroes) + heroes.startingGoldPerLevel * companyLevel;
    scenario.lairs = [lair];
    scenario.parties = [company];
    scenario.quests = [];
  });

  // A bounty's last fight is the boss, reported as "Encounter n/n".
  game.onEvent((event) => {
    const fight = /Encounter (\d+)\/(\d+)/.exec(event.text);
    if (event.kind === 'combat' && fight && fight[1] === fight[2]) reachedBoss = true;
  });

  const pairing = `lair L${lairLevel}, company L${companyLevel}`;
  for (let tick = 0; tick < tickLimit; tick++) {
    game.step();
    const view = game.view();
    if (view.stats.partiesArrived > 0) throw new Error(`Another company entered the trial (${pairing}).`);
    if (view.board.taken.some((quest) => quest.kind === 'assault')) bountyTaken = true;
    const deaths = view.stats.heroesDied;
    if (view.stats.lairsCleared > 0) return { cleared: true, reachedBoss, deaths };
    if (view.stats.partiesWiped > 0) return { cleared: false, reachedBoss, deaths };
    const company = view.parties[0];
    if (company && company.questsFailed > 0) return { cleared: false, reachedBoss, deaths };
  }
  if (!bountyTaken) throw new Error(`Bounty was never taken within ${tickLimit} ticks (${pairing}).`);
  throw new Error(`Expedition did not end within ${tickLimit} ticks (${pairing}).`);
}

for (const level of [5, 6, 8]) {
  for (const partyLevelOffset of [0, 1]) {
    let wins = 0, deaths = 0, reachedBoss = 0;
    const companyLevel = level + partyLevelOffset;
    for (let t = 0; t < trials; t++) {
      const outcome = play(level, companyLevel);
      if (outcome.cleared) wins++;
      if (outcome.reachedBoss) reachedBoss++;
      deaths += outcome.deaths;
    }
    console.log(`lair L${level} vs party L${companyLevel}: cleared ${(100 * wins / trials).toFixed(0)}%  reached boss ${(100 * reachedBoss / trials).toFixed(0)}%  deaths/attempt ${(deaths / trials).toFixed(2)}`);
  }
}
