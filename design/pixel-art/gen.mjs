// Generates the pixel-art proposal artboards (.dc.html) from ASCII sprite maps.
// Run: node design/pixel-art/gen.mjs   (writes Main, Expedition, TopDown, Sprites .dc.html + canvas.json)
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- palette (from src/ui/style.css)
const P = {
  K: '#14121a', k: '#1e1b26', o: '#262233', w: '#3a3450', W: '#4a4364', L: '#5c5478',
  r: '#6e3535', R: '#9a4646', t: '#4a3122', T: '#8a5a3a', y: '#c9a06a',
  g: '#f5d76e', G: '#f0b85a', b: '#7fb2f0', p: '#c59bf0', n: '#7fd68a', e: '#e26a6a',
  s: '#e8b990', h: '#3b2a24', m: '#b8b4c8', d: '#2a2436', M: '#9a92b3',
  f: '#2f5a3a', F: '#3f7a4a', q: '#6b7a4a', Q: '#8a9a5a', x: '#5a9a3a', z: '#3a6a2a',
  u: '#1c1826', U: '#241f33', v: '#2e2744', S: '#3a3357',
};
const CLASS = {
  Barbarian: ['#e26a6a', 'hair'], Bard: ['#c59bf0', 'hair'], Cleric: ['#f5d76e', 'helm'], Druid: ['#7fd68a', 'hood'],
  Fighter: ['#9aa3b8', 'helm'], Monk: ['#f0b85a', 'hair'], Paladin: ['#e8e4f0', 'helm'], Ranger: ['#5f9e6a', 'hood'],
  Rogue: ['#4a4364', 'hood'], Sorcerer: ['#d97ab0', 'hat'], Warlock: ['#8a5ad0', 'hood'], Wizard: ['#7fb2f0', 'hat'],
};

// ---------------------------------------------------------------- sprites
const HEADS = {
  hair: ['..hhhh..', '.hhhhhh.', '.hsssss.', '.hsKssK.'],
  hood: ['..cccc..', '.cccccc.', '.csssssc', '.csKssKc'],
  hat: ['...cc...', '..cccc..', 'cccccccc', '.sKssKs.'],
  helm: ['..mmmm..', '.mmmmmm.', '.msssss.', '.msKssKm'],
};
const BODY = ['..ssss..', '.cccccc.', 'cccccccc', 'c.cccc.c', 's.cccc.s', '..dd.dd.', '..dd.dd.', '..KK.KK.'];
const BODY_STEP = ['..ssss..', '.cccccc.', 'cccccccc', 'c.cccc.c', 's.cccc.s', '.dd..dd.', 'dd....dd', 'KK....KK'];
const hero = (cls, step = false) => ({ rows: [...HEADS[CLASS[cls][1]], ...(step ? BODY_STEP : BODY)], c: CLASS[cls][0] });

const GOBLIN = { rows: ['.xxxx.', 'xKxxKx', 'xxxxxx', '.tttt.', 'ttttttT', '.dd.dd', '.KK.KK'], c: '#5a9a3a' };
const OGRE = {
  rows: [
    '...qqqqqq...', '..qqqqqqqq..', '..qKqqqqKq..', '..qqqqqqqq..', '...qqKKqq...', '.TTTTTTTTTT.', 'TTTTTTTTTTTT',
    'TTqqTTTTqqTT', 'qq.TTTTTT.qq', 'qq.TTTTTT.qq', '...dddddd...', '...dd..dd...', '...dd..dd...', '...KK..KK...',
  ],
  c: '#6b7a4a',
};
const WOLF = { rows: ['........K.', '.......KMK', 'MMMMMMMMMM', 'MMMMMMMMM.', '.M..M.M...', '.K..K.K...'], c: '#9a92b3' };
const BARREL = { rows: ['.TTTT.', 'mTTTTm', 'TTTTTT', 'mTTTTm', 'TTTTTT', '.tttt.'] };
const LAMP = { rows: ['.KKK.', 'KgggK', 'KgggK', '.KKK.', '..K..', '..K..', '..K..', '..K..', '..K..', '..K..', '.KKK.'] };
const TREE = { rows: ['...ffff...', '..ffFFff..', '.ffFFFFff.', 'ffFFFFFFff', 'ffFFFFFFff', '.ffFFFFff.', '..ffffff..', '....tt....', '....tt....', '....tt....'] };
const SIGN = { rows: ['KKKKKKK', 'KgggggK', 'KKKKKKK', '...K...', '...K...'] };
const BOARD = { rows: ['TTTTTTTTTTTT', 'TmmmmmmmmmmT', 'TmggmmggmmmT', 'TmmmmmmmmmmT', 'TmggmmmmggmT', 'TmmmmmmmmmmT', 'TTTTTTTTTTTT', '.T........T.', '.T........T.', '.T........T.'] };
const CART = { rows: ['..TTTTTTT..', '.TTTTTTTTT.', 'TTTTTTTTTTT', '.KK.....KK.', 'KKKK...KKKK', '.KK.....KK.'] };

