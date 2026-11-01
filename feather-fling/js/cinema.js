/* Feather Fling — cinematic screen-space layers: out-of-focus foreground framing,
 * light shafts and per-world colour grading. All functions draw in CSS pixels. */
(function () {
  'use strict';
  var ART = window.ART, TAU = Math.PI * 2;
  var hasFilter = (function () { try { return 'filter' in document.createElement('canvas').getContext('2d'); } catch (e) { return false; } })();
  ART.hasFilter = hasFilter;

  var LOOK = {
    'Meadow':         { grade: 'rgba(255,230,170,0.22)', frame: 'bush',   col: ['#1f5a26', '#2f7a34'], shaft: 'rgba(255,245,200,0.10)' },
    'Sunset Canyon':  { grade: 'rgba(255,140,80,0.26)',  frame: 'rocks',  col: ['#4a2414', '#6a3418'], shaft: 'rgba(255,210,150,0.10)' },
    'Snowy Peaks':    { grade: 'rgba(160,195,255,0.22)', frame: 'boughs', col: ['#1d4a3e', '#f4f8ff'], shaft: 'rgba(235,245,255,0.08)' },
    'Tropical Beach': { grade: 'rgba(255,235,170,0.18)', frame: 'fronds', col: ['#1f6a36', '#2f8a44'], shaft: 'rgba(255,250,210,0.10)' },
    'Moonlit Castle': { grade: 'rgba(110,90,255,0.26)',  frame: 'branch', col: ['#0a0a18', '#16162a'], shaft: 'rgba(190,200,255,0.07)' },
    'Jungle Ruins':   { grade: 'rgba(170,255,170,0.18)', frame: 'leaves', col: ['#0f4a22', '#1f6a30'], shaft: 'rgba(230,255,200,0.12)' },
    'Volcano Isle':   { grade: 'rgba(255,90,30,0.26)',   frame: 'lava',   col: ['#140a0a', '#2a1410'], shaft: 'rgba(255,160,90,0.08)' }
  };
  ART.look = function (pal) { return LOOK[pal.name] || LOOK['Meadow']; };

  function leaf(c, x, y, len, wid, ang, col) {
    c.save(); c.translate(x, y); c.rotate(ang);
    c.fillStyle = col;
    c.beginPath(); c.moveTo(0, 0);
    c.quadraticCurveTo(len * 0.5, -wid, len, 0); c.quadraticCurveTo(len * 0.5, wid, 0, 0);
    c.fill(); c.restore();
  }

  // Paints the framing silhouettes for one side into an offscreen canvas.
  function paintFrame(c, W, H, look, side) {
    // kept small so the frame never hides the slingshot or bandits near the edges
    var s = Math.max(W, H) / 1500, x0 = side < 0 ? 0 : W, dir = -side;
    var a = look.col[0], b = look.col[1];
    if (look.frame === 'bush' || look.frame === 'leaves' || look.frame === 'fronds') {
      var count = look.frame === 'leaves' ? 9 : 7;
      for (var i = 0; i < count; i++) {
        var len = (look.frame === 'leaves' ? 260 : 190) * s * (0.7 + (i % 3) * 0.2);
        var baseY = H + 30 * s - i * 14 * s;
        var ang = side < 0 ? -0.2 - i * 0.22 : Math.PI + 0.2 + i * 0.22;
        leaf(c, x0, baseY, len, len * (look.frame === 'fronds' ? 0.12 : 0.3), ang, i % 2 ? a : b);
      }
      if (look.frame === 'fronds' && side > 0) {
        for (var f = 0; f < 6; f++) leaf(c, W + 20 * s, -20 * s, 260 * s, 26 * s, Math.PI * 0.62 + f * 0.13, f % 2 ? a : b);
      }
      if (look.frame === 'leaves' && side < 0) {
        for (var g = 0; g < 5; g++) leaf(c, -20 * s, -30 * s, 300 * s, 80 * s, 0.35 + g * 0.2, g % 2 ? a : b);
      }
    } else if (look.frame === 'rocks' || look.frame === 'lava') {
      c.fillStyle = a;
      c.beginPath();
      c.moveTo(x0, H); c.lineTo(x0 + dir * 260 * s, H); c.lineTo(x0 + dir * 200 * s, H - 70 * s);
      c.lineTo(x0 + dir * 120 * s, H - 150 * s); c.lineTo(x0 + dir * 40 * s, H - 190 * s); c.lineTo(x0, H - 170 * s);
      c.fill();
      c.fillStyle = b;
      c.beginPath(); c.moveTo(x0, H); c.lineTo(x0 + dir * 150 * s, H); c.lineTo(x0 + dir * 90 * s, H - 90 * s); c.lineTo(x0, H - 110 * s); c.fill();
      if (look.frame === 'lava') {
        c.strokeStyle = 'rgba(255,110,40,0.9)'; c.lineWidth = 6 * s; c.lineJoin = 'round';
        c.beginPath(); c.moveTo(x0 + dir * 30 * s, H - 150 * s); c.lineTo(x0 + dir * 80 * s, H - 90 * s); c.lineTo(x0 + dir * 60 * s, H - 30 * s); c.stroke();
      }
    } else if (look.frame === 'boughs') {
      for (var k = 0; k < 7; k++) {
        var by = H * 0.02 + k * 22 * s, bl = (320 - k * 26) * s;
        c.fillStyle = a;
        c.beginPath(); c.moveTo(x0, by); c.lineTo(x0 + dir * bl, by + 30 * s); c.lineTo(x0, by + 60 * s); c.fill();
        c.fillStyle = b;
        c.beginPath(); c.moveTo(x0, by); c.lineTo(x0 + dir * bl * 0.8, by + 24 * s); c.lineTo(x0, by + 14 * s); c.fill();
      }
    } else if (look.frame === 'branch') {
      c.strokeStyle = a; c.lineCap = 'round';
      c.lineWidth = 34 * s;
      c.beginPath(); c.moveTo(x0, 60 * s); c.quadraticCurveTo(x0 + dir * 200 * s, 40 * s, x0 + dir * 360 * s, 120 * s); c.stroke();
      c.lineWidth = 14 * s;
      [[140, 50, 220, -20], [230, 70, 300, 10], [280, 100, 380, 170]].forEach(function (t2) {
        c.beginPath(); c.moveTo(x0 + dir * t2[0] * s, t2[1] * s); c.lineTo(x0 + dir * t2[2] * s, t2[3] * s); c.stroke();
      });
    }
  }

  var frameCache = { key: '', canvas: null };
  function frameCanvas(W, H, pal) {
    var key = pal.name + W + 'x' + H;
    if (frameCache.key === key) return frameCache.canvas;
    var look = ART.look(pal);
    var raw = document.createElement('canvas');
    raw.width = W; raw.height = H;
    var rc = raw.getContext('2d');
    paintFrame(rc, W, H, look, -1);
    paintFrame(rc, W, H, look, 1);
    var out = raw;
    if (hasFilter) {
      out = document.createElement('canvas');
      out.width = W; out.height = H;
      var oc = out.getContext('2d');
      oc.filter = 'blur(' + Math.round(Math.max(W, H) / 170) + 'px)';
      oc.drawImage(raw, 0, 0);
    }
    frameCache = { key: key, canvas: out };
    return out;
  }

  // Out-of-focus silhouettes at the screen edges that drift slightly with the camera.
  ART.drawFrame = function (ctx, W, H, pal, cam) {
    var cv = frameCanvas(Math.round(W), Math.round(H), pal);
    var drift = Math.sin(cam.x * 0.06) * W * 0.025, bob = Math.cos(cam.y * 0.1) * H * 0.01;
    ctx.save();
    ctx.globalAlpha = hasFilter ? 0.95 : 0.7;
    ctx.drawImage(cv, drift - W * 0.02, bob, W * 1.04, H);
    ctx.restore();
  };

  // Soft diagonal shafts of light from the top of the screen.
  ART.drawShafts = function (ctx, W, H, pal, t) {
    var look = ART.look(pal);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < 5; i++) {
      var x = W * (0.45 + i * 0.13), wv = W * (0.035 + (i % 2) * 0.03);
      var a = 0.55 + 0.45 * Math.sin(t * 0.4 + i * 1.7);
      var g = ctx.createLinearGradient(x, 0, x - H * 0.55, H);
      g.addColorStop(0, look.shaft);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = a;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - wv, 0); ctx.lineTo(x + wv, 0); ctx.lineTo(x + wv - H * 0.6, H); ctx.lineTo(x - wv - H * 0.6, H);
      ctx.fill();
    }
    ctx.restore();
  };

  // Per-world colour grade.
  ART.drawGrade = function (ctx, W, H, pal) {
    var look = ART.look(pal);
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = look.grade;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  };
})();
