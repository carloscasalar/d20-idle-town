import {
  Game,
  type GameEvent,
  type GameEventView,
  type GameHeroView,
  type GameLairView,
  type GameQuestView,
  type GameView,
} from '../sim/game';

const params = new URLSearchParams(location.search);
const seedParam = params.get('seed');
const seed = seedParam ? Game.seedFrom(seedParam) : Math.floor(Math.random() * 1e9);
const difficultyParam = Number(params.get('difficulty'));
const game = new Game({ seed, ...(difficultyParam > 0 ? { difficultyScale: difficultyParam } : {}) });
const initialView = game.view();

const SPEEDS: { label: string; ms: number }[] = [
  { label: '⏸', ms: 0 },
  { label: '1x', ms: 1500 },
  { label: '2x', ms: 750 },
  { label: '4x', ms: 300 },
  { label: '16x', ms: 60 },
];
let speedIndex = 1;
let timer: number | null = null;
let showCombat = true;
let tab: 'parties' | 'board' | 'town' | 'chronicle' = 'parties';

const app = document.getElementById('app')!;
app.innerHTML = `
  <header>
    <h1>d20 Town · ${esc(initialView.town.name)}</h1>
    <span class="clock" id="clock"></span>
    <span class="stats" id="stats"></span>
    <div class="controls" id="controls"></div>
  </header>
  <main>
    <section class="log" id="log">
      <div class="toolbar">
        <label><input type="checkbox" id="toggle-combat" checked /> show combat narration</label>
        <span class="muted">seed ${seed} · difficulty ×${initialView.difficultyScale} · <a href="?seed=${seed}&difficulty=${initialView.difficultyScale}" style="color:inherit">permalink</a></span>
      </div>
    </section>
    <aside>
      <div class="tabs" id="tabs"></div>
      <div class="panel" id="panel"></div>
    </aside>
  </main>
`;
const logEl = document.getElementById('log')!;
const panelEl = document.getElementById('panel')!;
const clockEl = document.getElementById('clock')!;
const statsEl = document.getElementById('stats')!;
const controlsEl = document.getElementById('controls')!;
const tabsEl = document.getElementById('tabs')!;

(document.getElementById('toggle-combat') as HTMLInputElement).addEventListener('change', (e) => {
  showCombat = (e.target as HTMLInputElement).checked;
  logEl.classList.toggle('hide-combat', !showCombat);
});

game.onEvent(appendEvent);
for (const event of initialView.events) appendEvent(event);

// ------------------------------------------------------------------ loop

function setSpeed(i: number): void {
  speedIndex = i;
  if (timer !== null) clearInterval(timer);
  timer = null;
  const ms = SPEEDS[i]!.ms;
  if (ms > 0) timer = window.setInterval(tickOnce, ms);
  renderControls();
}

function tickOnce(): void {
  game.step();
  renderAll();
}

function renderControls(): void {
  controlsEl.innerHTML =
    SPEEDS.map((s, i) => `<button data-speed="${i}" class="${i === speedIndex ? 'active' : ''}">${s.label}</button>`).join('') +
    `<button data-step="1">step</button>`;
  controlsEl.querySelectorAll<HTMLButtonElement>('button[data-speed]').forEach((button) =>
    button.addEventListener('click', () => setSpeed(Number(button.dataset.speed))),
  );
  controlsEl.querySelector<HTMLButtonElement>('button[data-step]')!.addEventListener('click', () => {
    setSpeed(0);
    tickOnce();
  });
}

// ------------------------------------------------------------------ rendering