/** A procedural facade: gabled or flat roof, stone or timber walls, lit windows, a door and a plaque. */
function building({ w, h, roof = 'r', wall = 'w', wallDark = 'k', door = 't', doorX, plaque = 'g', spire = false, chimney = false, windows = 2, roofRows = 6, flat = false }) {
  const rows = [];
  const total = h + roofRows + (spire ? 8 : 0);
  const spireRows = spire ? 8 : 0;
  for (let y = 0; y < spireRows; y++) {
    const half = Math.floor(w / 2);
    const width = Math.max(2, Math.floor((y + 1) * 0.5) * 2);
    let row = '.'.repeat(w).split('');
    for (let x = half - width / 2; x < half + width / 2; x++) row[x] = y === 0 ? 'g' : roof;
    rows.push(row.join(''));
  }
  for (let y = 0; y < roofRows; y++) {
    if (flat) {
      rows.push((y === 0 ? 'K' : roof).repeat(w));
      continue;
    }
    const inset = Math.max(0, Math.floor(((roofRows - 1 - y) / roofRows) * (w / 2)) - 1);
    let row = '.'.repeat(w).split('');
    for (let x = inset; x < w - inset; x++) row[x] = y === roofRows - 1 ? 'K' : roof;
    if (y > 0 && y < roofRows - 1) { row[inset] = 'K'; row[w - 1 - inset] = 'K'; }
    rows.push(row.join(''));
  }
  if (chimney) {
    const cx = w - 6;
    for (let y = 0; y < 4; y++) { const r = rows[spireRows + y].split(''); r[cx] = 'w'; r[cx + 1] = 'w'; rows[spireRows + y] = r.join(''); }
  }
  const dx = doorX ?? Math.floor(w / 2) - 2;
  for (let y = 0; y < h; y++) {
    let row = wall.repeat(w).split('');
    row[0] = 'K'; row[w - 1] = 'K';
    if (y % 6 === 3) for (let x = 1; x < w - 1; x += 5) row[x] = wallDark;
    // windows on the upper band
    if (y >= 2 && y <= 5) {
      const slots = windows;
      for (let i = 0; i < slots; i++) {
        const wx = Math.floor(((i + 1) * w) / (slots + 1)) - 2;
        for (let x = wx; x < wx + 4; x++) row[x] = y === 2 || y === 5 ? 'K' : (x === wx || x === wx + 3 ? 'K' : 'g');
      }
    }
    // plaque above the door
    if (y === h - 9 || y === h - 8) for (let x = dx - 1; x < dx + 5; x++) row[x] = y === h - 9 ? 'K' : plaque;
    if (y === h - 10) for (let x = dx - 1; x < dx + 5; x++) row[x] = 'K';
    // door
    if (y >= h - 7) for (let x = dx; x < dx + 4; x++) row[x] = y === h - 7 || x === dx || x === dx + 3 ? 'K' : door;
    if (y === h - 1) row = row.map((c) => (c === wall || c === wallDark ? 'K' : c));
    rows.push(row.join(''));
  }
  return { rows, w, h: total };
}

const BUILDINGS = {
  temple: building({ w: 36, h: 24, roof: 'W', wall: 'm', wallDark: 'M', door: 'g', plaque: 'g', spire: true, windows: 3, roofRows: 7 }),
  tavern: building({ w: 40, h: 22, roof: 'R', wall: 'T', wallDark: 't', door: 't', plaque: 'G', chimney: true, windows: 3, roofRows: 7 }),
  smith: building({ w: 28, h: 18, roof: 'w', wall: 'W', wallDark: 'w', door: 'e', plaque: 'e', chimney: true, windows: 1, roofRows: 4, flat: true }),
  apothecary: building({ w: 26, h: 20, roof: 'F', wall: 'y', wallDark: 'T', door: 't', plaque: 'n', windows: 2, roofRows: 6 }),
  enchanter: building({ w: 28, h: 26, roof: 'p', wall: 'S', wallDark: 'v', door: 'p', plaque: 'p', spire: true, windows: 2, roofRows: 5 }),
  guild: building({ w: 34, h: 22, roof: 'r', wall: 'w', wallDark: 'k', door: 'b', plaque: 'b', windows: 3, roofRows: 6 }),
  mine: building({ w: 30, h: 16, roof: 'q', wall: 'L', wallDark: 'w', door: 'K', plaque: 'G', windows: 0, roofRows: 3, flat: true }),
};

