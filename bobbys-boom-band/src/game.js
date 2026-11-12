(function () {
  var screenEl = document.getElementById('screen');
  var stage = document.getElementById('stage');
  var spriteBtn = document.getElementById('sprite-btn');
  var runBtn = document.getElementById('run');
  var clearBtn = document.getElementById('clear');
  var countEl = document.getElementById('count');
  var lanesEl = document.getElementById('lanes');
  var pips = Array.prototype.slice.call(document.querySelectorAll('.pip'));

  /* ---------- fit the 16:9 stage to the window ---------- */
  var fit = document.getElementById('fit');
  function fitScale() { return Math.min(window.innerWidth / 1280, window.innerHeight / 720) || 1; }
  function resize() { fit.style.transform = 'translate(-50%, -50%) scale(' + fitScale() + ')'; }
  window.addEventListener('resize', resize); resize();

  /* ---------- level meter ---------- */
  var eqEl = document.getElementById('eq'), eqBars = [];
  (function () {
    var stops = [[62, 230, 196], [255, 210, 63], [255, 93, 115]];
    for (var i = 0; i < 24; i++) {
      var t = i / 23 * 2, a = stops[Math.min(1, Math.floor(t))], b = stops[Math.min(2, Math.floor(t) + 1)], f = t - Math.floor(t);
      var c = [0, 1, 2].map(function (k) { return Math.round(a[k] + (b[k] - a[k]) * f); });
      var s = document.createElement('span'); s.style.setProperty('--bc', 'rgb(' + c.join(',') + ')');
      eqEl.appendChild(s); eqBars.push(s);
    }
  })();
  function paintEq(beat) {
    var tt = performance.now() / 1000, pulse = running && beat >= 0 ? 1 - (((beat % 1) + 1) % 1) : 0.3;
    eqBars.forEach(function (bar, i) {
      var lvl = running ? 0.2 + 0.75 * Math.abs(Math.sin(tt * 2.3 + i * 0.8)) * (0.5 + 0.5 * pulse) : 0.1;
      var h = Math.max(1, Math.round(lvl * 7)) * 6 + 'px';
      if (bar.style.height !== h) bar.style.height = h;
    });
  }

  /* ---------- music & charts ---------- */
  var START = -8 * (60 / 100), BPM = 100, SPB = 60 / BPM, BEATS = 8, LOOP = BEATS * SPB, SPAN = 4, X0 = 46, NOTE = 64, LOOK = 0.14, PAST = 2.2;
  var INSTRS = ['guitar', 'drums', 'synth'];
  var ANIMALS = {
    dino: { instr: 'guitar', cap: 'TRICERATOPS<br>ON GUITAR' },
    dog: { instr: 'drums', cap: 'DOG<br>ON DRUMS' },
    capy: { instr: 'synth', cap: 'CAPYBARA<br>ON SYNTH' }
  };
  var LANE_COLORS = ['#ff5d73', '#3ee6c4', '#ffd23f', '#7d9bff'];
  var LANE_NAMES = ['Left', 'Down', 'Up', 'Right'];
  var LANE_KEYS = ['A', 'S', 'W', 'D'];
  var KEYMAP = { ArrowLeft: 0, KeyA: 0, ArrowDown: 1, KeyS: 1, ArrowUp: 2, KeyW: 2, ArrowRight: 3, KeyD: 3 };
  /* Am - F - C - G, two beats each */
  var BASS = [110, 87.3, 130.8, 98];
  var CHORD = [[440, 523.3, 659.3], [349.2, 440, 523.3], [523.3, 659.3, 784], [392, 493.9, 587.3]];
  var MELODY = [[880, 1046.5, 1318.5, 1046.5], [880, 1046.5, 1396.9, 1046.5], [1046.5, 1318.5, 1568, 1318.5], [987.8, 1174.7, 1568, 1174.7]];
  function tonesFor(instr, ci) {
    var c = CHORD[ci];
    return instr === 'guitar' ? [c[0] / 4, c[1] / 4, c[2] / 4, c[0] / 2] : [c[0], c[1], c[2], c[0] * 2];
  }
  /* s = start beat, d = length in beats, l = arrow lane (0 left, 1 down, 2 up, 3 right) */
  var CHARTS = {
    guitar: [
      { s: 0, d: 1.5, l: 0 }, { s: 2, d: 0.5, l: 2 }, { s: 2.5, d: 0.5, l: 1 }, { s: 3, d: 0.75, l: 3 },
      { s: 4, d: 1.5, l: 0 }, { s: 6, d: 0.5, l: 2 }, { s: 6.5, d: 0.5, l: 1 }, { s: 7, d: 0.75, l: 3 }
    ],
    drums: [
      { s: 0, l: 0 }, { s: 1, l: 1 }, { s: 2, l: 0 }, { s: 2.5, l: 0 }, { s: 3, l: 1 }, { s: 4, l: 0 },
      { s: 5, l: 1 }, { s: 6, l: 0 }, { s: 6.5, l: 2 }, { s: 7, l: 2 }, { s: 7.5, l: 3 }
    ].map(function (n) { n.d = 0.25; return n; }),
    synth: [
      { s: 0, d: 2, l: 0 }, { s: 2, d: 1, l: 1 }, { s: 3, d: 1, l: 2 }, { s: 4, d: 2, l: 3 }, { s: 6, d: 1, l: 2 }, { s: 7, d: 0.75, l: 1 }
    ]
  };
  var TOTAL = 0;
  INSTRS.forEach(function (ins) {
    CHARTS[ins].forEach(function (n, i) { n.instr = ins; n.i = i; n.tap = n.d <= 0.3; n.applied = false; n.miss = false; n.judgedK = -2; TOTAL++; });
  });
  function countOf(ins) { var c = 0; CHARTS[ins].forEach(function (n) { if (n.applied) c++; }); return c; }

  /* ---------- pixel arrows ---------- */
  var ARROW = [
    '......#.....', '......##....', '......###...', '......####..', '###########.', '############',
    '############', '###########.', '......####..', '......###...', '......##....', '......#.....'
  ];
  function mix(hex, to, a) {
    var h = parseInt(hex.slice(1), 16), t = parseInt(to.slice(1), 16), out = '#';
    [16, 8, 0].forEach(function (sh) { var x = Math.round(((h >> sh) & 255) * (1 - a) + ((t >> sh) & 255) * a); out += ('0' + x.toString(16)).slice(-2); });
    return out;
  }
  function arrowSvg(color, hollow) {
    var on = function (x, y) { return y >= 0 && y < 12 && x >= 0 && x < 12 && ARROW[y][x] === '#'; };
    var out = '', lite = mix(color, '#ffffff', 0.5), dark = mix(color, '#000000', 0.4);
    for (var y = -1; y <= 12; y++) for (var x = -1; x <= 12; x++) {
      var fill = null;
      if (on(x, y)) {
        if (hollow) fill = '#0f0a22';
        else fill = !on(x, y - 1) || !on(x - 1, y) ? lite : (!on(x, y + 1) || !on(x + 1, y) ? dark : color);
      } else if (on(x + 1, y) || on(x - 1, y) || on(x, y + 1) || on(x, y - 1)) fill = hollow ? color : '#1a1030';
      if (fill) out += '<rect x="' + (x + 1) + '" y="' + (y + 1) + '" width="1" height="1" fill="' + fill + '"/>';
    }
    return '<svg viewBox="0 0 14 14" aria-hidden="true">' + out + '</svg>';
  }
  var ROT = [180, 90, -90, 0];

  /* ---------- lanes (DOM) ---------- */
  var trackOf = [], padOf = [];
  var charts = CHARTS;
  for (var li = 0; li < 4; li++) {
    (function (l) {
      var lane = document.createElement('div');
      lane.className = 'lane'; lane.style.setProperty('--c', LANE_COLORS[l]); lane.dataset.lane = l;
      var pad = document.createElement('button');
      pad.type = 'button'; pad.className = 'pad'; pad.setAttribute('aria-label', LANE_NAMES[l] + ' arrow');
      pad.innerHTML = '<span class="rot" style="transform:rotate(' + ROT[l] + 'deg)">' + arrowSvg(LANE_COLORS[l], false) + '</span><i>' + LANE_KEYS[l] + '</i>';
      var track = document.createElement('div');
      track.className = 'track';
      track.innerHTML = '<span class="receptor rot" style="transform:rotate(' + ROT[l] + 'deg)">' + arrowSvg(LANE_COLORS[l], true) + '</span>';
      lane.appendChild(pad); lane.appendChild(track); lanesEl.appendChild(lane);
      trackOf[l] = track; padOf[l] = pad;
    })(li);
  }
  INSTRS.forEach(function (ins) {
    charts[ins].forEach(function (n) {
      var el = document.createElement('div');
      el.className = 'note i-' + ins;
      el.style.display = 'none';
      var inner = '';
      if (!n.tap) { inner += '<span class="tail"></span>'; }
      inner += '<span class="rot" style="transform:rotate(' + ROT[n.l] + 'deg)">' + arrowSvg(LANE_COLORS[n.l], false) + '</span>';
      el.innerHTML = inner;
      n.el = el; n.tail = el.querySelector('.tail'); n.cls = 'note i-' + ins;
      trackOf[n.l].appendChild(el);
    });
  });

  /* ---------- audio engine ---------- */
  var ctx, master, distIn, t0 = 0, running = false, pausedAt = START, lastSched = START, timer = null;
  function ac() {
    if (!ctx) {
      var A = window.AudioContext || window.webkitAudioContext;
      if (!A) return null;
      ctx = new A();
      var comp = ctx.createDynamicsCompressor(); comp.connect(ctx.destination);
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(comp);
      distIn = ctx.createWaveShaper();
      var curve = new Float32Array(512);
      for (var i = 0; i < 512; i++) { var x = i / 256 - 1; curve[i] = Math.tanh(14 * x + 2 * x * x) * 0.85; }
      distIn.curve = curve; distIn.oversample = '2x';
      var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 90;
      var mid = ctx.createBiquadFilter(); mid.type = 'peaking'; mid.frequency.value = 650; mid.Q.value = 0.8; mid.gain.value = 5;
      var low = ctx.createBiquadFilter(); low.type = 'lowshelf'; low.frequency.value = 180; low.gain.value = 6;
      var hc = ctx.createBiquadFilter(); hc.type = 'highshelf'; hc.frequency.value = 2500; hc.gain.value = -9;
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3400; lp.Q.value = 0.6;
      distIn.connect(hp); hp.connect(low); low.connect(mid); mid.connect(hc); hc.connect(lp); lp.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function nowT() { return running ? ctx.currentTime - t0 : pausedAt; }

  function tone(type, f0, f1, t, dur, peak, lp, dest) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    if (lp) { var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); f.connect(g); } else o.connect(g);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(dest || master); o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  function noise(t, dur, peak, hp, type) {
    var n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    var s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    s.buffer = buf; f.type = type || 'highpass'; f.frequency.value = hp;
    g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }
  function pluck(f, t, dur, peak, dest, decay) {
    var sr = ctx.sampleRate, n = Math.floor(sr * dur), p = Math.max(2, Math.round(sr / f));
    var buf = ctx.createBuffer(1, n, sr), d = buf.getChannelData(0), i;
    for (var i2 = 0; i2 < p + 1; i2++) d[i2] = Math.random() * 2 - 1;
    for (i = p + 1; i < n; i++) d[i] = (decay || 0.9965) * 0.5 * (d[i - p] + d[i - p - 1]);
    var s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = buf; g.gain.value = peak; s.connect(g); g.connect(dest); s.start(t);
    return s;
  }
  /* a voice that can be released early */
  function voice(env, oscs, t, dur) {
    var v = {
      stop: function (when) {
        env.gain.cancelScheduledValues(when);
        env.gain.setTargetAtTime(0.0001, when, 0.04);
        oscs.forEach(function (o) { try { o.stop(when + 0.35); } catch (e) { /* already stopped */ } });
      }
    };
    if (dur) v.stop(t + dur);
    return v;
  }
  var NOOP = { stop: function () { } };

  /* drum pieces */
  function kick(t) { tone('sine', 150, 42, t, 0.3, 1); noise(t, 0.03, 0.35, 1500); }
  function snare(t) { noise(t, 0.18, 0.7, 1800, 'bandpass'); tone('triangle', 200, 120, t, 0.12, 0.5); }
  function tom(t, f) { tone('sine', f, f * 0.55, t, 0.4, 0.95); noise(t, 0.02, 0.2, 2500); }
  function crash(t) { noise(t, 0.9, 0.45, 5500); noise(t, 0.05, 0.3, 8000); }

  /* the cool sound when you hit */
  function playNote(instr, n, t, dur) {
    var ci = Math.floor(n.s / 2), f = tonesFor(instr, ci)[n.l];
    if (instr === 'drums') {
      if (n.l === 0) kick(t); else if (n.l === 1) snare(t); else if (n.l === 2) tom(t, 230); else { crash(t); kick(t); }
      return NOOP;
    }
    var env = ctx.createGain(), oscs = [];
    env.gain.setValueAtTime(0.0001, t);
    env.gain.setTargetAtTime(0.9, t, 0.01);
    if (instr === 'guitar') {
      /* real plucked strings (Karplus-Strong) as a power chord into a distorted amp + cabinet: no synth oscillators */
      env.connect(distIn);
      env.gain.setTargetAtTime(0.85, t, 0.004);
      var len = dur > 0 ? Math.min(3, dur + 0.5) : 2.2;
      [1, 1.5, 2].forEach(function (m, i) {
        oscs.push(pluck(f * m, t + i * 0.011, len, 0.6, env, 0.9985));
        oscs.push(pluck(f * m * 1.006, t + 0.018 + i * 0.009, len, 0.45, env, 0.998));
      });
      noise(t, 0.05, 0.3, 1200, 'bandpass');
      var hiss = ctx.createBufferSource(), hb = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate), hd = hb.getChannelData(0), hg = ctx.createGain();
      for (var h = 0; h < hd.length; h++) hd[h] = (Math.random() * 2 - 1) * 0.02;
      hiss.buffer = hb; hg.gain.value = 1; hiss.connect(hg); hg.connect(env); hiss.start(t); oscs.push(hiss); tone('sine', f / 2, f / 2, t, 0.3, 0.35);
    } else {
      var sw = ctx.createBiquadFilter(); sw.type = 'lowpass'; sw.Q.value = 4;
      sw.frequency.setValueAtTime(700, t); sw.frequency.setTargetAtTime(3400, t, 0.15);
      env.connect(sw); sw.connect(master);
      [-9, 0, 9].forEach(function (c) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = c; g.gain.value = 0.16;
        o.connect(g); g.connect(env); o.start(t); oscs.push(o);
      });
      tone('square', f * 2, f * 2, t, 0.18, 0.1, 4200);
    }
    return voice(env, oscs, t, dur);
  }

  /* the funny, wobbly sound when you miss: same instrument, out of tune and sliding down */
  function wobbleVoice(instr, f, dur) {
    var t = ctx.currentTime, env = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = instr === 'synth' ? 2200 : 1800; lp.Q.value = 3;
    env.gain.setValueAtTime(0.0001, t); env.gain.setTargetAtTime(0.5, t, 0.015);
    var fall = dur || 1.4;
    var vib = ctx.createOscillator(), vg = ctx.createGain();
    vib.frequency.value = instr === 'drums' ? 15 : 6.5; vg.gain.value = f * (instr === 'drums' ? 0.14 : 0.07); vib.connect(vg);
    var types = instr === 'drums' ? ['sine', 'triangle'] : ['sawtooth', 'sawtooth'];
    var oscs = types.map(function (type, i) {
      var o = ctx.createOscillator(), g = ctx.createGain(), det = i ? 1.012 : 1;
      o.type = type; g.gain.value = i ? 0.4 : 0.6;
      o.frequency.setValueAtTime(f * 1.08 * det, t); o.frequency.exponentialRampToValueAtTime(f * 0.6 * det, t + fall);
      vg.connect(o.frequency); o.connect(g); g.connect(lp); o.start(t); return o;
    });
    vib.start(t); oscs.push(vib);
    lp.connect(env); env.connect(instr === 'guitar' ? distIn : master);
    if (instr === 'drums') noise(t, 0.06, 0.35, 300, 'lowpass');
    if (instr === 'guitar') noise(t, 0.08, 0.2, 4000);
    return voice(env, oscs, t, dur || 0);
  }
  function wobblePitch(instr, lane, ci) {
    return instr === 'drums' ? [110, 180, 240, 330][lane] : tonesFor(instr, ci)[lane];
  }

  /* backing track */
  function bass(t, f) { tone('triangle', f, f, t, SPB * 0.9, 0.5); tone('sine', f / 2, f / 2, t, SPB * 0.9, 0.35); }
  function music(t, f) { tone('sine', f, f, t, 0.35, 0.16); tone('triangle', f * 2, f * 2, t, 0.15, 0.04); }
  function tick(t, v) { noise(t, 0.04, 0.25 * v, 6000); tone('sine', 1000, 1000, t, 0.05, 0.12 * v); }
  function jingle(ok) {
    if (!ac()) return;
    var t = ctx.currentTime + 0.01;
    if (ok) { tone('square', 1568, 1568, t, 0.09, 0.2, 5000); tone('square', 2093, 2093, t + 0.09, 0.6, 0.2, 5000); noise(t + 0.09, 0.4, 0.12, 9000); }
    else { tone('sawtooth', 110, 98, t, 0.7, 0.5, 600); tone('square', 117, 104, t, 0.7, 0.3, 600); noise(t, 0.5, 0.15, 400, 'lowpass'); }
  }

  /* ---------- scheduler ---------- */
  function schedule(n) {
    var from = lastSched, to = n + LOOK;
    if (to <= from) return;
    var i, k, b, e;
    for (i = -8; i < 0; i++) { var a0 = i * SPB; if (a0 >= from && a0 < to) tick(t0 + a0, i === -8 || i === -4 ? 1 : 0.6); }
    var k0 = Math.max(0, Math.floor(from / LOOP)), k1 = Math.floor(to / LOOP);
    for (k = k0; k <= k1; k++) {
      for (b = 0; b < 8; b++) { var a = (k * 8 + b) * SPB; if (a >= from && a < to) bass(t0 + a, BASS[b >> 1]); }
      for (e = 0; e < 16; e++) { var a2 = (k * 8 + e / 2) * SPB; if (a2 >= from && a2 < to) music(t0 + a2, MELODY[e >> 2][e & 3]); }
      INSTRS.forEach(function (ins) {
        charts[ins].forEach(function (nt) {
          if (!nt.applied) return;
          var a3 = (k * 8 + nt.s) * SPB;
          if (a3 >= from && a3 < to) playNote(ins, nt, t0 + a3, nt.d * SPB);
        });
      });
    }
    lastSched = to;
  }

  /* ---------- player input ---------- */
  var curInstr = 'guitar', laneSince = 0, holds = [null, null, null, null], presses = [], recent = [], mood = 'happy';
  function passRange(n) { var kc = Math.floor(n / LOOP); return [kc - 1, kc, kc + 1].filter(function (k) { return k >= 0; }); }
  function findCandidate(n, lane) {
    var best = null;
    charts[curInstr].forEach(function (p) {
      if (p.l !== lane) return;
      passRange(n).forEach(function (k) {
        var s = (k * BEATS + p.s) * SPB, e = s + p.d * SPB;
        if (p.applied || p.judgedK >= k) return;
        if (n >= s - 0.2 && n <= e && (!best || s < best.s)) best = { p: p, k: k, s: s, e: e };
      });
    });
    return best;
  }
  function inAppliedWindow(n, lane) {
    var hit = false;
    charts[curInstr].forEach(function (p) {
      if (p.l !== lane || !p.applied) return;
      passRange(n).forEach(function (k) {
        var s = (k * BEATS + p.s) * SPB, e = s + p.d * SPB;
        if (n >= s - 0.1 && n <= e) hit = true;
      });
    });
    return hit;
  }
  function pressDown(lane) {
    if (holds[lane]) return;
    if (!running) {
      /* free play: try the instrument while the loop is stopped */
      if (!ac()) return;
      var fp = { lane: lane, down: 0, up: null, voice: playNote(curInstr, { s: 0, l: lane }, ctx.currentTime, 0) };
      holds[lane] = fp; jam();
      trackOf[lane].classList.add('holding'); padOf[lane].classList.add('down');
      return;
    }
    var n = nowT(), pr = { lane: lane, down: n, up: null, voice: null };
    holds[lane] = pr; presses.push(pr);
    var c = findCandidate(n, lane);
    if (c) {
      pr.voice = playNote(curInstr, c.p, ctx.currentTime, Math.max(0.05, c.e - n));
      jam();
    } else if (!inAppliedWindow(n, lane)) {
      var ci = Math.floor((((n / SPB) % BEATS) + BEATS) % BEATS / 2);
      pr.voice = wobbleVoice(curInstr, wobblePitch(curInstr, lane, ci), 0);
    }
    trackOf[lane].classList.add('holding'); padOf[lane].classList.add('down');
  }
  function pressUp(lane) {
    var pr = holds[lane];
    if (!pr) return;
    holds[lane] = null;
    pr.up = running ? nowT() : 0;
    if (pr.voice) pr.voice.stop(ctx.currentTime);
    trackOf[lane].classList.remove('holding'); padOf[lane].classList.remove('down');
  }
  function releaseAll() { for (var l = 0; l < 4; l++) pressUp(l); }

  /* ---------- judging ---------- */
  function judge(n) {
    charts[curInstr].forEach(function (p) {
      var dSec = p.d * SPB, gs = p.tap ? 0.16 : Math.max(0.22, 0.3 * dSec);
      passRange(n).forEach(function (k) {
        if (p.judgedK >= k) return;
        var s = (k * BEATS + p.s) * SPB, e = s + dSec;
        if (n < s - 0.2) return;
        if (s < laneSince) { p.judgedK = k; return; }
        if (p.applied) { p.judgedK = k; return; }
        var pr = null;
        for (var i = 0; i < presses.length; i++) { if (presses[i].lane === p.l && presses[i].down >= s - 0.2 && presses[i].down <= s + gs) { pr = presses[i]; break; } }
        if (!pr) { if (n > s + gs) result(p, k, false); return; }
        if (p.tap) { result(p, k, true); return; }
        var start = Math.max(pr.down, s), cov;
        if (pr.up !== null) { cov = (Math.min(pr.up, e) - start) / dSec; result(p, k, cov >= 0.7); }
        else if (n >= e) { cov = (e - start) / dSec; result(p, k, cov >= 0.7); }
      });
    });
    if (presses.length > 60) presses.splice(0, presses.length - 30);
  }
  var WIN = ['NICE!', 'YEAH!', 'LOCKED!', 'BOOM!'], LOSE = ['WOBBLE!', 'OOPS!', 'BWAAH!', 'SPROING!'];
  function result(p, k, ok) {
    p.judgedK = k;
    if (ok) { p.applied = true; p.miss = false; }
    else {
      p.miss = true;
      var ci = Math.floor(p.s / 2), d = Math.min(0.9, Math.max(0.4, p.d * SPB));
      wobbleVoice(p.instr, wobblePitch(p.instr, p.l, ci), d);
    }
    recent.push(ok); if (recent.length > 4) recent.shift();
    pop(ok ? WIN[Math.floor(Math.random() * WIN.length)] : LOSE[Math.floor(Math.random() * LOSE.length)], ok, p.l);
    paintNote(p); updateMood();
  }

  /* ---------- crowd mood ---------- */
  function setHidden(el, on) { if (on) el.setAttribute('hidden', ''); else el.removeAttribute('hidden'); }
  var faceH = document.getElementById('face-happy'), faceA = document.getElementById('face-angry'), status = document.getElementById('hud-status');
  function locked() { var c = 0; INSTRS.forEach(function (i) { c += countOf(i); }); return c; }
  function paintHud() {
    status.textContent = (mood === 'happy' ? 'HAPPY' : 'ANGRY') + ' · ' + locked() + '/' + TOTAL + ' LOCKED';
    screenEl.dataset.mode = mood;
    setHidden(faceH, mood !== 'happy'); setHidden(faceA, mood === 'happy');
    INSTRS.forEach(function (i) {
      document.getElementById('cnt-' + i).textContent = countOf(i) + '/' + charts[i].length;
      document.querySelector('.chip[data-instr="' + i + '"]').classList.toggle('sel', i === curInstr);
    });
  }
  function updateMood() {
    var misses = recent.filter(function (x) { return !x; }).length, hits = recent.length - misses, was = mood;
    if (misses >= 3) mood = 'angry'; else if (hits >= 2) mood = 'happy';
    paintHud();
    if (mood !== was && running) jingle(mood === 'happy');
  }

  /* ---------- visuals ---------- */
  function paintNote(p) {
    var c = p.cls + (p.applied ? ' applied' : '') + (p.miss && !p.applied ? ' miss' : '');
    p.curCls = c; p.el.className = c + (p.now ? ' now' : '');
  }
  INSTRS.forEach(function (i) { charts[i].forEach(paintNote); });
  function pop(word, ok, lane) {
    var sc = fitScale(), host = screenEl.getBoundingClientRect(), r = trackOf[lane].getBoundingClientRect();
    var s = document.createElement('span');
    s.className = 'pop'; s.textContent = word;
    s.style.color = ok ? 'var(--happy)' : 'var(--angry)';
    s.style.left = Math.max(60, Math.min(host.width / sc - 60, (r.left - host.left) / sc + X0 + 70)) + 'px';
    s.style.top = ((r.top - host.top) / sc + 4) + 'px';
    screenEl.appendChild(s); setTimeout(function () { s.remove(); }, 850);
  }
  var jamTimer;
  function jam() {
    spriteBtn.classList.remove('jam'); void spriteBtn.offsetWidth; spriteBtn.classList.add('jam');
    clearTimeout(jamTimer); jamTimer = setTimeout(function () { spriteBtn.classList.remove('jam'); }, 400);
  }
  var lastCount = '';
  function frame() {
    var n = nowT(), beat = n / SPB;
    var idle = !running && n <= START + 0.001;
    if (idle) beat = 0;
    var ppb = Math.max(20, (trackOf[0].clientWidth - X0 - 24) / SPAN);
    charts[curInstr].forEach(function (p) {
      var dt = beat < 0 ? p.s - beat : (((p.s - beat + PAST) % BEATS) + BEATS) % BEATS - PAST;
      var vis = dt < SPAN + 0.2 && dt + p.d > -0.8 && !(idle && dt < -0.01) && !(running && beat < -4);
      var el = p.el;
      if (!vis) { if (el.style.display !== 'none') el.style.display = 'none'; return; }
      el.style.display = 'block';
      el.style.transform = 'translateX(' + Math.round(X0 - NOTE / 2 + dt * ppb) + 'px)';
      if (p.tail) { var w = Math.max(0, Math.round(p.d * ppb)) + 'px'; if (p.tail.style.width !== w) p.tail.style.width = w; }
      var now = dt <= 0.08 && dt + p.d > 0;
      if (now !== !!p.now) { p.now = now; el.className = p.curCls + (now ? ' now' : ''); }
    });
    var lp = beat < 0 ? -1 : Math.floor(((beat % BEATS) + BEATS) % BEATS);
    pips.forEach(function (pp, i) { pp.classList.toggle('on', i === lp); });
    paintEq(beat);
    var txt = '';
    if (running && beat < -4) txt = String(Math.ceil(-beat - 4));
    else if (running && beat < -3.2) txt = 'GO!';
    if (txt !== lastCount) { lastCount = txt; countEl.textContent = txt; setHidden(countEl, !txt); }
    requestAnimationFrame(frame);
  }

  /* ---------- transport ---------- */
  function setRunLabel() { runBtn.textContent = running ? '❚❚ PAUSE' : (pausedAt > START + 0.01 ? '▶ RESUME' : '▶ START'); runBtn.setAttribute('aria-pressed', running); }
  function start() {
    if (!ac()) return;
    t0 = ctx.currentTime + 0.05 - pausedAt;
    if (lastSched < pausedAt) lastSched = pausedAt;
    running = true;
    clearInterval(timer);
    timer = setInterval(function () { var n = nowT(); judge(n); schedule(n); }, 25);
    setRunLabel();
  }
  function pause() {
    releaseAll();
    pausedAt = nowT(); running = false; clearInterval(timer);
    setRunLabel();
  }
  runBtn.addEventListener('click', function () { if (running) pause(); else start(); });
  clearBtn.addEventListener('click', function () {
    var was = running;
    if (was) pause();
    INSTRS.forEach(function (i) { charts[i].forEach(function (p) { p.applied = false; p.miss = false; p.judgedK = -2; paintNote(p); }); });
    recent = []; mood = 'happy'; presses = []; pausedAt = START; lastSched = START; laneSince = 0;
    paintHud(); setRunLabel();
    if (was) start();
  });

  /* ---------- band member = instrument ---------- */
  function setAnimal(a) {
    releaseAll();
    ['dino', 'dog', 'capy'].forEach(function (k) { setHidden(document.getElementById('spr-' + k), k !== a); });
    document.querySelectorAll('.tab').forEach(function (t) { t.setAttribute('aria-pressed', t.dataset.animal === a); });
    curInstr = ANIMALS[a].instr;
    lanesEl.dataset.instr = curInstr;
    INSTRS.forEach(function (i) { charts[i].forEach(function (p) { if (i !== curInstr) p.el.style.display = 'none'; }); });
    presses = []; laneSince = running ? nowT() + 0.05 : Math.max(0, pausedAt);
    paintHud();
  }
  document.querySelectorAll('.tab').forEach(function (t) { t.addEventListener('click', function () { setAnimal(t.dataset.animal); }); });

  /* press and hold: the pads, the tracks, or the keyboard */
  function bindHold(el, lane) {
    el.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      pressDown(lane);
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { el.addEventListener(ev, function () { pressUp(lane); }); });
  }
  for (var bl = 0; bl < 4; bl++) { bindHold(trackOf[bl], bl); bindHold(padOf[bl], bl); }
  document.addEventListener('keydown', function (e) {
    if (!(e.code in KEYMAP)) return;
    e.preventDefault();
    if (!e.repeat) pressDown(KEYMAP[e.code]);
  });
  document.addEventListener('keyup', function (e) { if (e.code in KEYMAP) { e.preventDefault(); pressUp(KEYMAP[e.code]); } });
  window.addEventListener('blur', releaseAll);

  /* ---------- go ---------- */
  setAnimal('dino');
  setRunLabel();
  requestAnimationFrame(frame);
})();
