import { aliveMembers, partyLevel, PARTY_SIZE, type Party } from '../adventurers/party';
import { resurrectionCost, type Hero } from '../adventurers/hero';
import { hashString } from '../core/rng';
import { xpToNextLevel } from '../core/xp';
import { describeEncounter } from '../quests/encounters';
import { difficultyCode, type Quest } from '../quests/quest';
import { THEMES } from '../quests/themes';
import { describeEffect } from '../items/items';
import { assetStatusLabel, formatTime, Game, type GameEvent } from '../sim/game';
import { ASSET_KINDS } from '../town/assets';
import { raidInterval } from '../town/lairs';
import { dailyIncome } from '../town/town';

// ------------------------------------------------------------------ setup

const params = new URLSearchParams(location.search);
const seedParam = params.get('seed');
const seed = seedParam ? (Number.isFinite(Number(seedParam)) ? Number(seedParam) : hashString(seedParam)) : Math.floor(Math.random() * 1e9);
const difficultyParam = Number(params.get('difficulty'));
const game = new Game({ seed, ...(difficultyParam > 0 ? { difficultyScale: difficultyParam } : {}) });

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
    <h1>d20 Town · ${esc(game.town.name)}</h1>
    <span class="clock" id="clock"></span>
    <span class="stats" id="stats"></span>
    <div class="controls" id="controls"></div>
  </header>
  <main>
    <section class="log" id="log">
      <div class="toolbar">
        <label><input type="checkbox" id="toggle-combat" checked /> show combat narration</label>
        <span class="muted">seed ${seed} · difficulty ×${game.config.difficultyScale} · <a href="?seed=${seed}&difficulty=${game.config.difficultyScale}" style="color:inherit">permalink</a></span>
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
for (const e of game.events) appendEvent(e);

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
  controlsEl.querySelectorAll<HTMLButtonElement>('button[data-speed]').forEach((b) =>
    b.addEventListener('click', () => setSpeed(Number(b.dataset.speed))),
  );
  controlsEl.querySelector<HTMLButtonElement>('button[data-step]')!.addEventListener('click', () => {
    setSpeed(0);
    tickOnce();
  });
}

// ------------------------------------------------------------------ rendering

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

function appendEvent(e: GameEvent): void {
  const div = document.createElement('div');
  div.className = `event ${e.kind}`;
  let html = `<span class="t">${esc(formatTime(e.tick))}</span>${esc(e.text)}`;
  if (e.detail && e.detail.length > 0) {
    html += `<details><summary>${e.detail.length} combat lines</summary><pre>${esc(e.detail.join('\n'))}</pre></details>`;
  }
  div.innerHTML = html;
  const atBottom = logEl.scrollTop + logEl.clientHeight >= logEl.scrollHeight - 40;
  logEl.appendChild(div);
  while (logEl.children.length > 400) logEl.removeChild(logEl.children[1]!);
  if (atBottom) logEl.scrollTop = logEl.scrollHeight;
}

function hpBar(h: Hero): string {
  if (!h.alive) return `<span class="badge">dead</span>`;
  const pct = Math.round((100 * h.hp) / h.maxHp);
  const cls = pct <= 25 ? 'crit' : pct <= 60 ? 'low' : '';
  return `<span class="hp ${cls}" title="${h.hp}/${h.maxHp}"><i style="width:${pct}%"></i></span> ${h.hp}/${h.maxHp}`;
}

function statusText(p: Party): string {
  const q = game.questById(p.questId);
  switch (p.status) {
    case 'idle':
      return aliveMembers(p).length < PARTY_SIZE ? `waiting for recruits (${p.idleTicks}h)` : 'looking at the board';
    case 'traveling':
      return `on the road to ${q?.place ?? '?'} (${p.ticksLeft}h)`;
    case 'questing':
      return `fighting at ${q?.place ?? '?'} (${p.progress}/${q?.encounters.length ?? '?'})`;
    case 'returning':
      return `returning (${p.ticksLeft}h)`;
    case 'resting':
      return `resting at the inn (${p.ticksLeft}h)`;
    default:
      return p.status;
  }
}

