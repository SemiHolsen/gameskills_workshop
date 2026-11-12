const PAL = {
  o: '#1b1030', G: '#1f6b4e', g: '#3fb27c', l: '#86e6b0',
  b: '#f6e3a3', B: '#d9b878', f: '#ff86b0', F: '#d94f8a', D: '#8f2a6a',
  y: '#ffd23f', Y: '#e0a21a', h: '#fff6d8', H: '#d9b878',
  r: '#ff5d73', R: '#b03a50', p: '#ff9aa8',
  n: '#c98a4a', N: '#6b4220', k: '#07040f', w: '#8ff3ff', x: '#ffffff',
  t: '#e6b07a', T: '#c98a4a', E: '#8f5a2a',
  m: '#d09a62', M: '#a8703d', V: '#7a4a24',
  a: '#ffb02e', A: '#e0771a',
  q: '#f0a463', Q: '#c8743a', P: '#8a4a22',
  s: '#e4e9f5', S: '#9aa5c4', Z: '#4a5380',
  c: '#3ee6c4', C: '#1fa88e', e: '#ff4a3d', u: '#3e6bff', U: '#2a3fa8',
  '1': '#ffe38a'
};
const L = [-0.55, -0.75];

function Canvas(W, H, OX = 0, OY = 0) {
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  const T = t => (typeof t === 'string' ? [t, t, t] : t);
  function shape(test, tones, center, rad, on) {
    tones = T(tones);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!test(x + 0.5, y + 0.5)) continue;
      if (on && !on.includes(g[y][x])) continue;
      let t = tones[1];
      if (center) {
        const u = ((x + 0.5) - center[0]) / rad[0], v = ((y + 0.5) - center[1]) / rad[1], d = u * L[0] + v * L[1];
        if (d < -0.42) t = tones[0]; else if (d > 0.42) t = tones[2];
      }
      g[y][x] = t;
    }
  }
  const c = { g, W, H };
  c.ell = (cx, cy, rx, ry, tones, o = {}) => {
    cx += OX; cy += OY;
    shape((x, y) => Math.pow((x - cx) / rx, 2) + Math.pow((y - cy) / ry, 2) <= 1, tones, [cx, cy], [rx, ry], o.on);
  };
  function inPoly(p, x, y) {
    let r = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const [xi, yi] = p[i], [xj, yj] = p[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) r = !r;
    }
    return r;
  }
  c.poly = (pts, tones, o = {}) => {
    pts = pts.map(p => [p[0] + OX, p[1] + OY]);
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    const rx = Math.max(...pts.map(p => Math.abs(p[0] - cx))) || 1, ry = Math.max(...pts.map(p => Math.abs(p[1] - cy))) || 1;
    shape((x, y) => inPoly(pts, x, y), tones, [cx, cy], [rx, ry], o.on);
  };
  c.rect = (x, y, w, h, tones) => c.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], tones);
  c.line = (x0, y0, x1, y1, r0, r1, tones) => {
    x0 += OX; x1 += OX; y0 += OY; y1 += OY; tones = T(tones);
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2), set = new Set();
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, r = r0 + (r1 - r0) * t;
      for (let yy = Math.floor(y - r); yy <= Math.ceil(y + r); yy++) for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++)
        if (Math.hypot(xx + 0.5 - x, yy + 0.5 - y) <= r) set.add(xx + ',' + yy);
    }
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, R = Math.max(r0, r1) + 1;
    set.forEach(k => {
      const [xx, yy] = k.split(',').map(Number);
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) return;
      const d = ((xx + 0.5 - mx) / (Math.abs(x1 - x0) / 2 + R)) * L[0] + ((yy + 0.5 - my) / (Math.abs(y1 - y0) / 2 + R)) * L[1];
      g[yy][xx] = d < -0.3 ? tones[0] : d > 0.3 ? tones[2] : tones[1];
    });
  };
  c.px = (x, y, ch) => { x += OX; y += OY; if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = ch; };
  c.outline = (col = 'o') => {
    const out = g.map(r => r.slice());
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (g[y][x] !== '.') continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const yy = y + dy, xx = x + dx;
        if (yy >= 0 && xx >= 0 && yy < H && xx < W && g[yy][xx] !== '.') { out[y][x] = col; break; }
      }
    }
    for (let y = 0; y < H; y++) g[y] = out[y];
    return c;
  };
  return c;
}
function rects(c) {
  let out = '';
  for (let y = 0; y < c.H; y++) {
    let x = 0;
    while (x < c.W) {
      const ch = c.g[y][x];
      if (ch === '.' || !PAL[ch]) { x++; continue; }
      let e = x; while (e + 1 < c.W && c.g[y][e + 1] === ch) e++;
      out += '<rect x="' + x + '" y="' + y + '" width="' + (e - x + 1) + '" height="1" fill="' + PAL[ch] + '"/>';
      x = e + 1;
    }
  }
  return out;
}
const ANGER = [[1, 1, 2, 1], [1, 2, 1, 1], [4, 1, 2, 1], [5, 2, 1, 1], [1, 5, 1, 1], [1, 6, 2, 1], [5, 5, 1, 1], [4, 6, 2, 1]].map(([x, y, w, h]) => [x + 2, y + 2, w, h, 'e']);
function ov(list, OX = 8, OY = 8) {
  const a = list.map(([x, y, w, h, ch]) => '<rect x="' + (x + OX) + '" y="' + (y + OY) + '" width="' + w + '" height="' + h + '" fill="' + PAL[ch] + '"/>').join('');
  const b = ANGER.map(([x, y, w, h, ch]) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + PAL[ch] + '"/>').join('');
  return a + b;
}

