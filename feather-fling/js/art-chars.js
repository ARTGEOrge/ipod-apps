/* Feather Fling — characters, particles and icons.
 * Characters draw in a local frame: origin at the centre, y DOWN, radius r in metres. */
(function () {
  'use strict';
  var ART = window.ART = window.ART || {};
  var TAU = Math.PI * 2;

  function circle(ctx, x, y, r, fill) {
    ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  function shaded(ctx, r, light, base, dark) {
    var g = ctx.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.08, 0, 0, r * 1.05);
    g.addColorStop(0, light); g.addColorStop(0.6, base); g.addColorStop(1, dark);
    return g;
  }
  function outline(ctx, r) {
    ctx.strokeStyle = 'rgba(40,20,20,0.55)'; ctx.lineWidth = r * 0.07;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
  }
  function eye(ctx, x, y, s, blink, look, scared, lookY) {
    lookY = lookY || 0;
    if (blink) {
      ctx.strokeStyle = '#2a1a14'; ctx.lineWidth = s * 0.28; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(x, y - s * 0.1, s * 0.75, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
      return;
    }
    circle(ctx, x, y, s, '#ffffff');
    ctx.strokeStyle = 'rgba(40,20,20,0.35)'; ctx.lineWidth = s * 0.12;
    ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.stroke();
    if (scared) {
      circle(ctx, x + s * 0.1 * (look || 1), y, s * 0.24, '#1d1410');
      circle(ctx, x, y - s * 0.08, s * 0.08, '#ffffff');
      return;
    }
    circle(ctx, x + s * 0.32 * (look || 1), y + s * 0.05 + s * 0.3 * lookY, s * 0.52, '#1d1410');
    circle(ctx, x + s * 0.12 * (look || 1), y - s * 0.2 + s * 0.3 * lookY, s * 0.18, '#ffffff');
    circle(ctx, x + s * 0.5 * (look || 1), y + s * 0.28, s * 0.08, 'rgba(255,255,255,0.8)');
  }

  /* ------------------------------------------------------------------ birds */
  var BIRDS = {
    rusty:  { name: 'Rusty',  r: 0.42, light: '#ff9a6a', base: '#e8572a', dark: '#a8321a', belly: '#ffd2a1', crest: '#c7401f' },
    zip:    { name: 'Zip',    r: 0.38, light: '#7df2e3', base: '#1fbcae', dark: '#0f7d73', belly: '#e9fffb', crest: '#0f8f84' },
    trio:   { name: 'Trio',   r: 0.3,  light: '#c7a4ff', base: '#8a55e0', dark: '#5a2fa6', belly: '#efe4ff', crest: '#6d3fc2' },
    boomer: { name: 'Boomer', r: 0.5,  light: '#a86a8a', base: '#6e2f52', dark: '#3f1530', belly: '#f2c6a0', crest: '#ffb13b' },
    tank:   { name: 'Tank',   r: 0.72, light: '#c79a6a', base: '#8a5a33', dark: '#5a361a', belly: '#f1dcb8', crest: '#6b4222' }
  };
  ART.BIRDS = BIRDS;

  ART.drawBird = function (ctx, type, r, st) {
    var b = BIRDS[type]; st = st || {};
    var t = st.t || 0;
    ctx.save();
    if (st.squash) ctx.scale(1 + st.squash, 1 - st.squash);
    if (st.stretch) ctx.scale(1 + st.stretch, 1 - st.stretch * 0.6);
    if (!st.flap && !st.stretch) { var br = Math.sin(t * 3.2 + r * 10) * 0.025; ctx.scale(1 - br * 0.5, 1 + br); }

    // tail: three layered feathers with light tips
    for (var i = -1; i <= 1; i++) {
      ctx.save(); ctx.translate(-r * 0.9, r * 0.05); ctx.rotate(Math.PI + i * 0.38);
      ctx.fillStyle = b.dark;
      ctx.beginPath(); ctx.ellipse(r * 0.3, 0, r * 0.36, r * 0.11, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = b.light;
      ctx.beginPath(); ctx.ellipse(r * 0.52, 0, r * 0.12, r * 0.06, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }

    if (type === 'zip') {
      // teardrop body, pointing forward
      ctx.fillStyle = shaded(ctx, r, b.light, b.base, b.dark);
      ctx.beginPath();
      ctx.moveTo(r * 1.25, 0);
      ctx.bezierCurveTo(r * 0.7, -r * 1.05, -r * 1.05, -r * 1.0, -r, 0);
      ctx.bezierCurveTo(-r * 1.05, r * 1.0, r * 0.7, r * 1.05, r * 1.25, 0);
      ctx.fill();
      ctx.strokeStyle = 'rgba(20,40,40,0.5)'; ctx.lineWidth = r * 0.07; ctx.stroke();
    } else {
      ctx.fillStyle = shaded(ctx, r, b.light, b.base, b.dark);
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      outline(ctx, r);
    }

    // belly, softly shaded
    var bg = ctx.createLinearGradient(0, r * 0.05, 0, r * 0.85);
    bg.addColorStop(0, b.belly); bg.addColorStop(1, 'rgba(0,0,0,0.08)');
    ctx.fillStyle = b.belly;
    ctx.beginPath(); ctx.ellipse(r * 0.12, r * 0.42, r * 0.62, r * 0.42, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.ellipse(r * 0.12, r * 0.42, r * 0.62, r * 0.42, 0, 0, TAU); ctx.fill();
    // feather texture: small chevrons over the back
    ctx.strokeStyle = 'rgba(0,0,0,0.14)'; ctx.lineWidth = r * 0.035; ctx.lineCap = 'round';
    [[-0.55, -0.1], [-0.35, -0.35], [-0.6, 0.25], [-0.15, -0.62], [0.1, -0.5]].forEach(function (f) {
      ctx.beginPath();
      ctx.moveTo((f[0] - 0.07) * r, (f[1] - 0.05) * r); ctx.lineTo(f[0] * r, (f[1] + 0.04) * r); ctx.lineTo((f[0] + 0.07) * r, (f[1] - 0.05) * r);
      ctx.stroke();
    });
    // glossy shine on the crown
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.beginPath(); ctx.ellipse(-r * 0.34, -r * 0.52, r * 0.3, r * 0.14, -0.55, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.ellipse(-r * 0.5, -r * 0.44, r * 0.07, r * 0.04, -0.55, 0, TAU); ctx.fill();

    // crest
    if (type === 'boomer') {
      var flick = 0.85 + 0.15 * Math.sin(t * 22);
      ctx.fillStyle = '#ff6a1f';
      ctx.beginPath(); ctx.ellipse(-r * 0.05, -r * 1.12, r * 0.2 * flick, r * 0.34 * flick, -0.2, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffe07a';
      ctx.beginPath(); ctx.ellipse(-r * 0.05, -r * 1.08, r * 0.1 * flick, r * 0.2 * flick, -0.2, 0, TAU); ctx.fill();
      ctx.strokeStyle = b.dark; ctx.lineWidth = r * 0.1;
      ctx.beginPath(); ctx.moveTo(0, -r * 0.92); ctx.quadraticCurveTo(-r * 0.12, -r * 0.98, -r * 0.05, -r * 0.82); ctx.stroke();
    } else if (type === 'tank') {
      ctx.fillStyle = b.crest;
      ctx.beginPath(); ctx.moveTo(-r * 0.62, -r * 0.62); ctx.lineTo(-r * 0.5, -r * 1.12); ctx.lineTo(-r * 0.22, -r * 0.82); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * 0.62, -r * 0.62); ctx.lineTo(r * 0.5, -r * 1.12); ctx.lineTo(r * 0.22, -r * 0.82); ctx.fill();
    } else {
      ctx.fillStyle = b.crest;
      for (var c = 0; c < 3; c++) {
        ctx.save(); ctx.translate(-r * 0.1 + c * r * 0.14, -r * 0.88); ctx.rotate(-0.5 + c * 0.35);
        ctx.beginPath(); ctx.ellipse(0, -r * 0.18, r * 0.09, r * 0.24, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
    }

    // wing: three overlapping feathers that fan out when flapping
    var wa = -0.5 + Math.sin(t * 14) * (st.flap ? 0.5 : 0);
    ctx.save(); ctx.translate(-r * 0.18, r * 0.12); ctx.rotate(wa);
    for (var wf = 2; wf >= 0; wf--) {
      ctx.fillStyle = wf === 0 ? b.base : b.dark;
      ctx.beginPath(); ctx.ellipse(-r * (0.14 + wf * 0.06), r * wf * 0.07, r * (0.34 - wf * 0.03), r * 0.13, wf * 0.22, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = r * 0.03;
    ctx.beginPath(); ctx.ellipse(-r * 0.14, 0, r * 0.34, r * 0.13, 0, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.restore();

    // eyes
    var es = type === 'tank' ? r * 0.26 : r * 0.3;
    var ey = type === 'tank' ? -r * 0.25 : -r * 0.2;
    if (type === 'tank') { circle(ctx, r * 0.02, ey, es * 1.5, b.belly); circle(ctx, r * 0.5, ey, es * 1.5, b.belly); }
    var lx = st.lookX === undefined ? 1 : st.lookX, ly = st.lookY || 0;
    eye(ctx, r * 0.02, ey, es, st.blink, lx, false, ly);
    eye(ctx, r * 0.5, ey, es, st.blink, lx, false, ly);
    // determined brow (a small tilt, not a unibrow)
    ctx.strokeStyle = b.dark; ctx.lineWidth = r * 0.09; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-r * 0.2, ey - es * 1.35); ctx.lineTo(r * 0.16, ey - es * 1.05); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r * 0.72, ey - es * 1.35); ctx.lineTo(r * 0.38, ey - es * 1.05); ctx.stroke();

    // cheek blush
    ctx.fillStyle = 'rgba(255,110,120,0.32)';
    ctx.beginPath(); ctx.ellipse(-r * 0.12, r * 0.14, r * 0.14, r * 0.08, 0, 0, TAU); ctx.fill();
    // beak
    var bx = r * 0.62, by = r * 0.12;
    ctx.fillStyle = '#ffb21e';
    ctx.beginPath(); ctx.moveTo(bx, by - r * 0.18); ctx.lineTo(bx + r * 0.52, by + r * 0.02); ctx.lineTo(bx, by + r * 0.1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e0801a';
    ctx.beginPath(); ctx.moveTo(bx, by + r * 0.1); ctx.lineTo(bx + r * 0.4, by + r * 0.06); ctx.lineTo(bx, by + r * 0.26); ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  /* ---------------------------------------------------------------- bandits */
  ART.BANDITS = {
    small:  { r: 0.45, hp: 1 },
    mid:    { r: 0.62, hp: 2 },
    helmet: { r: 0.62, hp: 3.5 },
    big:    { r: 0.85, hp: 4 },
    boss:   { r: 1.1,  hp: 8 },
    explorer: { r: 0.62, hp: 3.5 },
    miner:  { r: 0.62, hp: 4 },
    chief:  { r: 0.95, hp: 6 }
  };

  ART.drawBandit = function (ctx, kind, r, st) {
    st = st || {};
    var hurt = st.dmg > 0.45, scared = !!st.scared && !hurt;
    var breathe = Math.sin((st.t || 0) * 2.6) * 0.025;
    ctx.scale(1 - breathe * 0.5, 1 + breathe);
    // bushy striped tail curling up behind
    ctx.save();
    ctx.translate(-r * 0.7, r * 0.55);
    ctx.rotate(-0.9 + Math.sin((st.t || 0) * 2.2) * 0.12);
    for (var seg = 0; seg < 5; seg++) {
      ctx.fillStyle = seg % 2 ? '#2a2d33' : '#8a939e';
      ctx.beginPath(); ctx.ellipse(-seg * r * 0.2, -seg * r * 0.05, r * (0.24 - seg * 0.02), r * 0.18, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
    // ears
    [-1, 1].forEach(function (s) {
      ctx.save(); ctx.translate(s * r * 0.62, -r * 0.72); ctx.rotate(s * 0.35);
      ctx.fillStyle = '#6f7884'; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.26, r * 0.32, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2a2d33'; ctx.beginPath(); ctx.ellipse(0, r * 0.04, r * 0.13, r * 0.19, 0, 0, TAU); ctx.fill();
      ctx.restore();
    });
    // head
    ctx.fillStyle = shaded(ctx, r, '#d4dbe3', '#9aa4b0', '#626b77');
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    outline(ctx, r);
    // fur tuft on top of the head
    ctx.fillStyle = '#9aa4b0';
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, -r * 0.92); ctx.lineTo(-r * 0.1, -r * 1.14); ctx.lineTo(0, -r * 0.94);
    ctx.lineTo(r * 0.12, -r * 1.18); ctx.lineTo(r * 0.2, -r * 0.92); ctx.closePath(); ctx.fill();
    // pale muzzle
    ctx.fillStyle = '#f2f4f7';
    ctx.beginPath(); ctx.ellipse(0, r * 0.38, r * 0.58, r * 0.42, 0, 0, TAU); ctx.fill();
    // bandit mask
    ctx.fillStyle = '#23262c';
    ctx.beginPath();
    ctx.moveTo(-r * 0.95, -r * 0.2);
    ctx.quadraticCurveTo(-r * 0.5, -r * 0.55, 0, -r * 0.28);
    ctx.quadraticCurveTo(r * 0.5, -r * 0.55, r * 0.95, -r * 0.2);
    ctx.quadraticCurveTo(r * 0.7, r * 0.18, r * 0.2, r * 0.05);
    ctx.quadraticCurveTo(0, r * 0.12, -r * 0.2, r * 0.05);
    ctx.quadraticCurveTo(-r * 0.7, r * 0.18, -r * 0.95, -r * 0.2);
    ctx.fill();
    // eyes (one squeezed shut when hurt)
    var es = r * 0.17;
    // eyebrows: raised when scared, low and sly otherwise
    ctx.strokeStyle = '#1a1c20'; ctx.lineWidth = r * 0.07; ctx.lineCap = 'round';
    [-1, 1].forEach(function (sd) {
      ctx.beginPath();
      if (scared) { ctx.moveTo(sd * r * 0.2, -r * 0.5); ctx.lineTo(sd * r * 0.52, -r * 0.56); }
      else { ctx.moveTo(sd * r * 0.2, -r * 0.4); ctx.lineTo(sd * r * 0.54, -r * 0.46); }
      ctx.stroke();
    });
    var blx = st.lookX === undefined ? 0.4 : st.lookX, bly = st.lookY || 0;
    if (st.laugh) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = r * 0.06; ctx.lineCap = 'round';
      [-1, 1].forEach(function (sd) { ctx.beginPath(); ctx.arc(sd * r * 0.36, -r * 0.1, es * 0.8, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke(); });
    } else
    eye(ctx, -r * 0.36, -r * 0.14, es * (scared ? 1.2 : 1), st.blink, blx, scared, bly);
    if (hurt) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = r * 0.06; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(r * 0.24, -r * 0.2); ctx.lineTo(r * 0.48, -r * 0.08); ctx.moveTo(r * 0.24, -r * 0.06); ctx.lineTo(r * 0.48, -r * 0.18); ctx.stroke();
    } else {
      if (!st.laugh) eye(ctx, r * 0.36, -r * 0.14, es * (scared ? 1.2 : 1), st.blink, blx, scared, bly);
    }
    // whiskers and blush
    ctx.strokeStyle = 'rgba(40,44,52,0.55)'; ctx.lineWidth = r * 0.025; ctx.lineCap = 'round';
    [-1, 1].forEach(function (sd) {
      for (var wk = 0; wk < 2; wk++) {
        ctx.beginPath(); ctx.moveTo(sd * r * 0.3, r * 0.26 + wk * r * 0.08); ctx.lineTo(sd * r * 0.72, r * 0.18 + wk * r * 0.16); ctx.stroke();
      }
    });
    ctx.fillStyle = 'rgba(255,140,160,0.35)';
    ctx.beginPath(); ctx.ellipse(-r * 0.5, r * 0.34, r * 0.12, r * 0.07, 0, 0, TAU); ctx.ellipse(r * 0.5, r * 0.34, r * 0.12, r * 0.07, 0, 0, TAU); ctx.fill();
    // nose + grin
    ctx.fillStyle = '#2a2d33';
    ctx.beginPath(); ctx.ellipse(0, r * 0.2, r * 0.12, r * 0.085, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(-r * 0.03, r * 0.17, r * 0.03, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2a2d33'; ctx.lineWidth = r * 0.06; ctx.lineCap = 'round';
    ctx.beginPath();
    if (hurt) ctx.arc(0, r * 0.52, r * 0.16, 1.15 * Math.PI, 1.85 * Math.PI);
    else if (st.laugh) { ctx.fillStyle = '#5a1f2a'; ctx.beginPath(); ctx.arc(0, r * 0.4, r * 0.2, 0, Math.PI); ctx.fill(); }
    else if (!scared) ctx.arc(0, r * 0.3, r * 0.22, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
    if (scared) {
      ctx.fillStyle = '#5a1f2a';
      ctx.beginPath(); ctx.ellipse(0, r * 0.47, r * 0.1, r * 0.13, 0, 0, TAU); ctx.fill();
    }
    if (!hurt && !scared) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(-r * 0.08, r * 0.49, r * 0.07, r * 0.07);
      ctx.fillRect(r * 0.01, r * 0.49, r * 0.07, r * 0.07);
    }
    if (hurt) {
      ctx.fillStyle = 'rgba(150,90,200,0.55)';
      ctx.beginPath(); ctx.ellipse(-r * 0.55, r * 0.22, r * 0.14, r * 0.1, 0, 0, TAU); ctx.fill();
    }

    if (hurt && kind !== 'helmet' && kind !== 'miner') {
      // sticking plaster across the forehead
      ctx.save(); ctx.translate(r * 0.3, -r * 0.62); ctx.rotate(0.5);
      ctx.fillStyle = '#f5deb8'; ctx.fillRect(-r * 0.3, -r * 0.08, r * 0.6, r * 0.16);
      ctx.fillStyle = '#e8c79a'; ctx.fillRect(-r * 0.08, -r * 0.08, r * 0.16, r * 0.16);
      ctx.restore();
    }

    hatFor(ctx, kind, r, st);
  };

  // Headgear, drawn in the bandit's frame. Also used on its own when it flies off.
  function hatFor(ctx, kind, r, st) {
    if (kind === 'explorer') {
      ctx.fillStyle = shaded(ctx, r, '#f3e2b0', '#d8bb78', '#a88a4a');
      ctx.beginPath(); ctx.ellipse(0, -r * 0.62, r * 1.05, r * 0.2, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(0, -r * 0.66, r * 0.62, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = '#6a4a24'; ctx.fillRect(-r * 0.62, -r * 0.8, r * 1.24, r * 0.12);
    } else if (kind === 'miner') {
      ctx.fillStyle = shaded(ctx, r, '#ffb07a', '#e8702a', '#a8401a');
      ctx.beginPath(); ctx.arc(0, -r * 0.42, r * 0.82, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = '#b8501a'; ctx.fillRect(-r * 1.0, -r * 0.46, r * 2.0, r * 0.14);
      var lamp = 0.7 + 0.3 * Math.sin((st.t || 0) * 5);
      var lg = ctx.createRadialGradient(0, -r * 0.95, 0, 0, -r * 0.95, r * 0.7);
      lg.addColorStop(0, 'rgba(255,250,200,' + lamp + ')'); lg.addColorStop(1, 'rgba(255,250,200,0)');
      ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(0, -r * 0.95, r * 0.7, 0, TAU); ctx.fill();
      circle(ctx, 0, -r * 0.95, r * 0.16, '#fff6c0');
      ctx.strokeStyle = '#6a3a1a'; ctx.lineWidth = r * 0.05; ctx.beginPath(); ctx.arc(0, -r * 0.95, r * 0.16, 0, TAU); ctx.stroke();
    } else if (kind === 'chief') {
      var cols = ['#e5484d', '#ffd23f', '#3ec1ff', '#5fdc7a', '#ff8a1f', '#c06bff', '#e5484d'];
      for (var fe = 0; fe < 7; fe++) {
        ctx.save(); ctx.translate(0, -r * 0.7); ctx.rotate((fe - 3) * 0.28);
        ctx.fillStyle = cols[fe];
        ctx.beginPath(); ctx.ellipse(0, -r * 0.5, r * 0.12, r * 0.42, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath(); ctx.ellipse(0, -r * 0.72, r * 0.05, r * 0.14, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#8a4a1a'; ctx.fillRect(-r * 0.78, -r * 0.8, r * 1.56, r * 0.16);
      [-0.5, 0, 0.5].forEach(function (bx2) { circle(ctx, bx2 * r, -r * 0.72, r * 0.06, '#ffd23f'); });
    } else if (kind === 'helmet') {
      ctx.fillStyle = shaded(ctx, r, '#ffe27a', '#f5b81c', '#b97d00');
      ctx.beginPath(); ctx.arc(0, -r * 0.42, r * 0.82, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = '#d99a10';
      ctx.fillRect(-r * 1.0, -r * 0.46, r * 2.0, r * 0.14);
      ctx.fillStyle = '#ffec9e'; ctx.fillRect(-r * 0.1, -r * 1.18, r * 0.2, r * 0.72);
      if (st.dmg > 0.5) {
        ctx.strokeStyle = '#7a5200'; ctx.lineWidth = r * 0.05;
        ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 1.0); ctx.lineTo(-r * 0.25, -r * 0.75); ctx.lineTo(-r * 0.45, -r * 0.6); ctx.stroke();
      }
    } else if (kind === 'boss') {
      ctx.fillStyle = shaded(ctx, r, '#fff1a8', '#ffc93b', '#c98a00');
      ctx.beginPath();
      ctx.moveTo(-r * 0.55, -r * 0.8);
      ctx.lineTo(-r * 0.6, -r * 1.35); ctx.lineTo(-r * 0.28, -r * 1.05);
      ctx.lineTo(0, -r * 1.45); ctx.lineTo(r * 0.28, -r * 1.05);
      ctx.lineTo(r * 0.6, -r * 1.35); ctx.lineTo(r * 0.55, -r * 0.8);
      ctx.closePath(); ctx.fill();
      circle(ctx, 0, -r * 1.02, r * 0.09, '#e5484d');
      circle(ctx, -r * 0.34, -r * 0.92, r * 0.06, '#3ec1ff');
      circle(ctx, r * 0.34, -r * 0.92, r * 0.06, '#5fdc7a');
    }
  }
  ART.HATS = { helmet: 1, explorer: 1, miner: 1, chief: 1, boss: 1 };
  ART.drawHat = function (ctx, kind, r, st) {
    ctx.translate(0, r * 0.8);
    hatFor(ctx, kind, r, st || {});
  };

  /* -------------------------------------------------------------- particles */
  // p: { kind, x, y, a, s, col, life, max }. Frame is centred on the particle, y down.
  ART.drawParticle = function (ctx, p) {
    var k = Math.max(0, p.life / p.max);
    ctx.globalAlpha = Math.min(1, k * 1.6);
    if (p.kind === 'chip') {
      ctx.fillStyle = p.col; ctx.fillRect(-p.s, -p.s * 0.45, p.s * 2, p.s * 0.9);
    } else if (p.kind === 'shard') {
      ctx.fillStyle = p.col; ctx.beginPath(); ctx.moveTo(0, -p.s); ctx.lineTo(p.s * 0.7, p.s); ctx.lineTo(-p.s * 0.7, p.s * 0.6); ctx.fill();
    } else if (p.kind === 'feather') {
      ctx.fillStyle = p.col; ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.35, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = p.s * 0.08;
      ctx.beginPath(); ctx.moveTo(-p.s, 0); ctx.lineTo(p.s, 0); ctx.stroke();
    } else if (p.kind === 'puff') {
      var rad = p.s * (1.6 - k * 0.6);
      ctx.globalAlpha = k * 0.7;
      circle(ctx, 0, 0, rad, p.col);
    } else if (p.kind === 'spark') {
      ctx.fillStyle = p.col; ART.starPath(ctx, 0, 0, p.s, 5); ctx.fill();
    } else if (p.kind === 'ring') {
      var rr2 = p.s * (1 - k) + p.s * 0.1;
      ctx.globalAlpha = k * 0.85;
      ctx.strokeStyle = p.col; ctx.lineWidth = p.s * 0.12 * k + 0.02;
      ctx.beginPath(); ctx.arc(0, 0, rr2, 0, TAU); ctx.stroke();
    } else if (p.kind === 'fire') {
      var fr = p.s * (1.3 - k * 0.5);
      var fg = ctx.createRadialGradient(0, 0, 0, 0, 0, fr);
      fg.addColorStop(0, 'rgba(255,255,220,' + k + ')');
      fg.addColorStop(0.35, 'rgba(255,190,60,' + k * 0.9 + ')');
      fg.addColorStop(0.7, 'rgba(255,90,30,' + k * 0.6 + ')');
      fg.addColorStop(1, 'rgba(120,40,20,0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(0, 0, fr, 0, TAU); ctx.fill();
    } else if (p.kind === 'confetti') {
      ctx.fillStyle = p.col;
      ctx.fillRect(-p.s, -p.s * 0.45, p.s * 2, p.s * 0.9 * Math.abs(Math.cos(p.a * 2)) + 0.01);
    } else if (p.kind === 'dust') {
      ctx.globalAlpha = k * 0.55;
      circle(ctx, 0, 0, p.s * (1.8 - k), p.col);
    } else if (p.kind === 'text') {
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.font = (p.s) + 'px "Lilita One", Arial, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = p.s * 0.16; ctx.strokeStyle = '#1f3a66'; ctx.lineJoin = 'round';
      ctx.strokeText(p.text, 0, 0);
      ctx.fillStyle = p.col; ctx.fillText(p.text, 0, 0);
    }
    ctx.globalAlpha = 1;
  };

  /* ------------------------------------------------------------------ icons */
  ART.starPath = function (ctx, x, y, r, n) {
    n = n || 5;
    ctx.beginPath();
    for (var i = 0; i < n * 2; i++) {
      var a = -Math.PI / 2 + (i * Math.PI) / n, rad = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    ctx.closePath();
  };

  ART.starSVG = function (on) {
    var fill = on ? '#ffd23f' : '#d9c7a3', stroke = on ? '#c77a00' : '#b39f7a';
    return '<svg viewBox="0 0 100 100" class="' + (on ? 's-on' : 's-off') + '"><path d="M50 5 L62 36 L96 38 L69 59 L79 93 L50 73 L21 93 L31 59 L4 38 L38 36 Z" fill="' +
      fill + '" stroke="' + stroke + '" stroke-width="6" stroke-linejoin="round"/>' +
      (on ? '<path d="M50 16 L57 36 L40 38 Z" fill="#fff" opacity=".55"/>' : '') + '</svg>';
  };

  var iconCache = {};
  ART.birdIcon = function (type) {
    if (iconCache[type]) return iconCache[type];
    var c = document.createElement('canvas');
    c.width = c.height = 128;
    var x = c.getContext('2d');
    x.translate(60, 70);
    x.scale(56, 56);
    ART.drawBird(x, type, 0.8, {});
    iconCache[type] = c;
    return c;
  };
})();
