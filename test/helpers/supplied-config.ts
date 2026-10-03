import { DEFAULT_HERO_ECONOMY } from '../../src/adventurers/hero';
import { DEFAULT_COMBAT_CONFIG } from '../../src/combat/battlecast';
import { DEFAULT_ENCOUNTER_CONFIG } from '../../src/quests/encounters';
import { DEFAULT_JOB_INTEL_CONFIG } from '../../src/quests/job-intel';
import { DEFAULT_QUEST_CONFIG, type QuestGeneration } from '../../src/quests/quest';
import { DEFAULT_ITEM_CONFIG } from '../../src/items/items';
import { DEFAULT_TOWN_SERVICE_CONFIG } from '../../src/town/services';
import { DEFAULT_TOWN_CONFIG } from '../../src/town/town';

/** The module defaults, passed explicitly wherever a test calls a function that no longer fills them in. */
export const STARTING_GOLD = DEFAULT_HERO_ECONOMY.startingGoldPerLevel;

export const QUEST_GENERATION: QuestGeneration = {
  quests: DEFAULT_QUEST_CONFIG,
  encounters: DEFAULT_ENCOUNTER_CONFIG,
  intel: DEFAULT_JOB_INTEL_CONFIG,
  items: DEFAULT_ITEM_CONFIG,
};

export const COMBAT_RULES = { rules: DEFAULT_COMBAT_CONFIG, heroes: DEFAULT_HERO_ECONOMY };

export const SERVICE_SUPPLIES = {
  services: DEFAULT_TOWN_SERVICE_CONFIG,
  heroes: DEFAULT_HERO_ECONOMY,
  items: DEFAULT_ITEM_CONFIG,
  maxStock: DEFAULT_TOWN_CONFIG.maxStock,
};