const S = {}, C = {};
const W = 76, H = 76, OX = 8, OY = 8;

// ---------- DINO
(function () {
  const c = Canvas(W, H, OX, OY);
  c.line(22, 46, 12, 52, 6, 4, ['g', 'g', 'G']); c.line(12, 52, 4, 53, 4, 1.8, ['g', 'g', 'G']);
  c.ell(24, 54, 5.5, 8, ['g', 'g', 'G']); c.ell(39, 54, 5.5, 8, ['g', 'g', 'G']);
  c.ell(26, 60, 9, 3.6, ['y', 'y', 'Y']); c.ell(42, 60, 9, 3.6, ['y', 'y', 'Y']);
  c.ell(31, 40, 15, 14, ['l', 'g', 'G']); c.ell(36, 45, 8, 9, ['b', 'b', 'B'], { on: ['g', 'l', 'G'] });
  c.ell(38, 28, 9, 8, ['l', 'g', 'G']);
  for (let a = 105; a <= 265; a += 22) { const r = a * Math.PI / 180; c.ell(37 + 15 * Math.cos(r), 15 - 16 * Math.sin(r), 3.2, 3.2, 'y'); }
  c.ell(37, 15, 14, 15, ['y', 'y', 'Y']); c.ell(37, 15, 11.5, 12.5, ['f', 'F', 'D']);
  [[31, 10], [36, 7], [30, 17], [35, 21], [41, 10]].forEach(([x, y]) => c.ell(x, y, 1.8, 1.8, 'y'));
  c.ell(45, 21, 10, 8.5, ['l', 'g', 'G']);
  c.poly([[44, 13], [49, 17], [63, 5]], ['h', 'h', 'H']); c.poly([[40, 12], [45, 16], [58, 2]], 'H');
  c.ell(53, 24, 6, 4.5, ['b', 'b', 'B']); c.poly([[56, 18], [60, 22], [62, 16]], ['h', 'h', 'H']); c.ell(58, 26, 3, 3, ['y', 'y', 'Y']);
  c.ell(48, 20.5, 6, 3.3, 'k'); c.line(42, 19.5, 36, 19, 0.7, 0.7, 'k');
  [[46, 19], [47, 19], [46, 20], [51, 21]].forEach(([x, y]) => c.px(x, y, 'w'));
  c.line(34, 43, 61, 33, 2.6, 2.6, 'o'); c.line(34, 43, 61, 33, 1.7, 1.7, ['n', 'n', 'N']);
  c.poly([[59, 29], [66, 27], [67, 33], [60, 36]], 'N'); [[61, 27], [64, 26], [66, 29]].forEach(([x, y]) => c.px(x, y, 'x'));
  c.ell(26, 44, 11.5, 9, ['p', 'r', 'R']); c.ell(22, 41, 5, 3.5, ['p', 'p', 'r'], { on: ['p', 'r', 'R'] }); c.ell(28, 45, 2.6, 2.6, 'k');
  c.line(36, 32, 22, 37, 1, 1, ['y', 'y', 'Y']);
  c.line(37, 36, 45, 39, 2.4, 2.2, ['l', 'g', 'G']); c.ell(48, 38.5, 2.6, 2.6, ['l', 'l', 'g']);
  c.line(28, 36, 30, 42, 2.4, 2.4, ['l', 'g', 'G']); c.ell(30, 43, 2.6, 2.6, ['l', 'l', 'g']);
  c.outline();
  S.dino = rects(c); C.dino = c;
  S.dino_angry = ov([[46, 19, 2, 1, 'e'], [46, 20, 1, 1, 'e'], [51, 21, 1, 1, 'e'], [42, 14, 3, 2, 'o'], [45, 15, 3, 2, 'o'], [48, 16, 3, 2, 'o'], [51, 17, 3, 2, 'o']]);
})();

