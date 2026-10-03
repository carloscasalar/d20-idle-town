import { expect, it } from 'vitest';
import { CompanyRoster, DEFAULT_COMPANY_ROSTER_CONFIG } from '../src/adventurers/company-roster';
import { createParty } from '../src/adventurers/party';
import { killHero } from '../src/adventurers/hero';
import { Rng } from '../src/core/rng';
import { emptyGoldStatistics } from '../src/town/coin';

// Compile-time checks: hourly iteration cannot lend mutable company state.
function hourlyViews(roster: CompanyRoster): void {
  roster.updateActive((company) => {
    // @ts-expect-error Membership cannot change through the hourly callback.
    company.members.push(company.members[0]!);
    // @ts-expect-error A member cannot change through the hourly callback.
    company.members[0]!.level = 20;
    // @ts-expect-error Status cannot change through the hourly callback.
    company.status = 'disbanded';
  });
}
void hourlyViews;

it('refuses merges, burial and disbanding of companies outside the roster before changing them', () => {
  const rng = new Rng(1);
  const host = createParty(rng, 1, 2, 0);
  const outsider = createParty(rng, 1, 2, 0);
  killHero(outsider.members[0]!);
  const roster = new CompanyRoster();
  roster.replaceForScenario([host]);
  const context = { statistics: emptyGoldStatistics() };
  expect(() => roster.merge(host, outsider, context)).toThrow('not in this roster');
  expect(() => roster.merge(outsider, host, context)).toThrow('not in this roster');
  expect(() => roster.bury(outsider)).toThrow('not in this roster');
  expect(() => roster.disband(outsider)).toThrow('not in this roster');
  expect(host.members).toHaveLength(2);
  expect(host.gold).toBe(20);
  expect(outsider.members).toHaveLength(2);
  expect(outsider.gold).toBe(20);
  expect(outsider.status).toBe('idle');
});

it('uses configured capacity when merging through read-only hourly views', () => {
  const rng = new Rng(2);
  const host = createParty(rng, 1, 2, 0);
  const donor = createParty(rng, 1, 3, 0);
  const staying = donor.members.slice(1);
  const roster = new CompanyRoster({ ...DEFAULT_COMPANY_ROSTER_CONFIG, maxCompanySize: 3 });
  roster.replaceForScenario([host, donor]);
  roster.updateActive((company) => {
    if (company.id === host.id) {
      expect(roster.merge(company, roster.byId(donor.id)!, { statistics: emptyGoldStatistics() })).toEqual(staying);
    }
  });
  expect(roster.byId(host.id)!.members).toHaveLength(3);
  expect(roster.byId(donor.id)!.members).toEqual(staying);
});