function esc(s: string): string {
  return s.replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

function appendEvent(event: GameEvent | GameEventView): void {
  const div = document.createElement('div');
  div.className = `event ${event.kind}`;
  let html = `<span class="t">${esc(Game.formatTime(event.tick))}</span>${esc(event.text)}`;
  if (event.detail && event.detail.length > 0) {
    html += `<details><summary>${event.detail.length} combat lines</summary><pre>${esc(event.detail.join('\n'))}</pre></details>`;
  }
  div.innerHTML = html;
  const atBottom = logEl.scrollTop + logEl.clientHeight >= logEl.scrollHeight - 40;
  logEl.appendChild(div);
  while (logEl.children.length > 400) logEl.removeChild(logEl.children[1]!);
  if (atBottom) logEl.scrollTop = logEl.scrollHeight;
}

function hpBar(hero: GameHeroView): string {
  if (!hero.alive) return `<span class="badge">dead</span>`;
  const cls = hero.hpPercent <= 25 ? 'crit' : hero.hpPercent <= 60 ? 'low' : '';
  return `<span class="hp ${cls}" title="${hero.hp}/${hero.maxHp}"><i style="width:${hero.hpPercent}%"></i></span> ${hero.hp}/${hero.maxHp}`;
}

function renderParties(view: GameView): string {
  if (view.parties.length === 0) return `<p class="muted">The tavern is empty. Someone will show up.</p>`;
  return view.parties
    .map((party) => {
      const rows = party.members
        .map((hero) => {
          const armour = hero.armorTier > 0 ? ` <span class="badge" title="armour tier ${hero.armorTier}">AC+${hero.armorTier}</span>` : '';
          const gear = hero.items.map((item) => ` <span class="badge item" title="${esc(item.effect)}">${esc(item.name)}</span>`).join('');
          return `<div class="row ${hero.alive ? '' : 'dead'}"><span class="name">${esc(hero.name)}${armour}${gear}</span><span>${hero.heroClass} ${hero.level}</span><span>${hpBar(hero)}</span><span title="${hero.xpText}">${hero.kills}⚔</span></div>`;
        })
        .join('');
      const bill = party.templeBill ? `<div class="row"><span>temple bill</span><span class="gold">${party.templeBill} gp</span></div>` : '';
      return `<div class="card"><h3><span>${esc(party.name)}</span><span class="status">lvl ${party.level} · <span class="gold">${party.gold} gp</span></span></h3>
        <div class="row"><span>${esc(party.statusText)}</span><span>${party.questsDone}✓ ${party.questsFailed}✗</span></div>${rows}${bill}
        <div class="row muted"><span>${party.potions} potion${party.potions === 1 ? '' : 's'}${party.blessed ? ' · blessed' : ''}${party.guildMember ? ' · guild' : ''} · renown ${party.renown}</span><span>earned ${party.earned} · spent ${party.spent}</span></div>
        ${party.stash.length ? `<div class="row muted"><span>stash: ${party.stash.map(esc).join(', ')}</span></div>` : ''}</div>`;
    })
    .join('');
}

function questCard(quest: GameQuestView): string {
  const known = quest.encounters
    .filter((encounter) => encounter.description !== null && encounter.difficulty !== null)
    .map((encounter) => `<div class="row"><span><span class="diff ${encounter.difficulty}">${encounter.number}. ${encounter.difficulty}</span></span><span>${esc(encounter.description!)}</span></div>`)
    .join('');
  const unknown = quest.encounters.filter((encounter) => encounter.description === null);
  const hidden = quest.encounterCountKnown
    ? unknown.map((encounter) => `<div class="row muted"><span>${encounter.number}. ?</span><span>unknown</span></div>`).join('')
    : unknown.length > 0 ? `<div class="row muted"><span>…</span><span>nobody knows how far it goes</span></div>` : '';
  const origin = quest.lair ? `<div class="row muted"><span>${quest.kind === 'assault' ? 'assault on' : 'raid out of'} ${esc(quest.lair.name)}</span><span>${quest.kind === 'assault' ? `hoard ${quest.lair.hoardGold} gp` : `strength ${quest.lair.strength}`}</span></div>` : '';
  const item = quest.itemReward ? ` + <span class="item" title="${esc(quest.itemReward.effect)}">${esc(quest.itemReward.name)}</span>` : '';
  return `<div class="card ${quest.kind}"><h3><span>${quest.kind === 'assault' ? '<span class="badge assault">lair</span> ' : ''}${esc(quest.title)}</span><span class="status">lvl ${quest.level} [${quest.difficultyCode}]</span></h3>${origin}
    <div class="row"><span>${esc(quest.giverName)} · ${quest.themeLabel}${quest.guildOnly ? ' · <span class="badge">guild</span>' : ''}</span><span class="gold">${quest.reward} gp${item}</span></div>
    ${known}${hidden}${quest.partyName ? `<div class="row"><span class="muted">taken by ${esc(quest.partyName)}</span></div>` : ''}</div>`;
}

function renderBoard(view: GameView): string {
  const { open, taken } = view.board;
  return (
    `<h3 class="muted">Open contracts (${open.length})</h3>` +
    (open.length ? open.map(questCard).join('') : `<p class="muted">The board is empty.</p>`) +
    `<h3 class="muted">In progress (${taken.length})</h3>` +
    taken.map(questCard).join('')
  );
}

function renderLairs(lairs: readonly GameLairView[]): string {
  if (lairs.length === 0) return '';
  return lairs
    .map(
      (lair) => `<div class="card lair ${lair.status}"><h3><span>${esc(lair.name)}</span><span class="status">${lair.status === 'active' ? `level ${lair.level}` : 'broken'}</span></h3>
      <div class="row"><span>${lair.themeLabel} · ${esc(lair.boss)}</span><span>${esc(lair.place)}</span></div>
      <div class="row"><span>strength ${lair.strength} · raids ${lair.raids} (${lair.raidsWon} unanswered)</span><span>${lair.status === 'active' ? `next raid in ${lair.nextRaidIn}h of ${lair.raidInterval}` : ''}</span></div>
      <div class="row"><span>hoard <span class="gold">${lair.hoardGold} gp</span>${lair.hoardItems.length ? ` + ${lair.hoardItems.map(esc).join(', ')}` : ''}</span><span>${lair.bountyPosted ? 'bounty posted' : ''}</span></div></div>`,
    )
    .join('');
}

function renderTown(view: GameView): string {
  const employers = view.town.employers
    .map((employer) => {
      const assets = employer.assets
        .map(
          (asset) => `<div class="row asset-${asset.status}"><span class="name">${esc(asset.name)} <span class="muted">(${asset.kindLabel})</span></span><span>${asset.incomePerDay} gp/day · <span class="status-${asset.status}">${asset.statusLabel}</span></span></div>`,
        )
        .join('');
      const service = employer.service ? ` · ${employer.service}` : '';
      return `<div class="card ${employer.ruined ? 'ruined' : ''}"><h3><span>${esc(employer.name)}</span><span class="status">${esc(employer.title)}${service}</span></h3>
      <div class="row"><span>treasury <span class="gold">${employer.treasury} gp</span></span><span>${employer.ruined ? 'RUINED' : `${employer.dailyNet >= 0 ? '+' : ''}${employer.dailyNet} gp/day`}</span></div>
      <div class="row"><span>reputation ${employer.reputation} · pays ×${employer.generosity}</span><span>${employer.questsCompleted}✓ ${employer.questsFailed}✗ of ${employer.questsPosted}</span></div>
      <div class="row muted"><span>earned ${employer.earned}</span><span>spent ${employer.spent}</span></div>
      ${assets}
      ${employer.stock.map((item) => `<div class="row"><span class="item" title="${esc(item.effect)}">for sale: ${esc(item.name)}</span><span class="gold">${item.price} gp</span></div>`).join('')}
      ${employer.assets.some((asset) => asset.hasLoot) ? `<div class="row muted"><span>something was left behind out there…</span></div>` : ''}</div>`;
    })
    .join('');
  return `<div class="card"><h3><span>${esc(view.town.name)}</span><span class="status">town</span></h3>
      <div class="row"><span>${view.parties.length} companies in town</span><span>${view.stats.partiesArrived} arrived so far</span></div>
      <div class="row"><span>heroes have spent</span><span class="gold">${view.stats.goldSpentByHeroes} gp</span></div>
      <div class="row"><span>contracts expired</span><span>${view.stats.questsExpired}</span></div>
      <div class="row"><span>magic items found / sold</span><span>${view.stats.itemsFound} / ${view.stats.itemsSold}</span></div>
      <div class="row"><span>retired adventurers</span><span>${view.stats.retirements}</span></div>
      <div class="row"><span>raids / lairs broken</span><span>${view.stats.raids} / ${view.stats.lairsCleared}</span></div></div>
    ${renderLairs(view.lairs)}
    ${employers}`;
}

function renderChronicle(view: GameView): string {
  const events = [...view.chronicle].reverse();
  if (events.length === 0) return `<p class="muted">Nothing worth remembering yet.</p>`;
  return events.map((event) => `<div class="event ${event.kind}"><span class="t">${esc(Game.formatTime(event.tick))}</span>${esc(event.text)}</div>`).join('');
}

function renderPanel(view: GameView): void {
  const tabs: [typeof tab, string][] = [
    ['parties', `Parties (${view.parties.length})`],
    ['board', `Board (${view.board.open.length})`],
    ['town', 'Town'],
    ['chronicle', 'Chronicle'],
  ];
  tabsEl.innerHTML = tabs.map(([id, label]) => `<button data-tab="${id}" class="${id === tab ? 'active' : ''}">${label}</button>`).join('');
  tabsEl.querySelectorAll<HTMLButtonElement>('button').forEach((button) =>
    button.addEventListener('click', () => {
      tab = button.dataset.tab as typeof tab;
      renderPanel(game.view());
    }),
  );
  panelEl.innerHTML =
    tab === 'parties' ? renderParties(view) : tab === 'board' ? renderBoard(view) : tab === 'town' ? renderTown(view) : renderChronicle(view);
}

function renderAll(): void {
  const view = game.view();
  clockEl.textContent = view.time;
  const stats = view.stats;
  statsEl.innerHTML = `<span>quests <b>${stats.questsCompleted}</b>/${stats.questsCompleted + stats.questsFailed}</span><span>gold paid <b>${stats.goldPaid}</b></span><span>deaths <b>${stats.heroesDied}</b></span><span>raised <b>${stats.resurrections}</b></span><span>wiped <b>${stats.partiesWiped}</b></span>`;
  renderPanel(view);
}

renderControls();
renderAll();
setSpeed(speedIndex);
