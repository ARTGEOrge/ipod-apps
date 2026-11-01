/* Feather Fling — procedural material textures.
 *
 * Each material is painted once into a tiling 256x256 canvas and used as a
 * CanvasPattern. 128 texture pixels = 1 metre, so a block's local frame
 * (metres) needs the pattern scaled by 1/128. Everything tiles seamlessly:
 * waves use whole periods of 256 and features near an edge are drawn twice. */
(function () {
  'use strict';
  var ART = window.ART, TAU = Math.PI * 2, SIZE = 256, PX_PER_M = 128;
  var cache = {};

  function rng(seed) {
    var s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  // Draw fn at (x, y) and at its wrapped copies so features cross edges cleanly.
  function wrapped(x, y, reach, fn) {
    for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) {
      var px = x + dx * SIZE, py = y + dy * SIZE;
      if (px > -reach && px < SIZE + reach && py > -reach && py < SIZE + reach) fn(px, py);
    }
  }

  function paintWood(c) {
    var r = rng(7);
    c.fillStyle = '#d99a55'; c.fillRect(0, 0, SIZE, SIZE);
    // broad colour bands along the grain
    for (var b = 0; b < 9; b++) {
      var by = r() * SIZE, bh = 10 + r() * 34;
      c.fillStyle = r() < 0.5 ? 'rgba(255,215,150,0.18)' : 'rgba(120,60,20,0.14)';
      wrapped(0, by, 60, function (px, py) { c.fillRect(0, py, SIZE, bh); });
    }
    // fine wavy grain; whole sine periods across 256 so it tiles
    for (var y = 0; y < SIZE; y += 2.2) {
      var k = 1 + Math.floor(r() * 3), ph = r() * TAU, amp = 1 + r() * 3.5;
      c.strokeStyle = r() < 0.6 ? 'rgba(110,55,18,' + (0.08 + r() * 0.2) + ')' : 'rgba(255,225,170,' + (0.06 + r() * 0.14) + ')';
      c.lineWidth = 0.6 + r() * 1.4;
      c.beginPath();
      for (var x = 0; x <= SIZE; x += 8) {
        var yy = y + Math.sin((x / SIZE) * TAU * k + ph) * amp;
        if (x === 0) c.moveTo(x, yy); else c.lineTo(x, yy);
      }
      c.stroke();
    }
    // knots with rings
    for (var n = 0; n < 3; n++) {
      var kx = r() * SIZE, ky = r() * SIZE, kr = 5 + r() * 7;
      wrapped(kx, ky, 40, function (px, py) {
        for (var ring = 4; ring >= 1; ring--) {
          c.strokeStyle = 'rgba(100,48,14,' + (0.12 + ring * 0.06) + ')'; c.lineWidth = 1.2;
          c.beginPath(); c.ellipse(px, py, kr * ring * 0.9, kr * ring * 0.35, 0, 0, TAU); c.stroke();
        }
        c.fillStyle = 'rgba(80,36,10,0.55)';
        c.beginPath(); c.ellipse(px, py, kr * 0.6, kr * 0.3, 0, 0, TAU); c.fill();
      });
    }
    // pores
    for (var p = 0; p < 500; p++) {
      c.fillStyle = 'rgba(90,40,10,' + (0.05 + r() * 0.12) + ')';
      c.fillRect(r() * SIZE, r() * SIZE, 1 + r() * 3, 0.8);
    }
  }

  function paintStone(c) {
    var r = rng(19);
    c.fillStyle = '#5f6a76'; c.fillRect(0, 0, SIZE, SIZE);
    var cell = 64;
    for (var gy = 0; gy < 4; gy++) {
      for (var gx = 0; gx < 4; gx++) {
        var ox = (gy % 2) * cell / 2;   // staggered courses
        var cx = gx * cell + ox + cell / 2 + (r() - 0.5) * 8, cy = gy * cell + cell / 2 + (r() - 0.5) * 8;
        var rw = cell / 2 - 4 - r() * 3, rh = cell / 2 - 4 - r() * 3;
        var tone = 150 + Math.floor(r() * 40);
        var pts = [];
        for (var v = 0; v < 8; v++) {
          var a = (v / 8) * TAU + r() * 0.3;
          pts.push([Math.cos(a) * rw * (0.85 + r() * 0.15), Math.sin(a) * rh * (0.85 + r() * 0.15)]);
        }
        wrapped(cx, cy, cell, function (px, py) {
          var g = c.createRadialGradient(px - rw * 0.35, py - rh * 0.4, 2, px, py, Math.max(rw, rh) * 1.1);
          g.addColorStop(0, 'rgb(' + (tone + 45) + ',' + (tone + 50) + ',' + (tone + 58) + ')');
          g.addColorStop(0.6, 'rgb(' + tone + ',' + (tone + 6) + ',' + (tone + 14) + ')');
          g.addColorStop(1, 'rgb(' + (tone - 40) + ',' + (tone - 34) + ',' + (tone - 26) + ')');
          c.fillStyle = g;
          c.beginPath();
          pts.forEach(function (q, i) { if (i) c.lineTo(px + q[0], py + q[1]); else c.moveTo(px + q[0], py + q[1]); });
          c.closePath(); c.fill();
          c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 1.5;
          c.beginPath(); c.moveTo(px + pts[4][0], py + pts[4][1]); c.lineTo(px + pts[5][0], py + pts[5][1]); c.lineTo(px + pts[6][0], py + pts[6][1]); c.stroke();
        });
      }
    }
    for (var s = 0; s < 900; s++) {
      c.fillStyle = r() < 0.5 ? 'rgba(40,46,55,' + (0.1 + r() * 0.25) + ')' : 'rgba(255,255,255,' + (0.05 + r() * 0.15) + ')';
      var sz = 0.8 + r() * 2;
      c.fillRect(r() * SIZE, r() * SIZE, sz, sz);
    }
    for (var cr = 0; cr < 6; cr++) {   // hairline fissures
      var fx = r() * SIZE, fy = r() * SIZE;
      c.strokeStyle = 'rgba(35,40,48,0.4)'; c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(fx, fy);
      for (var st = 0; st < 4; st++) { fx += (r() - 0.5) * 18; fy += (r() - 0.5) * 18; c.lineTo(fx, fy); }
      c.stroke();
    }
  }

  function paintIce(c) {
    var r = rng(31);
    c.fillStyle = 'rgba(172,222,252,0.88)'; c.fillRect(0, 0, SIZE, SIZE);   // flat base: gradients don't tile
    // crystalline facets
    for (var f = 0; f < 70; f++) {
      var x = r() * SIZE, y = r() * SIZE, s = 16 + r() * 46;
      var p1 = [x + (r() - 0.5) * s, y + (r() - 0.5) * s], p2 = [x + (r() - 0.5) * s, y + (r() - 0.5) * s];
      var light = r() < 0.55;
      c.fillStyle = light ? 'rgba(255,255,255,' + (0.05 + r() * 0.2) + ')' : 'rgba(60,140,210,' + (0.05 + r() * 0.14) + ')';
      wrapped(x, y, s, function (px, py) {
        c.beginPath(); c.moveTo(px, py); c.lineTo(p1[0] - x + px, p1[1] - y + py); c.lineTo(p2[0] - x + px, p2[1] - y + py); c.closePath(); c.fill();
      });
    }
    // bright refracted streaks
    for (var sk = 0; sk < 8; sk++) {
      var sx = r() * SIZE, len = 40 + r() * 90;
      c.strokeStyle = 'rgba(255,255,255,' + (0.25 + r() * 0.35) + ')'; c.lineWidth = 1 + r() * 2.5;
      wrapped(sx, 0, 140, function (px) {
        c.beginPath(); c.moveTo(px, r() * SIZE); c.lineTo(px + len * 0.6, r() * SIZE * 0 + len); c.stroke();
      });
    }
    // trapped bubbles
    for (var bb = 0; bb < 40; bb++) {
      var bx = r() * SIZE, by = r() * SIZE, br = 1 + r() * 3.5;
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 0.8;
      c.beginPath(); c.arc(bx, by, br, 0, TAU); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.9)'; c.fillRect(bx - br * 0.4, by - br * 0.5, 1, 1);
    }
  }

  var PAINTERS = { wood: paintWood, stone: paintStone, ice: paintIce };

  // Returns a CanvasPattern in metre units, or null if patterns are unsupported.
  ART.texture = function (ctx, mat, rotate) {
    var key = mat;
    if (!cache[key]) {
      var cv = document.createElement('canvas');
      cv.width = cv.height = SIZE;
      PAINTERS[mat](cv.getContext('2d'));
      cache[key] = { canvas: cv, pattern: null };
    }
    var entry = cache[key];
    if (!entry.pattern) entry.pattern = ctx.createPattern(entry.canvas, 'repeat');
    var pat = entry.pattern;
    if (pat && pat.setTransform && window.DOMMatrix) {
      var m = new DOMMatrix();
      if (rotate) m = m.rotate(90);
      pat.setTransform(m.scale(1 / (mat === 'stone' ? 180 : PX_PER_M)));
    }
    return pat;
  };
})();