// ---------------------------------------------------------------- rendering
/** Runs of equal pixels become one rect; colors resolve through the palette, 'c' through the sprite's own color. */
function rects(sprite, ox = 0, oy = 0, color = null) {
  const out = [];
  sprite.rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let x2 = x;
      while (x2 < row.length && row[x2] === ch) x2++;
      if (ch !== '.') {
        const fill = ch === 'c' ? (color ?? sprite.c ?? '#fff') : (P[ch] ?? sprite.c ?? '#f0f');
        out.push(`<rect x="${ox + x}" y="${oy + y}" width="${x2 - x}" height="1" fill="${fill}"/>`);
      }
      x = x2;
    }
  });
  return out.join('');
}
const fill = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
const svg = (w, h, scale, body, extra = '') =>
  `<svg viewBox="0 0 ${w} ${h}" width="${w * scale}" height="${h * scale}" shape-rendering="crispEdges" style="display:block;image-rendering:pixelated${extra}">${body}</svg>`;
const spriteH = (s) => s.rows.length;
const spriteW = (s) => Math.max(...s.rows.map((r) => r.length));

// ---------------------------------------------------------------- scenes
const SKY = 'linear-gradient(#2a2440, #1a1626 60%, #14121a)';

/** The town street: buildings on a cobbled road, each adventurer about their own business. */
function townScene() {
  const W = 360, H = 105, ground = 88;
  let b = '';
  // distant rooftops
  b += fill(0, ground - 46, W, 46, '#1b1728');
  for (let x = -4; x < W; x += 22) b += fill(x, ground - 46 - ((x / 22) % 3) * 4, 16, 50, '#211c31');
  // ground
  b += fill(0, ground, W, H - ground, P.o);
  for (let y = ground; y < H; y += 3) for (let x = (y % 6 === 0 ? 0 : 3); x < W; x += 6) b += fill(x, y, 4, 2, y % 2 ? P.w : P.W);
  b += fill(0, ground, W, 1, P.K);
  // buildings left to right
  const place = (name, x) => { const s = BUILDINGS[name]; b += rects(s, x, ground - s.h); return x + s.w; };
  let x = 6;
  x = place('temple', x); b += rects(LAMP, x + 3, ground - spriteH(LAMP)); x += 12;
  x = place('tavern', x); b += rects(BARREL, x + 1, ground - spriteH(BARREL)); b += rects(BARREL, x + 7, ground - spriteH(BARREL)); x += 16;
  b += rects(BOARD, x, ground - spriteH(BOARD)); x += 20;
  x = place('smith', x); x += 8; b += rects(TREE, x - 2, ground - spriteH(TREE)); x += 10;
  x = place('apothecary', x); x += 10;
  x = place('enchanter', x); b += rects(LAMP, x + 3, ground - spriteH(LAMP)); x += 12;
  x = place('guild', x); x += 8;
  // town gate
  b += fill(x, ground - 30, 4, 30, P.w) + fill(x + 16, ground - 30, 4, 30, P.w) + fill(x, ground - 34, 20, 5, P.W) + fill(x + 4, ground - 29, 12, 1, P.K);
  b += fill(x + 20, ground - 22, 60, 22, P.w) + fill(x + 20, ground - 23, 60, 1, P.W);
  // adventurers, each on their own errand
  const walk = (cls, px, step = false) => { const s = hero(cls, step); b += rects(s, px, ground - spriteH(s) + 1); };
  walk('Cleric', 24); walk('Fighter', 118, true); walk('Rogue', 92); walk('Wizard', 212, true); walk('Druid', 176); walk('Bard', 58, true);
  walk('Barbarian', 244); walk('Paladin', 262, true);
  // a company leaving through the gate, together
  const gx = x + 22;
  walk('Ranger', gx, true); walk('Monk', gx + 7); walk('Warlock', gx + 14, true); walk('Sorcerer', gx + 21);
  b += fill(gx + 10, ground - 20, 1, 9, P.T) + fill(gx + 11, ground - 20, 4, 3, P.e);
  return svg(W, H, 4, b);
}

