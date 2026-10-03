import { DEFAULT_COMPANY_ROSTER_CONFIG } from '../../src/adventurers/company-roster';
import { DEFAULT_HERO_ECONOMY, type HeroEconomyConfig } from '../../src/adventurers/hero';
import { DEFAULT_JOB_INTEL_CONFIG, type JobIntelConfig } from '../../src/quests/job-intel';
import { DEFAULT_BOARD_CONFIG } from '../../src/sim/board';
import { DEFAULT_EXPEDITION_CONFIG, type ExpeditionConfig } from '../../src/sim/expedition';
import { DEFAULT_TOWN_SERVICE_CONFIG } from '../../src/town/services';

/** The values an expedition receives from the other sections, with the overrides a test names. */
export function expeditionRules(overrides: {
  travelTicks?: number;
  restTicks?: number;
  shortRestHealFraction?: number;
  skillDc?: number;
} = {}): {
  travelTicks: number;
  config: ExpeditionConfig;
  intel: JobIntelConfig;
  renownCap: number;
  blessingHpPerLevel: number;
  companySize: number;
  heroes: HeroEconomyConfig;
} {
  return {
    travelTicks: overrides.travelTicks ?? DEFAULT_BOARD_CONFIG.travelTicks,
    config: {
      ...DEFAULT_EXPEDITION_CONFIG,
      ...(overrides.restTicks === undefined ? {} : { restTicks: overrides.restTicks }),
      ...(overrides.shortRestHealFraction === undefined ? {} : { shortRestHealFraction: overrides.shortRestHealFraction }),
    },
    intel: {
      ...DEFAULT_JOB_INTEL_CONFIG,
      ...(overrides.skillDc === undefined ? {} : { skillDc: overrides.skillDc }),
    },
    renownCap: DEFAULT_COMPANY_ROSTER_CONFIG.renownCap,
    blessingHpPerLevel: DEFAULT_TOWN_SERVICE_CONFIG.blessingHpPerLevel,
    companySize: DEFAULT_COMPANY_ROSTER_CONFIG.companySize,
    heroes: DEFAULT_HERO_ECONOMY,
  };
}