// ---------- DOG (drummer on pipes)
(function () {
  const c = Canvas(W, H, 8, 4); const tan = ['t', 'T', 'E'];
  c.line(20, 48, 13, 41, 3.2, 2.2, tan); c.line(13, 41, 11, 33, 2.2, 1.6, tan);
  c.ell(31, 42, 13, 13, tan); c.ell(35, 46, 7, 8, ['b', 'b', 'B'], { on: ['t', 'T', 'E'] });
  c.ell(45, 24, 10, 9, tan);
  c.ell(47, 19.5, 4, 4, 'E');
  c.ell(39, 26, 4.5, 8.5, 'N');
  c.ell(54, 28, 7, 5, ['b', 'b', 'B']);
  c.ell(57, 33, 2.2, 3, ['f', 'F', 'F']);
  c.ell(60, 25.5, 2.4, 2, 'k');
  c.ell(50.5, 21.5, 2.6, 2.6, 'x'); [[50, 21], [51, 21], [50, 22], [51, 22]].forEach(([x, y]) => c.px(x, y, 'k'));
  c.line(36, 17, 56, 17.5, 1.4, 1.4, ['r', 'r', 'R']); c.line(37, 17, 31, 20, 1.2, 0.8, 'r'); c.line(37, 17, 32, 14, 1, 0.6, 'r');
  c.poly([[20, 50], [44, 50], [44, 66], [20, 66]], ['q', 'Q', 'P']);
  c.line(20, 56, 44, 56, 0.7, 0.7, 'P'); c.line(20, 62, 44, 62, 0.7, 0.7, 'P');
  c.ell(32, 50, 12, 3.8, ['s', 's', 'S']); c.ell(32, 50, 9.5, 2.5, 'Z');
  c.poly([[46, 54], [66, 54], [66, 68], [46, 68]], ['q', 'Q', 'P']);
  c.line(46, 60, 66, 60, 0.7, 0.7, 'P');
  c.ell(56, 54, 10, 3.2, ['s', 's', 'S']); c.ell(56, 54, 7.5, 2, 'Z');
  [[22, 53], [42, 53], [48, 57], [64, 57]].forEach(([x, y]) => c.px(x, y, 'x'));
  c.line(35, 38, 47, 46, 2.4, 2.2, tan); c.ell(48, 46, 2.6, 2.6, ['t', 't', 'T']); c.line(48, 46, 61, 34, 0.8, 0.8, 'h'); c.px(61, 33, 'x'); c.px(62, 33, 'x');
  c.line(29, 40, 39, 47, 2.4, 2.2, tan); c.ell(40, 47.5, 2.5, 2.5, ['t', 't', 'T']); c.line(40, 47, 49, 38, 0.8, 0.8, 'h'); c.px(49, 37, 'x');
  c.outline();
  S.dog = rects(c); C.dog = c;
  S.dog_angry = ov([[46, 15, 3, 2, 'o'], [49, 16, 3, 2, 'o'], [52, 17, 3, 2, 'o'], [50, 21, 2, 1, 'e']], 8, 4);
})();