/** Outside: the road to a holding, the company marching as one, trouble waiting. */
function expeditionScene() {
  const W = 360, H = 105, ground = 84;
  let b = '';
  // hills, three depths
  const hills = (base, amp, c, phase) => { for (let x = 0; x < W; x += 2) { const y = base - Math.round(amp * (0.6 + 0.4 * Math.sin(x / 18 + phase)) * (0.7 + 0.3 * Math.sin(x / 47 + phase * 2))); b += fill(x, y, 2, ground - y, c); } };
  hills(ground - 26, 24, '#1f1a2e', 0); hills(ground - 14, 18, '#262038', 2); hills(ground - 4, 10, '#2f3a2a', 4);
  // road
  b += fill(0, ground, W, H - ground, '#3a3040');
  for (let x = 0; x < W; x += 9) b += fill(x, ground + 6, 5, 1, '#4a3d50');
  b += fill(0, ground, W, 1, P.K);
  // grass edge
  for (let x = 0; x < W; x += 5) b += fill(x, ground - 2, 2, 2, P.z);
  // the mine, cut into the hill on the right
  const mine = BUILDINGS.mine; b += rects(mine, 300, ground - mine.h); b += fill(312, ground - 9, 6, 9, P.K) + fill(311, ground - 10, 8, 1, P.T);
  b += rects(CART, 282, ground - spriteH(CART)); b += rects(TREE, 40, ground - spriteH(TREE)); b += rects(TREE, 150, ground - spriteH(TREE) - 2);
  // the company, four abreast and close
  const walk = (cls, px, dy = 0, step = false) => { const s = hero(cls, step); b += rects(s, px, ground - spriteH(s) + 1 + dy); };
  walk('Fighter', 100, 0, true); walk('Cleric', 108, 2); walk('Rogue', 116, 0, true); walk('Wizard', 124, 2);
  b += fill(112, ground - 21, 1, 9, P.T) + fill(113, ground - 21, 4, 3, P.e);
  // trouble ahead
  b += rects(GOBLIN, 236, ground - spriteH(GOBLIN) + 1); b += rects(GOBLIN, 246, ground - spriteH(GOBLIN) + 3); b += rects(GOBLIN, 226, ground - spriteH(GOBLIN) + 3);
  b += rects(OGRE, 258, ground - spriteH(OGRE) + 1); b += rects(WOLF, 212, ground - spriteH(WOLF) + 1);
  return svg(W, H, 4, b);
}

/** A row of the twelve classes for the sprite sheet. */
function classRow(scale) {
  return Object.keys(CLASS)
    .map((cls) => `<div style="display:flex;flex-direction:column;align-items:center;gap:6px"><div>${svg(8, 12, scale, rects(hero(cls)))}</div><span style="font-family:'Silkscreen',monospace;font-size:10px;color:#9a92b3">${cls}</span></div>`)
    .join('');
}