function renderParties(): string {
  const parties = game.activeParties;
  if (parties.length === 0) return `<p class="muted">The tavern is empty. Someone will show up.</p>`;
  return parties
    .map((p) => {
      const rows = p.members
        .map((h) => {
          const next = xpToNextLevel(h.level);
          const xp = next ? `${h.xp}/${next} xp` : 'max';
          const armour = h.armorTier > 0 ? ` <span class="badge" title="armour tier ${h.armorTier}">AC+${h.armorTier}</span>` : '';
          const gear = h.items.map((i) => ` <span class="badge item" title="${esc(describeEffect(i.effect))}">${esc(i.name)}</span>`).join('');
          return `<div class="row ${h.alive ? '' : 'dead'}"><span class="name">${esc(h.name)}${armour}${gear}</span><span>${h.heroClass} ${h.level}</span><span>${hpBar(h)}</span><span title="${xp}">${h.kills}⚔</span></div>`;
        })
        .join('');
      const dead = p.members.filter((m) => !m.alive);
      const bill = dead.length ? `<div class="row"><span>temple bill</span><span class="gold">${dead.reduce((s, h) => s + resurrectionCost(h.level), 0)} gp</span></div>` : '';
      return `<div class="card"><h3><span>${esc(p.name)}</span><span class="status">lvl ${partyLevel(p)} · <span class="gold">${p.gold} gp</span></span></h3>
        <div class="row"><span>${esc(statusText(p))}</span><span>${p.questsDone}✓ ${p.questsFailed}✗</span></div>${rows}${bill}
        <div class="row muted"><span>${p.potions} potion${p.potions === 1 ? '' : 's'}${p.blessed ? ' · blessed' : ''}${p.guildMember ? ' · guild' : ''} · renown ${p.renown}</span><span>earned ${p.earned} · spent ${p.spent}</span></div>
        ${p.stash.length ? `<div class="row muted"><span>stash: ${p.stash.map((i) => esc(i.name)).join(', ')}</span></div>` : ''}</div>`;
    })
    .join('');
}

function questCard(q: Quest): string {
  const giver = game.employerById(q.giverId);
  const known = q.encounters
    .slice(0, q.revealed)
    .map((e, i) => `<div class="row"><span><span class="diff ${e.difficulty}">${i + 1}. ${e.difficulty}</span></span><span>${esc(describeEncounter(e))}</span></div>`)
    .join('');
  const hidden = q.countRevealed
    ? Array.from({ length: q.encounters.length - q.revealed }, (_, i) => `<div class="row muted"><span>${q.revealed + i + 1}. ?</span><span>unknown</span></div>`).join('')
    : q.revealed < q.encounters.length
      ? `<div class="row muted"><span>…</span><span>nobody knows how far it goes</span></div>`
      : '';
  const encs = known + hidden;
  const taker = q.partyId ? game.parties.find((p) => p.id === q.partyId) : null;
  const lair = game.lairById(q.lairId);
  const origin = lair ? `<div class="row muted"><span>${q.kind === 'assault' ? 'assault on' : 'raid out of'} ${esc(lair.name)}</span><span>${q.kind === 'assault' ? `hoard ${lair.hoard.gold} gp` : `strength ${lair.strength}`}</span></div>` : '';
  return `<div class="card ${q.kind}"><h3><span>${q.kind === 'assault' ? '<span class="badge assault">lair</span> ' : ''}${esc(q.title)}</span><span class="status">lvl ${q.level} [${difficultyCode(q)}]</span></h3>${origin}
    <div class="row"><span>${esc(giver?.name ?? '?')} · ${THEMES[q.theme].label}${q.guildOnly ? ' · <span class="badge">guild</span>' : ''}</span><span class="gold">${q.reward} gp${q.itemReward ? ` + <span class="item" title="${esc(describeEffect(q.itemReward.effect))}">${esc(q.itemReward.name)}</span>` : ''}</span></div>
    ${encs}${taker ? `<div class="row"><span class="muted">taken by ${esc(taker.name)}</span></div>` : ''}</div>`;
}

function renderBoard(): string {
  const open = game.openQuests;
  const taken = game.quests.filter((q) => q.status === 'taken');
  return (
    `<h3 class="muted">Open contracts (${open.length})</h3>` +
    (open.length ? open.map(questCard).join('') : `<p class="muted">The board is empty.</p>`) +
    `<h3 class="muted">In progress (${taken.length})</h3>` +
    taken.map(questCard).join('')
  );
}

function renderLairs(): string {
  const lairs = [...game.lairs].sort((a, b) => (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1));
  if (lairs.length === 0) return '';
  return lairs
    .map(
      (l) => `<div class="card lair ${l.status}"><h3><span>${esc(l.name)}</span><span class="status">${l.status === 'active' ? `level ${l.level}` : 'broken'}</span></h3>
      <div class="row"><span>${THEMES[l.theme].label} · ${esc(l.boss)}</span><span>${esc(l.place)}</span></div>
      <div class="row"><span>strength ${l.strength} · raids ${l.raids} (${l.raidsWon} unanswered)</span><span>${l.status === 'active' ? `next raid in ${Math.max(0, l.raidCooldown)}h of ${raidInterval(l)}` : ''}</span></div>
      <div class="row"><span>hoard <span class="gold">${l.hoard.gold} gp</span>${l.hoard.items.length ? ` + ${l.hoard.items.map((i) => esc(i.name)).join(', ')}` : ''}</span><span>${l.questId ? 'bounty posted' : ''}</span></div></div>`,
    )
    .join('');
}

