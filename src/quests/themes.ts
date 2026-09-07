import { getMonsterByName, type MonsterData } from 'battlecast-engine';

export type ThemeId =
  | 'bandits'
  | 'goblins'
  | 'undead'
  | 'beasts'
  | 'cultists'
  | 'giants'
  | 'monstrosities'
  | 'fiends'
  | 'dragons'
  | 'elementals'
  | 'sea';

export interface Theme {
  id: ThemeId;
  label: string;
  /** SRD monster names, curated for flavour. Unknown names are dropped at load time. */
  monsters: string[];
  /** Places where this kind of trouble shows up. */
  places: string[];
  /** Quest title templates; {place} is substituted. */
  titles: string[];
  /** Minimum party level for a giver to post this theme. */
  minLevel: number;
}

const THEME_LIST: Theme[] = [
  {
    id: 'bandits', label: 'Bandits', minLevel: 1,
    monsters: ['Bandit', 'Bandit Captain', 'Scout', 'Tough', 'Spy', 'Pirate', 'Berserker', 'Veteran', 'Knight', 'Assassin', 'Warrior Veteran', 'Mastiff'],
    places: ['the King’s Road', 'the Old Mill', 'Widow’s Pass', 'the toll bridge', 'the abandoned watchtower', 'the smugglers’ cove'],
    titles: ['Clear the brigands from {place}', 'Recover the stolen cargo at {place}', 'Bounty: the outlaws of {place}', 'Escort the caravan past {place}'],
  },
  {
    id: 'goblins', label: 'Goblinoids', minLevel: 1,
    monsters: ['Goblin Warrior', 'Goblin Boss', 'Hobgoblin', 'Hobgoblin Warrior', 'Bugbear', 'Bugbear Warrior', 'Wolf', 'Dire Wolf', 'Orc', 'Ogre', 'Gnoll', 'Gnoll Warrior'],
    places: ['the Cragmaw caves', 'the burned farmstead', 'the eastern woods', 'the old mine', 'Thistle Hill', 'the quarry'],
    titles: ['Drive the goblins out of {place}', 'Rescue the miners taken to {place}', 'Burn the warcamp at {place}', 'Stop the raids from {place}'],
  },
  {
    id: 'undead', label: 'Undead', minLevel: 1,
    monsters: ['Skeleton', 'Zombie', 'Ghoul', 'Ghast', 'Specter', 'Wight', 'Ghost', 'Mummy', 'Wraith', 'Ogre Zombie', 'Minotaur Skeleton', 'Vampire Spawn', 'Vampire', 'Lich'],
    places: ['the old cemetery', 'the drowned crypt', 'Barrowmere', 'the plague pits', 'the sunken chapel', 'the mausoleum of the Valmonts'],
    titles: ['Lay to rest the dead of {place}', 'Something stirs beneath {place}', 'Consecrate {place}', 'Recover the reliquary from {place}'],
  },
  {
    id: 'beasts', label: 'Wild Beasts', minLevel: 1,
    monsters: ['Wolf', 'Giant Rat', 'Giant Spider', 'Giant Wolf Spider', 'Boar', 'Giant Boar', 'Black Bear', 'Brown Bear', 'Dire Wolf', 'Giant Centipede', 'Swarm of Rats', 'Giant Hyena', 'Lion', 'Tiger', 'Saber-Toothed Tiger', 'Polar Bear', 'Giant Constrictor Snake', 'Owlbear'],
    places: ['the Whisperwood', 'the shepherds’ hills', 'the river bend', 'the hunting grounds', 'the northern thicket', 'the fen'],
    titles: ['Hunt the beasts of {place}', 'Protect the flocks near {place}', 'Track the man-eater of {place}', 'Cull the nest at {place}'],
  },
  {
    id: 'cultists', label: 'Cultists', minLevel: 2,
    monsters: ['Cultist', 'Cultist Fanatic', 'Priest Acolyte', 'Priest', 'Imp', 'Quasit', 'Dretch', 'Druid', 'Mage', 'Hell Hound', 'Bearded Devil', 'Night Hag'],
    places: ['the hidden shrine', 'the cellar of the Red Boar inn', 'the standing stones', 'the salt caves', 'the ruined observatory', 'the ferryman’s house'],
    titles: ['Expose the cult at {place}', 'Break the ritual at {place}', 'Rescue the abducted from {place}', 'Silence the whispers of {place}'],
  },
  {
    id: 'monstrosities', label: 'Monstrosities', minLevel: 2,
    monsters: ['Stirge', 'Cockatrice', 'Harpy', 'Ankheg', 'Mimic', 'Basilisk', 'Displacer Beast', 'Manticore', 'Minotaur', 'Owlbear', 'Werewolf', 'Griffon', 'Phase Spider', 'Ettercap', 'Bulette', 'Chimera', 'Medusa', 'Hydra'],
    places: ['the collapsed bridge', 'the lonely tower', 'the labyrinth of Ur', 'the sinkhole', 'the cliffs of Kell', 'the drowned fields'],
    titles: ['Slay the creature of {place}', 'Something hunts travellers at {place}', 'Clear the lair at {place}', 'Retrieve the survey party from {place}'],
  },
  {
    id: 'giants', label: 'Giants & Trolls', minLevel: 3,
    monsters: ['Ogre', 'Troll', 'Ettin', 'Hill Giant', 'Stone Giant', 'Frost Giant', 'Fire Giant', 'Cloud Giant', 'Storm Giant'],
    places: ['the high pass', 'Thunder Ridge', 'the giant steps', 'the frozen ford', 'the burning mesa', 'the shattered hall'],
    titles: ['Repel the giants at {place}', 'Break the siege of {place}', 'Reclaim {place}', 'A ransom is demanded at {place}'],
  },
  {
    id: 'fiends', label: 'Fiends', minLevel: 4,
    monsters: ['Imp', 'Quasit', 'Dretch', 'Hell Hound', 'Bearded Devil', 'Barbed Devil', 'Nightmare', 'Night Hag', 'Chain Devil', 'Bone Devil', 'Horned Devil', 'Erinyes', 'Nalfeshnee', 'Marilith', 'Balor', 'Pit Fiend'],
    places: ['the Hellgate', 'the pact circle', 'the sealed vault', 'the black chapel', 'the ashen marsh', 'the summoning pit'],
    titles: ['Close the rift at {place}', 'Banish the fiends of {place}', 'The devil’s bargain at {place}', 'Purge {place}'],
  },
  {
    id: 'elementals', label: 'Elementals', minLevel: 4,
    monsters: ['Air Elemental', 'Earth Elemental', 'Fire Elemental', 'Water Elemental', 'Djinni', 'Efreeti', 'Remorhaz', 'Salamander', 'Gargoyle', 'Magmin', 'Azer'],
    places: ['the storm peak', 'the fire caves', 'the flooded temple', 'the elemental scar', 'the glassworks', 'the forge of Ur'],
    titles: ['Quell the storm at {place}', 'Seal the breach at {place}', 'Elemental fury at {place}', 'Rescue the expedition at {place}'],
  },
  {
    id: 'sea', label: 'Sea Raiders', minLevel: 1,
    monsters: ['Sahuagin Warrior', 'Merrow', 'Giant Crab', 'Giant Octopus', 'Reef Shark', 'Hunter Shark', 'Swarm of Piranhas', 'Giant Seahorse', 'Plesiosaurus', 'Water Elemental', 'Dragon Turtle', 'Pirate', 'Bandit'],
    places: ['the harbour', 'the breakwater', 'the fish market', 'the drowned pier', 'the tide caves', 'the lighthouse'],
    titles: ['Something climbs out of the water at {place}', 'Clear {place}', 'Raiders at {place}', 'Recover the cargo sunk at {place}'],
  },
  {
    id: 'dragons', label: 'Dragons', minLevel: 4,
    monsters: ['Brass Dragon Wyrmling', 'Black Dragon Wyrmling', 'Blue Dragon Wyrmling', 'Green Dragon Wyrmling', 'Red Dragon Wyrmling', 'White Dragon Wyrmling', 'Wyvern', 'Young White Dragon', 'Young Black Dragon', 'Young Green Dragon', 'Young Blue Dragon', 'Young Red Dragon', 'Adult White Dragon', 'Adult Blue Dragon', 'Adult Red Dragon', 'Kobold Warrior', 'Guard Drake', 'Dragon Turtle', 'Ancient Red Dragon'],
    places: ['the Scorched Vale', 'Wyrmrest', 'the hoard caves', 'the dragon’s tooth', 'the ashen crater', 'the sky citadel'],
    titles: ['A dragon has been sighted at {place}', 'Recover the hoard of {place}', 'Slay the wyrm of {place}', 'Free {place} from its master'],
  },
];

const RESOLVED = new Map<ThemeId, MonsterData[]>();

export const THEMES: Record<ThemeId, Theme> = Object.fromEntries(THEME_LIST.map((t) => [t.id, t])) as Record<ThemeId, Theme>;
export const THEME_IDS: ThemeId[] = THEME_LIST.map((t) => t.id);

/** Monsters of a theme that actually exist in the engine's SRD data. */
export function themeMonsters(id: ThemeId): MonsterData[] {
  let list = RESOLVED.get(id);
  if (!list) {
    list = [];
    for (const name of THEMES[id].monsters) {
      const m = getMonsterByName(name);
      if (m) list.push(m);
    }
    RESOLVED.set(id, list);
  }
  return list;
}