// ---------------------------------------------------------------- html chrome shared by the artboards
const HEAD = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&display=swap">
  <style>
    body { margin: 0; background: #14121a; color: #e6e1f0; font-family: 'Courier New', ui-monospace, monospace; font-size: 13px; }
    a { color: #f0b85a; } a:hover { color: #f5d76e; }
    .px { font-family: 'Silkscreen', 'Courier New', monospace; }
  </style>
</helmet>`;
const FOOT = `</x-dc>
</body>
</html>`;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const logLine = (kind, t, text) => `<div style="padding:2px 0;border-bottom:1px dotted #2a2636;line-height:1.45;color:${{ combat: '#e6e1f0', quest: '#7fb2f0', party: '#e6e1f0', death: '#e26a6a', reward: '#f5d76e', shop: '#9a92b3', town: '#c59bf0' }[kind]}"><span style="color:#9a92b3;margin-right:8px">${t}</span>${esc(text)}</div>`;
const hpBar = (hp, max) => { const pct = Math.round((100 * hp) / max); const c = pct <= 25 ? '#e26a6a' : pct <= 60 ? '#f0b85a' : '#7fd68a'; return `<span style="display:inline-block;width:70px;height:8px;background:#3a2a2a;border:1px solid #3a3450;vertical-align:middle"><i style="display:block;height:100%;width:${pct}%;background:${c}"></i></span> ${hp}/${max}`; };
const memberRow = (name, cls, lvl, hp, max, scale = 2) =>
  `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;color:#9a92b3"><span style="display:flex;align-items:center;gap:6px;color:#e6e1f0">${svg(8, 12, scale, rects(hero(cls)))}${name}</span><span>${cls} ${lvl}</span><span>${hpBar(hp, max)}</span></div>`;

// ---------------------------------------------------------------- Main: the game screen, town view
const main = `${HEAD}
<div style="width:1440px;height:900px;display:flex;flex-direction:column;background:#14121a;overflow:hidden">
  <div style="display:flex;align-items:center;gap:16px;padding:8px 14px;background:#1e1b26;border-bottom:2px solid #3a3450">
    <span class="px" style="font-size:14px;color:#f0b85a;letter-spacing:1px">d20 Town · Oakcrossing</span>
    <span style="color:#9a92b3">Day 12, 15:00</span>
    <span style="display:flex;gap:12px;color:#9a92b3"><span>quests <b style="color:#e6e1f0">61</b>/74</span><span>gold paid <b style="color:#e6e1f0">28 410</b></span><span>deaths <b style="color:#e6e1f0">19</b></span><span>raised <b style="color:#e6e1f0">6</b></span></span>
    <div style="display:flex;gap:4px;margin-left:auto">
      <span style="padding:4px 10px;border:1px solid #3a3450;background:#262233;color:#e6e1f0">⏸</span>
      <span style="padding:4px 10px;border:1px solid #f0b85a;background:#f0b85a;color:#1a1408">1x</span>
      <span style="padding:4px 10px;border:1px solid #3a3450;background:#262233;color:#e6e1f0">2x</span>
      <span style="padding:4px 10px;border:1px solid #3a3450;background:#262233;color:#e6e1f0">4x</span>
      <span style="padding:4px 10px;border:1px solid #3a3450;background:#262233;color:#e6e1f0">16x</span>
    </div>
  </div>
  <div style="position:relative;height:420px;background:${SKY};border-bottom:2px solid #3a3450;overflow:hidden">
    ${townScene()}
    <div style="position:absolute;left:14px;top:12px;display:flex;flex-direction:column;gap:6px">
      <span class="px" style="font-size:11px;color:#f0b85a;background:#14121acc;padding:4px 8px;border:1px solid #3a3450">OAKCROSSING · in town, everyone goes their own way</span>
      <span class="px" style="font-size:9px;color:#9a92b3;background:#14121acc;padding:4px 8px;border:1px solid #3a3450">hover a figure to see who it is · click a building to open it</span>
    </div>
    <div style="position:absolute;left:44px;top:154px;display:flex;flex-direction:column;align-items:center;gap:2px">
      <span class="px" style="font-size:9px;color:#e6e1f0;background:#14121ad9;padding:3px 6px;border:1px solid #3a3450;white-space:nowrap">Elowen Ashvale · Cleric 3</span>
      <span class="px" style="font-size:8px;color:#9a92b3;background:#14121ad9;padding:2px 6px;border:1px solid #3a3450;white-space:nowrap">resting · praying at the temple</span>
    </div>
    <div style="position:absolute;left:1230px;top:150px;display:flex;flex-direction:column;align-items:center;gap:2px">
      <span class="px" style="font-size:9px;color:#f5d76e;background:#14121ad9;padding:3px 6px;border:1px solid #3a3450;white-space:nowrap">The Crimson Banners set out</span>
      <span class="px" style="font-size:8px;color:#9a92b3;background:#14121ad9;padding:2px 6px;border:1px solid #3a3450;white-space:nowrap">Reopen the silver mine · lvl 3 · I/E/H</span>
    </div>
    <div style="position:absolute;left:0;right:0;bottom:0;display:flex;gap:0;font-size:9px" class="px">
      ${['Temple', 'Tavern', 'Board', 'Smith', 'Apothecary', 'Enchanter', 'Guild', 'Gate'].map((n, i) => `<span style="position:absolute;bottom:6px;left:${[92, 292, 468, 576, 752, 904, 1072, 1214][i]}px;color:#9a92b3;background:#14121acc;padding:2px 5px;border:1px solid #3a3450">${n}</span>`).join('')}
    </div>
  </div>
  <div style="display:grid;grid-template-columns:minmax(0,1fr) 420px;flex:1;min-height:0">
    <div style="padding:8px 12px;overflow:hidden">
      ${logLine('quest', 'Day 12, 13:00', 'Goblinoids threaten the silver mine. Countess Osric Stirling posts a level 3 contract: "Reopen the silver mine" [I/E/H] for 612 gp.')}
      ${logLine('shop', 'Day 12, 13:00', 'Garrick Ironjaw pays Gideon Frostbeard 240 gp for better armour (AC +1).')}
      ${logLine('party', 'Day 12, 14:00', 'The Wayward Foxes take rooms at The Drunken Dragon for 36 gp. They drink 41 gp away telling the tale (renown 4).')}
      ${logLine('quest', 'Day 12, 14:00', 'The Crimson Banners accept "Reopen the silver mine" from Countess Osric Stirling and set out for the silver mine.')}
      ${logLine('reward', 'Day 12, 15:00', 'Order of the Gilded Lanterns return to Oakcrossing. Eamon Farrow pays 395 gp; the Ember road is back in business (+272 gp recovered). Purse: 1 180 gp.')}
      ${logLine('death', 'Day 12, 15:00', 'Isolde Starling (Barbarian 2) of The Grim Crows is left for dead at the Frost watchtower (Hobgoblin Captain, 3x Goblin Warrior).')}
      ${logLine('town', 'Day 12, 15:00', 'Delphine Greycloak’s Curiosities put a Cloak of Protection on the shelf (AC +1, +3 hp) for 1 200 gp.')}
    </div>
    <div style="border-left:2px solid #3a3450;background:#1e1b26;display:flex;flex-direction:column;min-height:0">
      <div style="display:flex;border-bottom:1px solid #3a3450">
        <span style="flex:1;padding:8px 4px;text-align:center;background:#262233;color:#f0b85a;border-right:1px solid #3a3450">Parties (2)</span>
        <span style="flex:1;padding:8px 4px;text-align:center;border-right:1px solid #3a3450">Board (4)</span>
        <span style="flex:1;padding:8px 4px;text-align:center;border-right:1px solid #3a3450">Town</span>
        <span style="flex:1;padding:8px 4px;text-align:center">Chronicle</span>
      </div>
      <div style="padding:10px;display:flex;flex-direction:column;gap:8px">
        <div style="background:#262233;border:1px solid #3a3450;padding:8px;display:flex;flex-direction:column;gap:4px">
          <div style="display:flex;justify-content:space-between;color:#f0b85a"><span>The Crimson Banners</span><span style="color:#9a92b3">lvl 3 · <span style="color:#f5d76e">1 412 gp</span></span></div>
          <div style="display:flex;justify-content:space-between;color:#9a92b3"><span>on the road to the silver mine (2h)</span><span>7✓ 1✗</span></div>
          ${memberRow('Sylvi Longstride', 'Ranger', 3, 28, 28)}
          ${memberRow('Brakk Vane', 'Monk', 3, 24, 24)}
          ${memberRow('Tamsin Starling', 'Warlock', 3, 20, 20)}
          ${memberRow('Yrsa Kestrel', 'Sorcerer', 3, 18, 18)}
          <div style="display:flex;justify-content:space-between;color:#9a92b3"><span>4 potions · blessed · guild · renown 6</span><span>earned 3 980 · spent 2 568</span></div>
        </div>
        <div style="background:#262233;border:1px solid #3a3450;padding:8px;display:flex;flex-direction:column;gap:4px">
          <div style="display:flex;justify-content:space-between;color:#f0b85a"><span>Order of the Gilded Lanterns</span><span style="color:#9a92b3">lvl 2 · <span style="color:#f5d76e">1 180 gp</span></span></div>
          <div style="display:flex;justify-content:space-between;color:#9a92b3"><span>resting at the inn (6h)</span><span>3✓ 0✗</span></div>
          ${memberRow('Elowen Ashvale', 'Cleric', 3, 14, 26)}
          ${memberRow('Garrick Ironjaw', 'Fighter', 2, 9, 20)}
          ${memberRow('Nym Quickfoot', 'Rogue', 2, 16, 16)}
          ${memberRow('Anselm Duskwarden', 'Wizard', 2, 5, 14)}
        </div>
      </div>
    </div>
  </div>
</div>
${FOOT}`;

// ---------------------------------------------------------------- Expedition: outside the walls
const expedition = `${HEAD}
<div style="width:1440px;height:420px;position:relative;background:linear-gradient(#3a2f4a, #2a2440 50%, #1f1a2e);overflow:hidden">
  ${expeditionScene()}
  <div style="position:absolute;left:14px;top:12px;display:flex;flex-direction:column;gap:6px">
    <span class="px" style="font-size:11px;color:#f0b85a;background:#14121acc;padding:4px 8px;border:1px solid #3a3450">THE ROAD TO THE SILVER MINE · outside, the company moves as one</span>
    <span class="px" style="font-size:9px;color:#9a92b3;background:#14121acc;padding:4px 8px;border:1px solid #3a3450">the view follows the company you pick; travel, three encounters, the way back</span>
  </div>
  <div style="position:absolute;left:372px;top:190px;display:flex;flex-direction:column;align-items:center;gap:2px">
    <span class="px" style="font-size:9px;color:#f5d76e;background:#14121ad9;padding:3px 6px;border:1px solid #3a3450;white-space:nowrap">The Crimson Banners · 4/4 · 2 potions left</span>
  </div>
  <div style="position:absolute;left:860px;top:180px;display:flex;flex-direction:column;align-items:center;gap:2px">
    <span class="px" style="font-size:9px;color:#e26a6a;background:#14121ad9;padding:3px 6px;border:1px solid #3a3450;white-space:nowrap">Encounter 1/3 · intermediate · Ogre, 3x Goblin Warrior, Worg</span>
  </div>
  <div style="position:absolute;right:14px;top:12px;display:flex;flex-direction:column;gap:4px;width:300px">
    <div style="background:#14121ad9;border:1px solid #3a3450;padding:6px 8px;display:flex;justify-content:space-between;color:#9a92b3"><span class="px" style="font-size:9px;color:#e6e1f0">travel</span><span class="px" style="font-size:9px;color:#7fd68a">done</span></div>
    <div style="background:#14121ad9;border:1px solid #f0b85a;padding:6px 8px;display:flex;justify-content:space-between;color:#9a92b3"><span class="px" style="font-size:9px;color:#e6e1f0">encounter 1 · intermediate</span><span class="px" style="font-size:9px;color:#f0b85a">now</span></div>
    <div style="background:#14121ad9;border:1px solid #3a3450;padding:6px 8px;display:flex;justify-content:space-between;color:#9a92b3"><span class="px" style="font-size:9px;color:#e6e1f0">encounter 2 · easy</span><span class="px" style="font-size:9px;color:#9a92b3">2x Giant Spider</span></div>
    <div style="background:#14121ad9;border:1px solid #3a3450;padding:6px 8px;display:flex;justify-content:space-between;color:#9a92b3"><span class="px" style="font-size:9px;color:#e6e1f0">encounter 3 · hard</span><span class="px" style="font-size:9px;color:#9a92b3">Bugbear Stalker, 4x Goblin Minion</span></div>
  </div>
  <div style="position:absolute;left:0;right:0;bottom:0;padding:8px 12px;background:#14121ae6;border-top:1px solid #3a3450;font-size:12px;color:#9a92b3;display:flex;flex-direction:column;gap:2px">
    <span><span style="color:#e6e1f0">Sylvi Longstride</span> hits Goblin Warrior 2 with Longbow (17 vs AC 15) for 9 piercing damage!</span>
    <span><span style="color:#e6e1f0">Ogre</span> hits Brakk Vane with Greatclub (14 vs AC 16) for 13 bludgeoning damage!</span>
  </div>
</div>
${FOOT}`;

// ---------------------------------------------------------------- Top-down alternative (low-fi)
function topDownScene() {
  const T = 8, cols = 88, rows = 44; // 704×352 at 2x below
  let b = '';
  b += fill(0, 0, cols, rows, '#2f4a2f');
  for (let y = 0; y < rows; y += 2) for (let x = (y % 4 ? 1 : 0); x < cols; x += 3) b += fill(x, y, 1, 1, '#345334');
  // roads
  b += fill(0, 20, cols, 6, '#4a4364'); b += fill(40, 0, 6, rows, '#4a4364'); b += fill(12, 8, 6, 18, '#4a4364'); b += fill(66, 20, 6, 20, '#4a4364');
  // building footprints: roof rect + door
  const house = (x, y, w, h, roof, label) => { b += fill(x, y, w, h, '#14121a'); b += fill(x + 1, y + 1, w - 2, h - 2, roof); b += fill(x + Math.floor(w / 2) - 1, y + h - 2, 2, 2, '#f5d76e'); labels.push([x + w / 2, y + h / 2, label]); };
  const labels = [];
  house(2, 2, 10, 6, '#b8b4c8', 'Temple'); house(20, 2, 16, 8, '#9a4646', 'Tavern'); house(48, 2, 12, 6, '#4a4364', 'Smith'); house(64, 4, 10, 6, '#3f7a4a', 'Apoth.');
  house(2, 30, 10, 8, '#c59bf0', 'Ench.'); house(20, 30, 14, 8, '#6e3535', 'Guild'); house(50, 30, 12, 8, '#7fb2f0', 'Board'); house(76, 8, 10, 10, '#8a5a3a', 'Gate');
  // people: 2×2 heads with class colours, each on their own path
  const dot = (x, y, c) => { b += fill(x, y, 2, 2, c); b += fill(x, y + 2, 2, 1, '#14121a'); };
  dot(15, 12, CLASS.Cleric[0]); dot(30, 22, CLASS.Fighter[0]); dot(54, 12, CLASS.Rogue[0]); dot(43, 34, CLASS.Wizard[0]); dot(8, 26, CLASS.Druid[0]); dot(24, 15, CLASS.Bard[0]);
  // company leaving by the east road, together
  dot(70, 22, CLASS.Ranger[0]); dot(73, 22, CLASS.Monk[0]); dot(70, 25, CLASS.Warlock[0]); dot(73, 25, CLASS.Sorcerer[0]);
  return { svg: svg(cols, rows, 8, b), labels };
}
const td = topDownScene();
const topdown = `${HEAD}
<div style="width:880px;height:560px;background:#14121a;display:flex;flex-direction:column;gap:12px;padding:16px;box-sizing:border-box">
  <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="px" style="font-size:12px;color:#f0b85a">Direction B · top-down village</span><span style="color:#9a92b3;font-size:12px">low-fi sketch, same palette</span></div>
  <div style="position:relative;width:704px;height:352px;overflow:hidden;border:1px solid #3a3450">
    ${td.svg}
    ${td.labels.map(([x, y, l]) => `<span class="px" style="position:absolute;left:${x * 8}px;top:${y * 8}px;transform:translate(-50%,-50%);font-size:8px;color:#14121a;background:#e6e1f0cc;padding:1px 4px">${l}</span>`).join('')}
    <span class="px" style="position:absolute;left:560px;top:150px;font-size:8px;color:#f5d76e;background:#14121ad9;padding:2px 5px;border:1px solid #3a3450">company leaving, together</span>
  </div>
  <div style="color:#9a92b3;font-size:12px;line-height:1.5;max-width:704px">Zelda-style map. Each adventurer is a coloured head walking the paths between buildings; outside, the same map zooms out to an overworld where the company is one token following the road. Tradeoff: figures are tiny, so class and gear read worse than in the side view, but more of the town fits at once and the outside map can show every holding.</div>
</div>
${FOOT}`;

// ---------------------------------------------------------------- Sprite sheet
const swatch = (name, hex) => `<div style="display:flex;flex-direction:column;gap:4px;align-items:center"><div style="width:36px;height:36px;background:${hex};border:1px solid #3a3450"></div><span style="font-size:10px;color:#9a92b3">${hex}</span><span class="px" style="font-size:8px;color:#e6e1f0">${name}</span></div>`;
const sprites = `${HEAD}
<div style="width:1440px;height:560px;background:#14121a;display:flex;flex-direction:column;gap:18px;padding:20px;box-sizing:border-box">
  <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="px" style="font-size:12px;color:#f0b85a">Sprite sheet · 8×12 px figures · 4 head styles · 12 class colours</span><span style="color:#9a92b3;font-size:12px">every figure is the same body; class = colour + head, so gear and level can add layers later</span></div>
  <div style="display:flex;gap:26px;align-items:flex-end">${classRow(5)}</div>
  <div style="display:flex;gap:28px;align-items:flex-end">
    ${['temple', 'tavern', 'smith', 'apothecary', 'enchanter', 'guild', 'mine'].map((n) => `<div style="display:flex;flex-direction:column;align-items:center;gap:6px">${svg(BUILDINGS[n].w, BUILDINGS[n].h, 3, rects(BUILDINGS[n]))}<span class="px" style="font-size:9px;color:#9a92b3">${n}</span></div>`).join('')}
    <div style="display:flex;gap:16px;align-items:flex-end">
      ${[['goblin', GOBLIN], ['ogre', OGRE], ['worg', WOLF], ['tree', TREE], ['board', BOARD], ['lamp', LAMP]].map(([n, s]) => `<div style="display:flex;flex-direction:column;align-items:center;gap:6px">${svg(spriteW(s), spriteH(s), 3, rects(s))}<span class="px" style="font-size:9px;color:#9a92b3">${n}</span></div>`).join('')}
    </div>
  </div>
  <div style="display:flex;gap:14px;flex-wrap:wrap">
    ${swatch('bg', '#14121a')}${swatch('panel', '#1e1b26')}${swatch('stone', '#3a3450')}${swatch('stone light', '#4a4364')}${swatch('wood', '#8a5a3a')}${swatch('roof', '#9a4646')}${swatch('accent', '#f0b85a')}${swatch('gold', '#f5d76e')}${swatch('green', '#7fd68a')}${swatch('red', '#e26a6a')}${swatch('blue', '#7fb2f0')}${swatch('purple', '#c59bf0')}${swatch('skin', '#e8b990')}${swatch('muted', '#9a92b3')}
  </div>
</div>
${FOOT}`;

// ---------------------------------------------------------------- write
writeFileSync(join(OUT, 'Main.dc.html'), main);
writeFileSync(join(OUT, 'Expedition.dc.html'), expedition);
writeFileSync(join(OUT, 'TopDown.dc.html'), topdown);
writeFileSync(join(OUT, 'Sprites.dc.html'), sprites);
writeFileSync(
  join(OUT, 'canvas.json'),
  JSON.stringify(
    {
      artboards: [
        { file: 'Main.dc.html', x: 0, y: 0, w: 1440, h: 900, title: 'Game screen · in town' },
        { file: 'Expedition.dc.html', x: 0, y: 1040, w: 1440, h: 420, title: 'Outside · the company on the road' },
        { file: 'Sprites.dc.html', x: 0, y: 1600, w: 1440, h: 560, title: 'Sprite sheet & palette' },
        { file: 'TopDown.dc.html', x: 1540, y: 0, w: 880, h: 560, title: 'Direction B · top-down (alternative)' },
      ],
      annotations: [
        { id: 'brief', x: 1540, y: 700, w: 300, text: 'Direction A (left column) is the proposal: a side-view street, like an idle strip. In town every figure walks on its own errand; past the gate the company marches as one cluster under its banner.\n\nDirection B (above) is the alternative: top-down village and overworld.' },
      ],
      launch: { view: 'canvas' },
    },
    null,
    2,
  ),
);
console.log('wrote Main, Expedition, TopDown, Sprites, canvas.json');