function renderTown(): string {
  const t = game.town;
  const employers = [...t.employers]
    .sort((a, b) => (a.ruined ? 1 : 0) - (b.ruined ? 1 : 0) || b.treasury - a.treasury)
    .map((e) => {
      const assets = e.assets
        .map(
          (a) => `<div class="row asset-${a.status}"><span class="name">${esc(a.name)} <span class="muted">(${ASSET_KINDS[a.kind].label})</span></span><span>${a.incomePerDay} gp/day · <span class="status-${a.status}">${assetStatusLabel(a)}</span></span></div>`,
        )
        .join('');
      const service = e.service ? ` · ${e.service}` : '';
      const net = dailyIncome(e) - e.upkeepPerDay;
      return `<div class="card ${e.ruined ? 'ruined' : ''}"><h3><span>${esc(e.name)}</span><span class="status">${esc(e.title)}${service}</span></h3>
      <div class="row"><span>treasury <span class="gold">${e.treasury} gp</span></span><span>${e.ruined ? 'RUINED' : `${net >= 0 ? '+' : ''}${net} gp/day`}</span></div>
      <div class="row"><span>reputation ${e.reputation} · pays ×${e.generosity}</span><span>${e.questsCompleted}✓ ${e.questsFailed}✗ of ${e.questsPosted}</span></div>
      <div class="row muted"><span>earned ${e.earned}</span><span>spent ${e.spent}</span></div>
      ${assets}
      ${e.stock.map((i) => `<div class="row"><span class="item" title="${esc(describeEffect(i.effect))}">for sale: ${esc(i.name)}</span><span class="gold">${i.price} gp</span></div>`).join('')}
      ${e.assets.some((a) => a.loot.items.length || a.loot.gold) ? `<div class="row muted"><span>something was left behind out there…</span></div>` : ''}</div>`;
    })
    .join('');
  return `<div class="card"><h3><span>${esc(t.name)}</span><span class="status">town</span></h3>
      <div class="row"><span>${game.activeParties.length} companies in town</span><span>${game.stats.partiesArrived} arrived so far</span></div>
      <div class="row"><span>heroes have spent</span><span class="gold">${game.stats.goldSpentByHeroes} gp</span></div>
      <div class="row"><span>contracts expired</span><span>${game.stats.questsExpired}</span></div>
      <div class="row"><span>magic items found / sold</span><span>${game.stats.itemsFound} / ${game.stats.itemsSold}</span></div>
      <div class="row"><span>retired adventurers</span><span>${game.stats.retirements}</span></div>
      <div class="row"><span>raids / lairs broken</span><span>${game.stats.raids} / ${game.stats.lairsCleared}</span></div></div>
    ${renderLairs()}
    ${employers}`;
}

function renderChronicle(): string {
  const items = [...game.chronicle].reverse();
  if (items.length === 0) return `<p class="muted">Nothing worth remembering yet.</p>`;
  return items.map((e) => `<div class="event ${e.kind}"><span class="t">${esc(formatTime(e.tick))}</span>${esc(e.text)}</div>`).join('');
}

function renderPanel(): void {
  const tabs: [typeof tab, string][] = [
    ['parties', `Parties (${game.activeParties.length})`],
    ['board', `Board (${game.openQuests.length})`],
    ['town', 'Town'],
    ['chronicle', 'Chronicle'],
  ];
  tabsEl.innerHTML = tabs.map(([id, label]) => `<button data-tab="${id}" class="${id === tab ? 'active' : ''}">${label}</button>`).join('');
  tabsEl.querySelectorAll<HTMLButtonElement>('button').forEach((b) =>
    b.addEventListener('click', () => {
      tab = b.dataset.tab as typeof tab;
      renderPanel();
    }),
  );
  panelEl.innerHTML =
    tab === 'parties' ? renderParties() : tab === 'board' ? renderBoard() : tab === 'town' ? renderTown() : renderChronicle();
}

function renderAll(): void {
  clockEl.textContent = formatTime(game.tick);
  const s = game.stats;
  statsEl.innerHTML = `<span>quests <b>${s.questsCompleted}</b>/${s.questsCompleted + s.questsFailed}</span><span>gold paid <b>${s.goldPaid}</b></span><span>deaths <b>${s.heroesDied}</b></span><span>raised <b>${s.resurrections}</b></span><span>wiped <b>${s.partiesWiped}</b></span>`;
  renderPanel();
}

renderControls();
renderAll();
setSpeed(speedIndex);
