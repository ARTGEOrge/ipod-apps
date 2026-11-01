/* Feather Fling — game flow: menus, slingshot input, bird abilities, turns, scoring. */
(function () {
  'use strict';
  var E = window.FFEngine, ART = window.ART, LEVELS = window.LEVELS, pl = window.planck;
  var $ = function (id) { return document.getElementById(id); };

  var REST = { x: 0, y: 2.95 };       // pouch rest position (world)
  var FORK_BACK = { x: 0.42, y: 3.15 }, FORK_FRONT = { x: -0.42, y: 3.15 };
  var MAX_PULL = 2.1, POWER = 10.2, GRAB_RADIUS = 1.8;
  var HINTS = {
    rusty: 'Drag the bird back and let go',
    zip: 'Zip: tap while flying to dash',
    trio: 'Trio: tap while flying to split into three',
    boomer: 'Boomer: tap to explode (or wait after it lands)',
    tank: 'Tank: heavy and strong against stone'
  };

  var canvas = $('stage'), ctx = canvas.getContext('2d');
  var S = null;                         // current play state
  var WORLDS = window.WORLDS, page = 0, attractTheme = 0;
  var progress = loadProgress();
  var paused = false;

  /* -------------------------------------------------------------- progress */
  function loadProgress() {
    try { var p = JSON.parse(localStorage.getItem('featherFling.v1')); if (p && p.stars) return p; } catch (e) {}
    return { stars: [] };
  }
  function saveProgress() {
    try { localStorage.setItem('featherFling.v1', JSON.stringify(progress)); } catch (e) {}
  }
  function unlocked(i) { return i === 0 || (progress.stars[i - 1] || 0) > 0; }

  /* ----------------------------------------------------------------- sound */
  var AC = null;
  function tone(freq, dur, type, vol, slide) {
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      var o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime;
      o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
      g.gain.setValueAtTime(vol || 0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dur);
    } catch (e) {}
  }
  var SFX = {
    stretch: function () { tone(220, 0.12, 'triangle', 0.05, 1.6); },
    launch: function () { tone(520, 0.25, 'sawtooth', 0.06, 0.4); },
    break: function () { tone(180 + Math.random() * 80, 0.12, 'square', 0.05, 0.5); },
    bandit: function () { tone(660, 0.18, 'sine', 0.1, 1.8); },
    boom: function () { tone(90, 0.5, 'sawtooth', 0.14, 0.3); },
    win: function () { [523, 659, 784, 1046].forEach(function (f, i) { setTimeout(function () { tone(f, 0.22, 'triangle', 0.09); }, i * 120); }); },
    lose: function () { [392, 330, 262].forEach(function (f, i) { setTimeout(function () { tone(f, 0.3, 'triangle', 0.08); }, i * 180); }); }
  };
  E.onEvent = function (type) { if (SFX[type]) SFX[type](); };

  /* --------------------------------------------------------------- screens */
  // classList.toggle(name, force) is not in iOS 6 Safari
  function setClass(el, name, on) { if (on) el.classList.add(name); else el.classList.remove(name); }
  function removeEl(el) { if (el && el.parentNode) el.parentNode.removeChild(el); }
  var SCREENS = ['title', 'levels', 'pause', 'win', 'lose'];
  function show(id) {
    SCREENS.forEach(function (s) { setClass($(s), 'hidden', s !== id); });
    setClass($('hud'), 'hidden', !S || id === 'title' || id === 'levels');
  }

  function worldOf(i) {
    for (var w = 0; w < WORLDS.length; w++) if (i >= WORLDS[w].from && i < WORLDS[w].to) return w;
    return 0;
  }
  function furthestWorld() {
    var best = 0;
    LEVELS.forEach(function (lv, i) { if (unlocked(i)) best = worldOf(i); });
    return best;
  }

  function buildLevelGrid() {
    var grid = $('levelGrid'), W0 = WORLDS[page];
    grid.innerHTML = '';
    var count = W0.to - W0.from;
    grid.className = 'level-grid map';
    // node positions along a winding trail, in % of the map box
    var spots = [];
    for (var q = 0; q < count; q++) {
      var tt = count === 1 ? 0.5 : q / (count - 1);
      spots.push({ x: 8 + tt * 84, y: 52 + Math.sin(tt * Math.PI * 1.6 + page * 1.3) * 26 });
    }
    var d = spots.map(function (sp, q) {
      if (!q) return 'M' + sp.x + ' ' + sp.y;
      var pr = spots[q - 1], mx = (pr.x + sp.x) / 2;
      return 'C' + mx + ' ' + pr.y + ' ' + mx + ' ' + sp.y + ' ' + sp.x + ' ' + sp.y;
    }).join(' ');
    var furthest = -1;
    for (var fi = W0.from; fi < W0.to; fi++) if (unlocked(fi)) furthest = fi;
    grid.innerHTML = '<svg class="trail" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="' + d + '" class="trail-shadow"/><path d="' + d + '" class="trail-line"/></svg>';
    $('worldName').textContent = W0.name;
    $('worldSub').textContent = 'World ' + (page + 1) + '  \u00b7  Levels ' + (W0.from + 1) + '-' + W0.to;
    $('worldPrev').disabled = page === 0;
    $('worldNext').disabled = page === WORLDS.length - 1;
    attractTheme = W0.theme;
    $('worldDots').innerHTML = WORLDS.map(function (w, k) {
      return '<i class="' + (k === page ? 'on' : unlocked(w.from) ? '' : 'locked') + '"></i>';
    }).join('');
    LEVELS.slice(W0.from, W0.to).forEach(function (lv, j) {
      var i = W0.from + j;
      var b = document.createElement('button');
      var open = unlocked(i), st = progress.stars[i] || 0;
      b.className = 'lvl' + (open ? '' : ' locked') + (i === furthest && !st ? ' next' : '') + (j === count - 1 ? ' boss' : '');
      b.style.left = spots[j].x + '%';
      b.style.top = spots[j].y + '%';
      b.setAttribute('aria-label', 'Level ' + (i + 1) + ': ' + lv.name + (open ? ', ' + st + ' stars' : ', locked'));
      if (open) {
        var stars = '';
        for (var k = 0; k < 3; k++) stars += '<span class="' + (k < st ? '' : 'off') + '">★</span>';
        b.innerHTML = (j === count - 1 ? '<span class="crown">\ud83d\udc51</span>' : '') +
          '<span>' + (i + 1) + '</span><span class="stars">' + stars + '</span>' +
          '<span class="lvl-name">' + lv.name + '</span>';
        b.onclick = function () { startLevel(i); };
      } else {
        b.innerHTML = '<svg viewBox="0 0 24 24"><path d="M7 10V8a5 5 0 0 1 10 0v2h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm2 0h6V8a3 3 0 0 0-6 0z"/></svg>';
      }
      grid.appendChild(b);
    });
  }

  function openLevels(atPage) {
    page = atPage === undefined ? furthestWorld() : atPage;
    buildLevelGrid();
    show('levels');
  }
  $('worldPrev').onclick = function () { if (page > 0) { page--; buildLevelGrid(); } };
  $('worldNext').onclick = function () { if (page < WORLDS.length - 1) { page++; buildLevelGrid(); } };

  /* ----------------------------------------------------------------- level */
  function startLevel(i) {
    var lv = LEVELS[i];
    E.load(lv);
    var bandits = E.bandits.length, blockValue = 0;
    E.blocks.forEach(function (b) { var ud = b.getUserData(); blockValue += ud.kind === 'tnt' ? 1000 : ({ wood: 500, stone: 800, ice: 300 })[ud.m]; });
    var P = bandits * 5000 + blockValue;
    S = {
      index: i, level: lv, queue: lv.birds.slice(), loaded: null, flying: [],
      phase: 'aim', pull: null, dragging: false, wait: 0, ended: false,
      thresholds: [bandits * 5000, Math.round(P * 0.5 / 1000) * 1000, Math.round((P * 0.75 + 10000) / 1000) * 1000]
    };
    $('lvlName').textContent = (i + 1) + '. ' + lv.name;
    $('pauseSub').textContent = 'Level ' + (i + 1) + ': ' + lv.name;
    buildStarMarkers();
    loadNextBird();
    E.startIntro();
    showBanner(i, lv);
    paused = false;
    show(null);
  }

  function showBanner(i, lv) {
    var w = WORLDS[worldOf(i)], el = $('banner');
    $('bannerWorld').textContent = 'World ' + (worldOf(i) + 1) + '  \u00b7  ' + w.name;
    $('bannerName').textContent = lv.name;
    $('bannerNum').textContent = 'Level ' + (i + 1);
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    // the hint waits until the banner has gone
    var hint = $('hint');
    hint.style.visibility = 'hidden';
    clearTimeout(showBanner.timer);
    var done = function () { clearTimeout(showBanner.timer); hint.style.visibility = ''; };
    el.onanimationend = el.onwebkitanimationend = done;
    showBanner.timer = setTimeout(done, 3000);
  }

  function praise(text) {
    var el = document.createElement('div');
    el.className = 'popup toon praise';
    el.textContent = text;
    $('hud').appendChild(el);
    setTimeout(function () { removeEl(el); }, 1500);
  }

  function buildStarMarkers() {
    var bar = $('scoreBar');
    Array.prototype.slice.call(bar.querySelectorAll('b')).forEach(function (n) { removeEl(n); });
    S.thresholds.forEach(function (t, k) {
      var m = document.createElement('b');
      m.style.left = Math.min(100, (t / S.thresholds[2]) * 100) + '%';
      m.innerHTML = ART.starSVG(false);
      m.dataset.k = k;
      bar.appendChild(m);
    });
  }

  function renderCards() {
    var el = $('cards');
    el.innerHTML = '';
    var list = (S.loaded ? [S.loaded] : []).concat(S.queue);
    list.slice(0, 5).forEach(function (type, k) {
      var c = document.createElement('div');
      c.className = 'bcard' + (k === 0 && S.loaded ? ' next' : '');
      var icon = document.createElement('canvas');
      icon.width = icon.height = 128;
      icon.getContext('2d').drawImage(ART.birdIcon(type), 0, 0);
      c.appendChild(icon);
      el.appendChild(c);
    });
  }

  function loadNextBird() {
    S.loaded = S.queue.length ? S.queue.shift() : null;
    S.phase = S.loaded ? 'aim' : 'out';
    S.pull = null;
    E.frameCam(false);
    if (S.loaded) {
      $('hint').textContent = HINTS[S.loaded];
      $('hint').style.opacity = 1;
    }
    renderCards();
  }

  /* ----------------------------------------------------------------- input */
  function worldFromEvent(e) {
    var r = canvas.getBoundingClientRect();
    return E.toWorld(e.clientX - r.left, e.clientY - r.top);
  }

  function inputDown(e) {
    if (!S || paused || S.ended) return;
    if (E.introT > 0) { E.skipIntro(); return; }
    var w = worldFromEvent(e);
    if (S.phase === 'aim' && S.loaded) {
      var dx = w.x - REST.x, dy = w.y - REST.y;
      if (dx * dx + dy * dy < GRAB_RADIUS * GRAB_RADIUS || w.x < 2) {
        S.dragging = true;
        updatePull(w);
        SFX.stretch();
      }
    } else if (S.phase === 'flying') {
      useAbility();
    }
  }
  function inputMove(e) {
    if (S && S.dragging) updatePull(worldFromEvent(e));
  }
  function inputUp() {
    if (!S || !S.dragging) return;
    S.dragging = false;
    var p = S.pull;
    if (!p || Math.hypot(p.x, p.y) < 0.35) { S.pull = null; return; }
    launch(-p.x * POWER, -p.y * POWER);
  }
  var touchId = null, usingTouch = false;
  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault(); usingTouch = true;
    if (touchId !== null) return;
    var t = e.changedTouches[0]; touchId = t.identifier;
    inputDown(t);
  }, false);
  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault();
    for (var i = 0; i < e.changedTouches.length; i++) if (e.changedTouches[i].identifier === touchId) inputMove(e.changedTouches[i]);
  }, false);
  function touchEnd(e) {
    for (var i = 0; i < e.changedTouches.length; i++) if (e.changedTouches[i].identifier === touchId) { touchId = null; if (e.type === 'touchcancel') { if (S) { S.dragging = false; S.pull = null; } } else inputUp(); }
  }
  canvas.addEventListener('touchend', touchEnd, false);
  canvas.addEventListener('touchcancel', touchEnd, false);
  canvas.addEventListener('mousedown', function (e) { if (!usingTouch) inputDown(e); }, false);
  window.addEventListener('mousemove', function (e) { if (!usingTouch) inputMove(e); }, false);
  window.addEventListener('mouseup', function () { if (!usingTouch) inputUp(); }, false);

  function updatePull(w) {
    var dx = w.x - REST.x, dy = w.y - REST.y, len = Math.hypot(dx, dy);
    if (len > MAX_PULL) { dx *= MAX_PULL / len; dy *= MAX_PULL / len; }
    // don't let the pouch sink into the ground
    if (REST.y + dy < 0.6) dy = 0.6 - REST.y;
    S.pull = { x: dx, y: dy };
  }

  window.addEventListener('keydown', function (e) {
    if (!S || S.ended) return;
    if (e.key === ' ' && S.phase === 'flying') { e.preventDefault(); useAbility(); }
    if (e.key === 'r' || e.key === 'R') startLevel(S.index);
    if (e.key === 'Escape') togglePause();
  });

  /* ---------------------------------------------------------------- flight */
  function launch(vx, vy) {
    var type = S.loaded, px = REST.x + S.pull.x, py = REST.y + S.pull.y;
    var body = E.addBird(type, px, py);
    body.setLinearVelocity(pl.Vec2(vx, vy));
    body.getUserData().launched = true;
    S.flying = [body];
    S.loaded = null; S.pull = null;
    S.phase = 'flying'; S.abilityUsed = false; S.wait = 0; S.shotStart = E.score; S.judged = false;
    $('hint').style.opacity = 0;
    renderCards();
    SFX.launch();
  }

  function useAbility() {
    if (S.abilityUsed || !S.flying.length) return;
    var b = S.flying[0], ud = b.getUserData();
    if (ud.hit && ud.type !== 'boomer') return;
    var p = b.getPosition(), v = b.getLinearVelocity();
    if (ud.type === 'zip') {
      b.setLinearVelocity(pl.Vec2(v.x * 2.3, v.y * 2.3));
      E.burst(p.x, p.y, 'puff', ['#ffffff'], 6, 0.3, 2);
      SFX.launch();
    } else if (ud.type === 'trio') {
      [-0.2, 0.2].forEach(function (off) {
        var c = Math.cos(off), s = Math.sin(off);
        var nb = E.addBird('trio', p.x, p.y + off * 2.2);
        nb.setLinearVelocity(pl.Vec2(v.x * c - v.y * s, v.x * s + v.y * c));
        nb.getUserData().launched = true;
        S.flying.push(nb);
      });
      E.burst(p.x, p.y, 'feather', [ART.BIRDS.trio.base], 6, 0.2, 3);
    } else if (ud.type === 'boomer') {
      E.explode(p.x, p.y, 3.6, 48);
      E.removeBird(b);
      S.flying.splice(0, 1);
    } else {
      return;
    }
    S.abilityUsed = true;
  }

  function touching(body) {
    for (var ce = body.getContactList(); ce; ce = ce.next) if (ce.contact.isTouching()) return true;
    return false;
  }

  function updateFlight(dt) {
    for (var i = S.flying.length - 1; i >= 0; i--) {
      var b = S.flying[i], ud = b.getUserData(), p = b.getPosition(), v = b.getLinearVelocity();
      ud.age += dt;
      if (!ud.hit && touching(b)) {
        ud.hit = true; ud.hitAt = ud.age; ud.squash = 0.35;
        E.burst(p.x, p.y, 'feather', [ART.BIRDS[ud.type].base, ART.BIRDS[ud.type].belly], 4, 0.18, 2);
      }
      if (!ud.hit && (ud.trail.length === 0 || Math.hypot(p.x - ud.trail[ud.trail.length - 1].x, p.y - ud.trail[ud.trail.length - 1].y) > 0.55)) {
        ud.trail.push({ x: p.x, y: p.y });
      }
      // Boomer blows up on its own shortly after landing
      if (ud.type === 'boomer' && ud.hit && !S.abilityUsed && ud.age - ud.hitAt > 1.4) {
        E.explode(p.x, p.y, 3.6, 48); E.removeBird(b); S.flying.splice(i, 1); S.abilityUsed = true; continue;
      }
      var speed = Math.hypot(v.x, v.y);
      ud.still = speed < 0.6 ? ud.still + dt : 0;
      var gone = ud.still > 1.1 || ud.age > 11 || p.y < -3 || p.x > E.extentX + 25 || p.x < -20;
      if (gone) { E.removeBird(b); S.flying.splice(i, 1); }
    }
    if (S.flying.length) {
      var lead = S.flying[0].getPosition();
      E.followPoint(lead.x, lead.y);
    } else {
      S.phase = 'settling'; S.wait = 0;
      E.frameCam(false);
    }
  }

  function judgeShot() {
    if (S.judged || S.shotStart === undefined) return;
    S.judged = true;
    var gained = E.score - S.shotStart;
    if (gained >= 25000) praise('INCREDIBLE!');
    else if (gained >= 15000) praise('AWESOME!');
    else if (gained >= 8000) praise('GREAT!');
    else if (gained < 500 && E.bandits.length) E.taunt();
  }

  function updateSettling(dt) {
    S.wait += dt;
    if (S.wait < 0.8) return;
    if (E.settled() || S.wait > 2.5) judgeShot();
    if (E.bandits.length === 0 && (E.settled() || S.wait > 2.5)) return win();
    if (!E.settled() && S.wait < 4) return;
    if (E.bandits.length === 0) return win();
    if (S.queue.length === 0) return lose();
    loadNextBird();
  }

  /* ---------------------------------------------------------------- endings */
  function win() {
    S.ended = true; S.phase = 'done';
    E.confetti(130);
    var remaining = (S.loaded ? 1 : 0) + S.queue.length;
    var delay = 0;
    for (var k = 0; k < remaining; k++) {
      (function (k) {
        setTimeout(function () {
          E.score += 10000;
          E.popup(-1.6, 2.2 + k * 1.0, '+10000', '#ffd23f', 0.75);   // stacked so they never overlap
          SFX.bandit();
        }, 500 + k * 450);
      })(k);
      delay = 500 + k * 450;
    }
    setTimeout(function () {
      var score = E.score, st = 1;
      if (score >= S.thresholds[1]) st = 2;
      if (score >= S.thresholds[2]) st = 3;
      progress.stars[S.index] = Math.max(progress.stars[S.index] || 0, st);
      saveProgress();
      $('winScore').textContent = score.toLocaleString();
      $('winStars').innerHTML = [0, 1, 2].map(function (k) { return ART.starSVG(k < st); }).join('');
      Array.prototype.forEach.call($('winStars').querySelectorAll('.s-on'), function (s, k) { s.style.animationDelay = (0.25 + k * 0.3) + 's'; });
      setClass($('winNext'), 'hidden', S.index >= LEVELS.length - 1);
      SFX.win();
      show('win');
    }, delay + 900);
  }

  function lose() {
    S.ended = true; S.phase = 'done';
    setTimeout(function () { SFX.lose(); show('lose'); }, 500);
  }

  function togglePause() {
    if (!S || S.ended) return;
    paused = !paused;
    show(paused ? 'pause' : null);
  }

  /* ------------------------------------------------------------------- HUD */
  var shownScore = 0;
  function updateHud() {
    shownScore += (E.score - shownScore) * 0.2;
    if (Math.abs(E.score - shownScore) < 5) shownScore = E.score;
    var sv = String(Math.round(shownScore)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (sv !== updateHud.last) { updateHud.last = sv; $('scoreVal').textContent = sv; $('scoreFill').style.width = Math.min(100, (shownScore / S.thresholds[2]) * 100) + '%'; }
    else return;
    Array.prototype.forEach.call($('scoreBar').querySelectorAll('b'), function (m) {
      var on = shownScore >= S.thresholds[+m.dataset.k];
      if (m.dataset.on !== String(on)) { m.dataset.on = String(on); m.innerHTML = ART.starSVG(on); }
    });
  }

  /* ---------------------------------------------------------------- render */
  function pouchPos() {
    return S && S.pull ? { x: REST.x + S.pull.x, y: REST.y + S.pull.y } : REST;
  }

  var hooks = {
    behindSling: function (at) {
      // waiting birds hop in line behind the slingshot
      // spaced by size so a long queue stays on screen
      var qx = -0.9;
      S.queue.slice(0, 4).forEach(function (type, k) {
        var r = ART.BIRDS[type].r, hop = Math.max(0, Math.sin(E.t * 3 + k * 1.3)) * 0.25;
        qx -= r + 0.18;
        var x = qx;
        at(x, r + hop, 0, function () { ART.drawBird(ctx, type, r, { t: E.t, blink: ((E.t + k) % 4) < 0.1 }); });
        qx -= r;
      });
      var p = pouchPos();
      at(0, 0, 0, function () { ART.drawBand(ctx, FORK_BACK.x, -FORK_BACK.y, p.x, -p.y, false); });
    },
    loaded: function (at) {
      var p = pouchPos();
      at(0, 0, 0, function () { ART.drawPouch(ctx, p.x, -p.y, 0); });
      if (S.loaded) {
        var r = ART.BIRDS[S.loaded].r;
        var ang = S.pull ? Math.atan2(-S.pull.y, -S.pull.x) : 0;
        at(p.x + (S.pull ? 0 : 0.05), p.y, ang, function () {
          ART.drawBird(ctx, S.loaded, r, { t: E.t, squash: S.dragging ? 0.06 : 0 });
        });
      }
    },
    frontBand: function (at) {
      var p = pouchPos();
      at(0, 0, 0, function () { ART.drawBand(ctx, FORK_FRONT.x, -FORK_FRONT.y, p.x, -p.y, true); });
      if (S.pull && S.loaded && Math.hypot(S.pull.x, S.pull.y) > 0.35) {
        var vx = -S.pull.x * POWER, vy = -S.pull.y * POWER, x = p.x, y = p.y;
        for (var i = 0; i < 26; i++) {
          x += vx * 0.07; vy -= 10 * 0.07; y += vy * 0.07;
          if (y < 0) break;
          (function (x, y, i) {
            at(x, y, 0, function () {
              ctx.globalAlpha = 1 - i / 30;
              ctx.fillStyle = '#ffffff';
              ctx.beginPath(); ctx.arc(0, 0, 0.1, 0, Math.PI * 2); ctx.fill();
              ctx.globalAlpha = 1;
            });
          })(x, y, i);
        }
      }
    }
  };

  /* ------------------------------------------------------------------ loop */
  function resize() {
    var dpr = window.FF_DPR || window.devicePixelRatio || 1;
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    E.resize(innerWidth, innerHeight);
  }
  window.addEventListener('resize', resize);

  var last = performance.now(), acc = 0;
  // Adaptive quality: if frames stay slow while playing, drop the cosmetic
  // screen passes. Long gaps (a hidden tab) are ignored. ?hq forces full quality.
  var slowFrames = 0, forceHQ = /[?&]hq\b/.test(location.search);
  if (window.IPOD && IPOD.oldIOS && !forceHQ) E.lowFx = true;   // the A4 needs the cheap effects from the start
  var lastDraw = 0;
  function frame() {
    requestAnimationFrame(frame);
    var now = performance.now();
    if (window.IPOD && IPOD.oldIOS && now - lastDraw < 30) return;   // ~30 fps on the iPod
    lastDraw = now;
    var rawDt = Math.max(0, (now - last) / 1000);
    var dt = Math.min(0.05, rawDt);
    last = now;
    if (S && !paused && !E.lowFx && !forceHQ && rawDt < 0.25) {
      slowFrames = rawDt > 0.034 ? slowFrames + 1 : Math.max(0, slowFrames - 2);
      if (slowFrames > 120) E.lowFx = true;
    }
    if (S && !paused) {
      E.updateTimeScale(dt);
      acc += dt * E.timeScale;
      while (acc >= 1 / 60) {
        acc -= 1 / 60;
        E.step(1 / 60);
        if (!S.ended) {
          if (S.phase === 'flying') updateFlight(1 / 60);
          else if (S.phase === 'settling' || S.phase === 'out') updateSettling(1 / 60);
        }
      }
      E.updateCam(dt);
      updateHud();
    }
    if (S) E.render(ctx, hooks);
    else drawAttract(now / 1000);
  }

  // Title backdrop: the scenery with a few birds, no physics.
  function drawAttract(t) {
    var dpr = window.FF_DPR || window.devicePixelRatio || 1, W = innerWidth, H = innerHeight, pal = ART.theme(attractTheme);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var gy = H * 0.78;
    ART.drawSky(ctx, W, H, pal, gy, t);
    ART.drawParallax(ctx, W, H, pal, { x: t * 1.5, zoom: 40 }, gy, t);
    var s0 = Math.max(40, H / 14);
    ctx.setTransform(s0 * dpr, 0, 0, s0 * dpr, 0, gy * dpr);
    ART.drawGround(ctx, pal, -1, W / s0 + 1);
    ART.drawForeground(ctx, pal, -1, W / s0 + 1, t);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var s = Math.max(40, H / 14);
    [['rusty', 0.22], ['zip', 0.36], ['boomer', 0.64], ['tank', 0.8]].forEach(function (b, k) {
      var r = ART.BIRDS[b[0]].r, hop = Math.max(0, Math.sin(t * 3 + k)) * 0.35;
      ctx.setTransform(s * dpr, 0, 0, s * dpr, W * b[1] * dpr, (gy - (r + hop) * s) * dpr);
      ART.drawBird(ctx, b[0], r, { t: t, blink: ((t + k) % 4) < 0.1 });
    });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ART.drawVignette(ctx, W, H, pal.night);
  }

  /* -------------------------------------------------------------- wiring */
  $('playBtn').onclick = function () { openLevels(); };
  $('levelsBack').onclick = function () { S = null; attractTheme = 0; show('title'); };
  $('pauseBtn').onclick = togglePause;
  $('restartBtn').onclick = function () { if (S) startLevel(S.index); };
  $('pauseResume').onclick = togglePause;
  $('pauseRestart').onclick = function () { startLevel(S.index); };
  $('pauseMenu').onclick = function () { var at = worldOf(S.index); S = null; paused = false; openLevels(at); };
  $('winMenu').onclick = $('loseMenu').onclick = function () { var at = worldOf(S.index); S = null; openLevels(at); };
  $('winRetry').onclick = $('loseRetry').onclick = function () { startLevel(S.index); };
  $('winNext').onclick = function () { startLevel(Math.min(LEVELS.length - 1, S.index + 1)); };

  resize();
  requestAnimationFrame(frame);
})();