// ---------- CAPYBARA (synth)
(function () {
  const c = Canvas(W, H, 1, 6); const fur = ['m', 'M', 'V'];
  c.line(28, 54, 26, 67, 1.1, 1.1, 'Z'); c.line(64, 54, 66, 67, 1.1, 1.1, 'Z');
  c.ell(33, 42, 17, 13, fur); c.ell(36, 46, 9, 7, ['m', 'm', 'M'], { on: ['M', 'V'] });
  c.ell(51, 27, 9.5, 8, fur);
  c.ell(59, 30, 7, 6.5, ['m', 'M', 'V']); c.rect(55, 26, 10, 8, ['m', 'M', 'V']);
  c.ell(64, 28.5, 2.4, 2, 'k'); [[56, 34], [57, 34], [58, 34], [59, 34]].forEach(([x, y]) => c.px(x, y, 'V'));
  c.ell(53, 24, 1.9, 1.9, 'k'); c.px(52, 23, 'x');
  c.ell(44, 21, 2.8, 2.8, fur); c.ell(44, 21, 1.3, 1.3, 'V');
  c.ell(50, 16, 4.3, 4, ['a', 'a', 'A']); c.px(49, 12, 'g'); c.px(50, 12, 'g'); c.px(51, 11, 'G'); c.px(48, 13, 'G');
  c.poly([[16, 46], [74, 46], [74, 58], [16, 58]], 'Z');
  c.rect(16, 46, 58, 4, ['S', 'S', 'Z']);
  [[20, 48, 'y'], [24, 48, 'f'], [28, 48, 'c'], [60, 48, 'c'], [64, 48, 'y'], [68, 48, 'f']].forEach(([x, y, ch]) => { c.px(x, y, ch); c.px(x + 1, y, ch); });
  for (let x = 17; x <= 70; x += 4) c.rect(x, 51, 3, 7, 's');
  for (let i = 0, x = 19; x <= 70; x += 4, i++) if ([0, 1, 3, 4, 5].includes(i % 7)) c.rect(x + 1, 51, 2, 4, 'k');
  c.line(40, 40, 49, 46, 3, 2.8, fur); c.line(46, 40, 58, 45, 3, 2.8, fur);
  c.ell(49, 46.5, 3, 2.4, ['m', 'm', 'M']); c.ell(59, 46, 3, 2.4, ['m', 'm', 'M']);
  c.ell(67, 17, 1.7, 1.3, 'c'); c.line(68.5, 17, 68.5, 10, 0.5, 0.5, 'c'); c.px(69, 10, 'c'); c.px(70, 11, 'c');
  c.ell(7, 30, 1.7, 1.3, 'c'); c.line(8.5, 30, 8.5, 23, 0.5, 0.5, 'c'); c.px(9, 23, 'c'); c.px(10, 24, 'c');
  c.outline();
  S.capy = rects(c); C.capy = c;
  S.capy_angry = ov([[49, 20, 3, 2, 'o'], [52, 21, 3, 2, 'o'], [55, 22, 3, 2, 'o'], [52, 24, 2, 1, 'e']], 1, 6);
})();

// ---------- ICONS (20x20)
(function () {
  let c = Canvas(20, 20);
  c.line(9, 12, 17, 5, 1.2, 1.2, ['n', 'n', 'N']); c.poly([[16, 2], [19, 1], [19, 5], [17, 6]], 'N');
  c.ell(7, 13, 6, 5, ['p', 'r', 'R']); c.ell(7, 13, 1.5, 1.5, 'k'); c.outline(); S.i_guitar = rects(c);
  c = Canvas(20, 20);
  c.poly([[3, 8], [17, 8], [17, 18], [3, 18]], ['r', 'r', 'R']); c.line(3, 11, 17, 11, 0.4, 0.4, 'S'); c.line(3, 16, 17, 16, 0.4, 0.4, 'S'); c.ell(10, 8, 7, 2.4, ['s', 's', 'S']); c.ell(10, 8, 5, 1.4, 'p');
  c.line(3, 1, 8, 6, 0.6, 0.6, 'h'); c.line(17, 1, 12, 6, 0.6, 0.6, 'h'); c.outline(); S.i_drums = rects(c);
  c = Canvas(20, 20);
  c.poly([[1, 7], [19, 7], [19, 18], [1, 18]], 'Z'); c.rect(1, 7, 18, 3, ['S', 'S', 'Z']); [[3, 8, 'y'], [6, 8, 'f'], [15, 8, 'c']].forEach(([x, y, ch]) => c.px(x, y, ch));
  for (let x = 2; x <= 17; x += 3) c.rect(x, 11, 2, 7, 's');
  for (let i = 0, x = 3; x <= 17; x += 3, i++) if (i !== 2 && i !== 5) c.rect(x + 1, 11, 2, 4, 'k');
  c.outline(); S.i_synth = rects(c);
})();

