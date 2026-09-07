import { aliveMembers, partyLevel, PARTY_SIZE, type Party } from '../adventurers/party';
import { resurrectionCost, type Hero } from '../adventurers/hero';
import { hashString } from '../core/rng';
import { xpToNextLevel } from '../core/xp';
import { describeEncounter } from '../quests/encounters';
import { difficultyCode, type Quest } from '../quests/quest';
import { THEMES } from '../quests/themes';
import { formatTime, Game, type GameEvent } from '../sim/game';

// ------------------------------------------------------------------ setup

const params = new URLSearchParams(location.search);
const seedParam = params.get('seed');
const seed = seedParam ? (Number.isFinite(Number(seedParam)) ? Number(seedParam) : hashString(seedParam)) : Math.floor(Math.random() * 1e9);
const game = new Game({ seed });

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
        <span class="muted">seed ${seed} · <a href="?seed=${seed}" style="color:inherit">permalink</a></span>
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
      return `fighting at ${q?.place ?? '?'} (${p.progress}/3)`;
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
          return `<div class="row ${h.alive ? '' : 'dead'}"><span class="name">${esc(h.name)}</span><span>${h.heroClass} ${h.level}</span><span>${hpBar(h)}</span><span title="${xp}">${h.kills}⚔</span></div>`;
        })
        .join('');
      const dead = p.members.filter((m) => !m.alive);
      const bill = dead.length ? `<div class="row"><span>temple bill</span><span class="gold">${dead.reduce((s, h) => s + resurrectionCost(h.level), 0)} gp</span></div>` : '';
      return `<div class="card"><h3><span>${esc(p.name)}</span><span class="status">lvl ${partyLevel(p)} · <span class="gold">${p.gold} gp</span></span></h3>
        <div class="row"><span>${esc(statusText(p))}</span><span>${p.questsDone}✓ ${p.questsFailed}✗</span></div>${rows}${bill}</div>`;
    })
    .join('');
}

function questCard(q: Quest): string {
  const giver = game.giverById(q.giverId);
  const encs = q.encounters
    .map((e, i) => `<div class="row"><span><span class="diff ${e.difficulty}">${i + 1}. ${e.difficulty}</span></span><span>${esc(describeEncounter(e))}</span></div>`)
    .join('');
  const taker = q.partyId ? game.parties.find((p) => p.id === q.partyId) : null;
  return `<div class="card"><h3><span>${esc(q.title)}</span><span class="status">lvl ${q.level} [${difficultyCode(q)}]</span></h3>
    <div class="row"><span>${esc(giver?.name ?? '?')} · ${THEMES[q.theme].label}</span><span class="gold">${q.reward} gp</span></div>
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

function renderTown(): string {
  const t = game.town;
  const givers = t.givers
    .map(
      (g) => `<div class="card"><h3><span>${esc(g.name)}</span><span class="status">${esc(g.title)}</span></h3>
      <div class="row"><span>${g.themes.map((id) => THEMES[id].label).join(', ')}</span><span>pays ×${g.wealth}</span></div>
      <div class="row"><span>reputation ${g.reputation}</span><span>${g.questsCompleted}✓ ${g.questsFailed}✗ of ${g.questsPosted}</span></div></div>`,
    )
    .join('');
  return `<div class="card"><h3><span>${esc(t.temple.name)}</span><span class="status">temple</span></h3>
      <div class="row"><span>${esc(t.temple.deity)}</span></div>
      <div class="row"><span>resurrections ${t.temple.resurrections}</span><span class="gold">${t.temple.goldTaken} gp tithed</span></div></div>
    <div class="card"><h3><span>${esc(t.tavern)}</span><span class="status">tavern</span></h3>
      <div class="row"><span>${game.activeParties.length} companies in town</span><span>${game.stats.partiesArrived} arrived so far</span></div></div>
    ${givers}`;
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