// ---------- customer faces (16x16)
(function () {
  let c = Canvas(16, 16);
  c.ell(8, 8, 6.5, 6.5, ['y', 'y', 'Y']); c.rect(4, 5, 2, 3, 'k'); c.rect(10, 5, 2, 3, 'k');
  [[4, 10], [5, 11], [6, 11], [7, 11], [8, 11], [9, 11], [10, 11], [11, 10]].forEach(([x, y]) => c.px(x, y, 'k')); c.outline(); S.f_happy = rects(c);
  c = Canvas(16, 16);
  c.ell(8, 8, 6.5, 6.5, ['e', 'e', 'R']); c.rect(4, 6, 2, 2, 'k'); c.rect(10, 6, 2, 2, 'k');
  [[3, 4], [4, 4], [5, 5], [6, 5], [10, 5], [11, 5], [12, 4], [13, 4]].forEach(([x, y]) => c.px(x, y, 'k'));
  [[4, 12], [5, 11], [6, 10], [7, 10], [8, 10], [9, 10], [10, 10], [11, 11], [12, 12]].forEach(([x, y]) => c.px(x, y, 'k')); c.outline(); S.f_angry = rects(c);
})();

// ---------- pillar icons (14x14)
(function () {
  let c = Canvas(14, 14);
  c.poly([[8, 0], [2, 8], [6, 8], [4, 14], [12, 5], [8, 5], [10, 0]], ['1', 'y', 'Y']); c.outline(); S.p_bolt = rects(c);
  c = Canvas(14, 14); c.ell(7, 7, 6, 6, 'r'); c.ell(7, 7, 4, 4, 'x'); c.ell(7, 7, 2, 2, 'r'); c.outline(); S.p_target = rects(c);
  c = Canvas(14, 14); c.ell(7, 6, 5.5, 5, 'x'); c.rect(4, 9, 6, 4, 'x'); c.ell(5, 6, 1.5, 1.5, 'k'); c.ell(9, 6, 1.5, 1.5, 'k'); c.px(6, 9, 'k'); c.px(8, 9, 'k'); c.px(5, 12, 'k'); c.px(7, 12, 'k'); c.px(9, 12, 'k'); c.outline(); S.p_skull = rects(c);
  c = Canvas(14, 14); c.ell(7, 7, 6, 6, ['y', 'y', 'Y']); c.px(4, 5, 'k'); c.px(4, 6, 'k'); c.px(9, 5, 'k'); c.px(9, 6, 'k'); c.rect(3, 8, 8, 3, 'k'); c.rect(4, 10, 6, 1, 'e'); c.outline(); S.p_laugh = rects(c);
})();

// ---------- skyline (240x30, seeded)
(function () {
  let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const Wd = 240, Hd = 30; let out = '';
  const R = (x, y, w, h, col) => { out += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + col + '"/>'; };
  for (let i = 0; i < 22; i++) R(Math.floor(rnd() * Wd), Math.floor(rnd() * 10), 1, 1, i % 3 ? '#5b4aa3' : '#c9b8ff');
  let x = 0, k = 0;
  while (x < Wd) {
    const w = 14 + Math.floor(rnd() * 14), h = 10 + Math.floor(rnd() * 14), col = k % 2 ? '#2b2258' : '#3a2d73';
    R(x, Hd - h, w, h, col); R(x, Hd - h, w, 1, '#5b4aa3');
    for (let wy = Hd - h + 3; wy < Hd - 3; wy += 4) for (let wx = x + 2; wx < x + w - 2; wx += 4) if (rnd() > 0.45) R(wx, wy, 2, 2, rnd() > 0.5 ? '#ffd23f' : '#3ee6c4');
    if (k % 3 === 1) { R(x + 3, Hd - h - 6, 3, 6, '#2b2258'); R(x + 3, Hd - h - 6, 3, 1, '#5b4aa3'); R(x + 4, Hd - h - 9, 2, 2, '#c9b8ff'); R(x + 6, Hd - h - 12, 2, 2, '#a99dd0'); }
    x += w + Math.floor(rnd() * 3); k++;
  }
  R(0, Hd - 2, Wd, 2, '#14102a');
  S.skyline = out;
})();

module.exports = { S, C, PAL };
