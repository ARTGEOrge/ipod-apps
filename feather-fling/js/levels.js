/* Feather Fling — level data.
 *
 * World units are metres, x = 0 is the slingshot, y = 0 is the ground, y up.
 * Builders take the BOTTOM edge of what they place and return its top edge,
 * so structures stack flush without overlapping (overlaps make Box2D shove
 * pieces apart on the first frame). */
(function () {
  'use strict';
  var GAP = 0.01;

  function builder() {
    var p = [];
    var R = function (k) { return window.ART.BANDITS[k].r; };
    var b = {
      pieces: p,
      col: function (m, x, y, h, w) {
        w = w || 0.4;
        p.push({ t: 'block', m: m, x: x, y: y + h / 2 + GAP, w: w, h: h });
        return y + h + GAP;
      },
      plank: function (m, x, y, len, th) {
        th = th || 0.4;
        p.push({ t: 'block', m: m, x: x, y: y + th / 2 + GAP, w: len, h: th });
        return y + th + GAP;
      },
      box: function (m, x, y, s) {
        p.push({ t: 'block', m: m, x: x, y: y + s / 2 + GAP, w: s, h: s });
        return y + s + GAP;
      },
      round: function (m, x, y, r) {
        p.push({ t: 'round', m: m, x: x, y: y + r + GAP, r: r });
        return y + r * 2 + GAP;
      },
      tnt: function (x, y) {
        p.push({ t: 'tnt', x: x, y: y + 0.4 + GAP, w: 0.8, h: 0.8 });
        return y + 0.8 + GAP;
      },
      // Triangle sitting on y: 'peak' (roof), 'up' (rises to the right) or 'down'.
      tri: function (m, x, y, w, h, shape) {
        var hw = w / 2, v;
        if (shape === 'up') v = [[-hw, 0], [hw, 0], [hw, h]];
        else if (shape === 'down') v = [[-hw, 0], [hw, 0], [-hw, h]];
        else v = [[-hw, 0], [hw, 0], [0, h]];
        p.push({ t: 'tri', m: m, x: x, y: y + GAP, pts: v });
        return y + h + GAP;
      },
      bandit: function (k, x, y) {
        p.push({ t: 'bandit', k: k, x: x, y: y + R(k) + GAP });
      },
      // Two columns under a plank spanning `span`. Returns the plank's top.
      frame: function (m, x, y, span, h, colW) {
        colW = colW || 0.4;
        b.col(m, x - span / 2 + colW / 2, y, h, colW);
        b.col(m, x + span / 2 - colW / 2, y, h, colW);
        return b.plank(m, x, y + h + GAP, span);
      }
    };
    return b;
  }

  function level(name, theme, birds, build) {
    var b = builder();
    build(b);
    return { name: name, theme: theme, birds: birds, pieces: b.pieces };
  }

  window.LEVELS = [
    /* ------------------------------------------------------- World 1: Meadow */
    level('First Flight', 0, ['rusty', 'rusty', 'rusty'], function (b) {
      var top = b.frame('wood', 22, 0, 3, 2);
      b.bandit('small', 22, 0);
      b.bandit('small', 22, top);
    }),

    level('Double Trouble', 0, ['rusty', 'rusty', 'rusty'], function (b) {
      var t1 = b.frame('wood', 20, 0, 3, 2);
      var t2 = b.frame('wood', 26, 0, 3, 2);
      b.bandit('small', 20, 0);
      b.bandit('small', 26, 0);
      b.col('wood', 20, t1, 1.2, 0.5);
      b.bandit('mid', 26, t2);
    }),

    level('Glass House', 0, ['rusty', 'zip', 'zip', 'rusty'], function (b) {
      var t1 = b.frame('ice', 24, 0, 3, 2);
      var t2 = b.frame('ice', 24, t1, 3, 2);
      b.bandit('small', 24, 0);
      b.bandit('small', 24, t1);
      b.bandit('small', 24, t2);
    }),

    level('Stone Steps', 0, ['rusty', 'zip', 'rusty', 'zip'], function (b) {
      b.frame('wood', 20, 0, 2.6, 1.6);
      b.bandit('small', 20, 0);
      var t1 = b.frame('stone', 24.5, 0, 3, 2.4);
      var t2 = b.frame('wood', 24.5, t1, 3, 1.6);
      b.bandit('helmet', 24.5, 0);
      b.bandit('small', 24.5, t1);
      b.bandit('small', 24.5, t2);
    }),

    level('Split Decision', 1, ['trio', 'trio', 'rusty'], function (b) {
      var t = 0;
      [20, 23.2, 26.4].forEach(function (x) {
        t = b.frame('wood', x, 0, 3, 1.6);
        b.bandit('small', x, 0);
      });
      b.bandit('mid', 23.2, t);
      b.box('ice', 20, t, 0.8);
      b.box('ice', 26.4, t, 0.8);
    }),

    level('Boom Town', 1, ['boomer', 'rusty', 'boomer'], function (b) {
      var t1 = b.frame('stone', 23, 0, 4, 2);
      b.tnt(21.9, 0);
      b.bandit('mid', 23.4, 0);
      var t2 = b.frame('wood', 23, t1, 3, 1.8);
      b.bandit('small', 23, t1);
      b.bandit('helmet', 23, t2);
    }),

    level('Tall Order', 1, ['zip', 'boomer', 'rusty', 'trio'], function (b) {
      b.frame('ice', 19.5, 0, 2, 1.4);
      b.bandit('small', 19.5, 0);
      var t1 = b.frame('wood', 24, 0, 2.4, 2);
      var t2 = b.frame('stone', 24, t1, 2.4, 2);
      var t3 = b.frame('wood', 24, t2, 2.4, 2);
      b.bandit('small', 24, 0);
      b.bandit('small', 24, t1);
      b.bandit('small', 24, t2);
      b.bandit('mid', 24, t3);
    }),

    level('Twin Peaks', 1, ['tank', 'rusty', 'zip', 'boomer', 'trio'], function (b) {
      [21, 28].forEach(function (x) {
        var t1 = b.frame('stone', x, 0, 2.6, 2);
        b.frame('wood', x, t1, 2.6, 2);
        b.bandit('small', x, 0);
        b.bandit('mid', x, t1);
      });
      b.frame('wood', 24.5, 0, 3, 2);
      b.bandit('big', 24.5, 0);
    }),

    level('Ice Palace', 2, ['trio', 'zip', 'boomer', 'rusty'], function (b) {
      var t1 = b.frame('stone', 22, 0, 3, 2);
      var t2 = b.frame('ice', 22, t1, 3, 2);
      var r1 = b.frame('ice', 26, 0, 3, 2);
      b.bandit('helmet', 22, 0);
      b.bandit('small', 22, t1);
      b.bandit('small', 22, t2);
      b.bandit('small', 26, 0);
      b.bandit('mid', 26, r1);
    }),

    level('Rolling Stones', 2, ['tank', 'boomer', 'zip'], function (b) {
      var t = b.frame('wood', 24, 0, 4, 2.2);
      b.bandit('big', 24, 0);
      b.col('wood', 22.2, t, 0.8, 0.3);
      b.col('wood', 25.8, t, 0.8, 0.3);
      b.round('stone', 22.9, t, 0.5);
      b.round('stone', 25.1, t, 0.5);
      b.bandit('small', 24, t);
      b.frame('ice', 29, 0, 2.4, 1.6);
      b.bandit('small', 29, 0);
    }),

    level('The Gauntlet', 2, ['rusty', 'zip', 'trio', 'boomer', 'tank', 'zip'], function (b) {
      var a = b.frame('wood', 19, 0, 2.4, 1.6);
      b.bandit('small', 19, 0);
      b.bandit('small', 19, a);
      var m1 = b.frame('stone', 24, 0, 3, 2);
      var m2 = b.frame('ice', 24, m1, 3, 2);
      b.bandit('helmet', 24, 0);
      b.bandit('mid', 24, m1);
      b.tnt(24, m2);
      var c1 = b.frame('wood', 30, 0, 3, 2.6);
      var c2 = b.frame('wood', 30, c1, 3, 2);
      b.bandit('big', 30, 0);
      b.bandit('small', 30, c1);
      b.bandit('small', 30, c2);
    }),

    level('Bandit King', 2, ['tank', 'boomer', 'zip', 'trio', 'boomer'], function (b) {
      b.frame('stone', 20, 0, 2, 2);
      b.bandit('small', 20, 0);
      b.frame('stone', 30, 0, 2, 2);
      b.bandit('small', 30, 0);
      var f1 = b.frame('stone', 25, 0, 5, 2.6);
      b.tnt(23.35, 0);
      b.tnt(26.65, 0);
      b.bandit('boss', 25, 0);
      var f2 = b.frame('wood', 25, f1, 4, 2);
      b.bandit('helmet', 24.2, f1);
      b.bandit('helmet', 25.8, f1);
      b.frame('ice', 25, f2, 2.6, 1.6);
      b.bandit('mid', 25, f2);
    }),

    /* ------------------------------------------------ World 4: Tropical Beach */
    level('Sandcastle', 3, ['rusty', 'zip', 'rusty'], function (b) {
      var t = b.frame('wood', 21, 0, 3, 1.8);
      b.tri('wood', 21, t, 3, 1.2, 'peak');
      b.bandit('small', 21, 0);
      var t2 = b.frame('ice', 26, 0, 2.4, 1.6);
      b.bandit('small', 26, 0);
      b.bandit('small', 26, t2);
    }),

    level('Palm Hut', 3, ['trio', 'rusty', 'boomer'], function (b) {
      var t = b.frame('wood', 23, 0, 4, 2.2);
      b.tri('wood', 23, t, 4, 1.4, 'peak');
      b.bandit('mid', 22.2, 0);
      b.tnt(24.1, 0);
      b.frame('ice', 28.2, 0, 2.2, 1.5);
      b.bandit('small', 28.2, 0);
    }),

    level('Tide Pools', 3, ['zip', 'trio', 'zip', 'rusty'], function (b) {
      var t = 0;
      [19.5, 23, 26.5].forEach(function (x) {
        t = b.frame('ice', x, 0, 3, 1.4);
        b.bandit('small', x, 0);
      });
      b.round('stone', 23, t, 0.5);
      b.bandit('mid', 26.5, t);
      b.box('ice', 19.5, t, 0.9);
    }),

    level('Coconut Drop', 3, ['tank', 'zip', 'boomer', 'rusty'], function (b) {
      var t1 = b.frame('stone', 24, 0, 3, 2);
      var t2 = b.frame('wood', 24, t1, 3, 2);
      b.bandit('helmet', 24, 0);
      b.bandit('mid', 24, t1);
      b.round('stone', 23.2, t2, 0.5);
      b.round('stone', 24.8, t2, 0.5);
      b.frame('wood', 28.8, 0, 3, 2.2);
      b.bandit('big', 28.8, 0);
    }),

    level('Shipwreck', 3, ['rusty', 'boomer', 'trio', 'zip'], function (b) {
      b.tri('wood', 20, 0, 2, 1.2, 'up');
      var t = b.frame('stone', 24, 0, 4, 2);
      b.bandit('mid', 23.2, 0);
      b.tnt(25, 0);
      var t2 = b.frame('wood', 24, t, 3, 1.8);
      b.bandit('small', 24, t);
      b.tri('ice', 24, t2, 3, 1, 'peak');
      b.tri('wood', 27.6, 0, 2, 1.2, 'down');
      b.bandit('small', 29.4, 0);
    }),

    level('Lighthouse', 3, ['tank', 'zip', 'boomer', 'trio', 'rusty'], function (b) {
      b.frame('wood', 21, 0, 2.4, 1.6);
      b.bandit('small', 21, 0);
      var t1 = b.frame('stone', 26, 0, 2.6, 2.4);
      var t2 = b.frame('stone', 26, t1, 2.6, 2.4);
      var t3 = b.frame('wood', 26, t2, 2.6, 2);
      b.tri('wood', 26, t3, 2.6, 1.2, 'peak');
      b.bandit('helmet', 26, 0);
      b.bandit('mid', 26, t1);
      b.bandit('small', 26, t2);
      b.frame('ice', 31, 0, 2.4, 1.6);
      b.bandit('small', 31, 0);
    }),

    /* ------------------------------------------------ World 5: Moonlit Castle */
    level('Gatehouse', 4, ['rusty', 'boomer', 'zip'], function (b) {
      var t = b.frame('stone', 21, 0, 2.2, 2.6);
      b.frame('stone', 27, 0, 2.2, 2.6);
      b.bandit('small', 21, 0);
      b.bandit('small', 27, 0);
      b.tnt(24, 0);
      var bridge = b.plank('wood', 24, t, 7.4);
      b.bandit('big', 24, bridge);
    }),

    level('Battlements', 4, ['tank', 'trio', 'boomer', 'zip'], function (b) {
      var t = b.frame('stone', 24, 0, 6, 2.2);
      b.bandit('helmet', 23, 0);
      b.bandit('helmet', 25, 0);
      [21.3, 23.1, 24.9, 26.7].forEach(function (x) { b.box('stone', x, t, 0.6); });
      [22.2, 24, 25.8].forEach(function (x) { b.bandit('small', x, t); });
    }),

    level('Spire', 4, ['zip', 'boomer', 'rusty', 'trio'], function (b) {
      b.round('stone', 21.5, 0, 0.6);
      var t1 = b.frame('stone', 24, 0, 2, 2.4);
      var t2 = b.frame('wood', 24, t1, 2, 2.4);
      var t3 = b.frame('ice', 24, t2, 2, 2.4);
      b.tri('stone', 24, t3, 2, 1.4, 'peak');
      b.bandit('small', 24, 0);
      b.bandit('small', 24, t1);
      b.bandit('small', 24, t2);
      b.frame('wood', 27.8, 0, 2.2, 1.6);
      b.bandit('mid', 27.8, 0);
    }),

    level('Crypt', 4, ['boomer', 'rusty', 'zip', 'trio'], function (b) {
      var t = 0;
      [22, 25.4, 28.8].forEach(function (x, i) {
        t = b.frame('stone', x, 0, 3, 1.6);
        b.tnt(x - 0.6, 0);
        b.bandit('small', x + 0.5, 0);
        if (i !== 1) b.tri('stone', x, t, 3, 1, 'peak');
      });
      b.bandit('big', 25.4, t);
    }),

    level('Drawbridge', 4, ['tank', 'boomer', 'trio', 'zip', 'rusty'], function (b) {
      b.tri('stone', 20, 0, 3, 1.8, 'up');
      var t = b.frame('stone', 25, 0, 4, 2.4);
      var t2 = b.frame('wood', 25, t, 4, 2);
      b.bandit('big', 25, 0);
      b.bandit('helmet', 24.2, t);
      b.bandit('helmet', 25.8, t);
      b.tri('ice', 25, t2, 4, 1.2, 'peak');
      b.frame('ice', 30, 0, 2, 1.4);
      b.bandit('small', 30, 0);
    }),

    level('Castle Keep', 4, ['tank', 'boomer', 'zip', 'trio', 'boomer', 'rusty'], function (b) {
      var a1 = b.frame('stone', 20, 0, 2.2, 2.2);
      var a2 = b.frame('stone', 20, a1, 2.2, 2.2);
      b.tri('stone', 20, a2, 2.2, 1.2, 'peak');
      b.bandit('small', 20, 0);
      b.bandit('small', 20, a1);
      var k1 = b.frame('stone', 25.5, 0, 5, 2.8);
      b.tnt(23.85, 0);
      b.tnt(27.15, 0);
      b.bandit('boss', 25.5, 0);
      var k2 = b.frame('wood', 25.5, k1, 4, 2.2);
      b.bandit('helmet', 24.7, k1);
      b.bandit('helmet', 26.3, k1);
      var k3 = b.frame('ice', 25.5, k2, 2.6, 1.6);
      b.bandit('mid', 25.5, k2);
      b.tri('wood', 25.5, k3, 2.6, 1.2, 'peak');
      var b1 = b.frame('stone', 31, 0, 2.2, 2.2);
      b.bandit('small', 31, 0);
      b.bandit('mid', 31, b1);
    }),

    /* ------------------------------------------------- World 6: Jungle Ruins */
    level('Temple Steps', 5, ['rusty', 'zip', 'rusty'], function (b) {
      b.frame('stone', 21, 0, 2.4, 1.4);
      b.bandit('small', 21, 0);
      var t2 = b.frame('stone', 24.5, 0, 3, 2.4);
      var t3 = b.frame('stone', 24.5, t2, 3, 1.6);
      b.bandit('explorer', 24.5, 0);
      b.bandit('small', 24.5, t2);
      b.tri('stone', 24.5, t3, 3, 1, 'peak');
    }),

    level('Rope Bridge', 5, ['trio', 'rusty', 'zip'], function (b) {
      var ta = b.frame('stone', 20.5, 0, 2.2, 3);
      b.frame('stone', 28.5, 0, 2.2, 3);
      b.bandit('small', 20.5, 0);
      b.bandit('small', 28.5, 0);
      var bridge = b.plank('wood', 24.5, ta, 9);
      b.bandit('explorer', 23.5, bridge);
      b.bandit('small', 25.8, bridge);
    }),

    level('Idol Room', 5, ['boomer', 'zip', 'rusty', 'trio'], function (b) {
      var t = b.frame('stone', 24, 0, 4, 2.2);
      b.bandit('explorer', 23.2, 0);
      b.tnt(25, 0);
      b.tri('stone', 22.95, t, 2, 1.2, 'up');
      b.tri('stone', 25.05, t, 2, 1.2, 'down');
      b.frame('wood', 29, 0, 2.4, 1.6);
      b.bandit('small', 29, 0);
    }),

    level('Vine Swing', 5, ['zip', 'tank', 'trio', 'rusty'], function (b) {
      var t1 = b.frame('wood', 23, 0, 2.2, 2.4);
      var t2 = b.frame('wood', 23, t1, 2.2, 2.4);
      var t3 = b.frame('ice', 23, t2, 2.2, 2);
      b.bandit('explorer', 23, 0);
      b.bandit('small', 23, t1);
      b.bandit('small', 23, t2);
      b.bandit('mid', 23, t3);
      b.round('stone', 27, 0, 0.7);
      b.bandit('small', 28.4, 0);
    }),

    level('Sunken Temple', 5, ['tank', 'boomer', 'zip', 'rusty'], function (b) {
      b.tri('stone', 19.5, 0, 2.4, 1.4, 'up');
      var a = b.frame('stone', 23, 0, 3, 2);
      b.frame('stone', 26.4, 0, 3, 2);
      b.bandit('explorer', 23, 0);
      b.bandit('explorer', 26.4, 0);
      var top = b.plank('stone', 24.7, a, 6.8);
      b.bandit('mid', 24.7, top);
      b.box('wood', 22.2, top, 0.8);
      b.box('wood', 27.2, top, 0.8);
    }),

    level('Jungle Chief', 5, ['tank', 'boomer', 'trio', 'zip', 'rusty'], function (b) {
      b.frame('wood', 20, 0, 2.4, 1.8);
      b.bandit('small', 20, 0);
      var k1 = b.frame('stone', 25, 0, 4.4, 3);
      b.bandit('chief', 25, 0);
      var k2 = b.frame('wood', 25, k1, 3.4, 2.2);
      b.bandit('explorer', 24.35, k1);
      b.bandit('explorer', 25.65, k1);
      b.tri('stone', 25, k2, 3.4, 1.4, 'peak');
      b.frame('ice', 30, 0, 2.4, 1.8);
      b.bandit('mid', 30, 0);
    }),

    /* ------------------------------------------------- World 7: Volcano Isle */
    level('Ash Fields', 6, ['rusty', 'boomer', 'zip'], function (b) {
      b.frame('stone', 21, 0, 2.6, 1.8);
      b.bandit('miner', 21, 0);
      var bt = b.frame('wood', 26, 0, 3, 2);
      b.bandit('small', 26, 0);
      b.tnt(26, bt);
      b.bandit('mid', 29.6, 0);
    }),

    level('Magma Chamber', 6, ['boomer', 'tank', 'zip', 'trio'], function (b) {
      var t = b.frame('stone', 24, 0, 5, 2);
      b.tnt(22.35, 0);
      b.bandit('miner', 23.7, 0);
      b.tnt(25.65, 0);
      var t2 = b.frame('stone', 24, t, 3, 1.8);
      b.bandit('miner', 24, t);
      b.round('stone', 23.6, t2, 0.5);
      b.bandit('small', 24.6, t2);
    }),

    level('Obsidian Spire', 6, ['tank', 'zip', 'boomer', 'rusty'], function (b) {
      b.round('stone', 20.5, 0, 0.6);
      var t1 = b.frame('stone', 24, 0, 2.2, 2.2);
      var t2 = b.frame('stone', 24, t1, 2.2, 2.2);
      var t3 = b.frame('wood', 24, t2, 2.2, 2.2);
      var t4 = b.frame('ice', 24, t3, 2.2, 1.6);
      b.bandit('miner', 24, 0);
      b.bandit('small', 24, t1);
      b.bandit('small', 24, t2);
      b.bandit('small', 24, t3);
      b.tri('stone', 24, t4, 2.2, 1.2, 'peak');
    }),

    level('Lava Flow', 6, ['trio', 'boomer', 'zip', 'tank'], function (b) {
      b.tri('stone', 21, 0, 3, 1.5, 'up');
      var t = b.frame('wood', 25, 0, 3, 2.2);
      b.bandit('big', 25, 0);
      b.col('wood', 23.65, t, 0.7, 0.3);
      b.col('wood', 26.35, t, 0.7, 0.3);
      b.round('stone', 24.4, t, 0.5);
      b.round('stone', 25.6, t, 0.5);
      b.frame('ice', 29.5, 0, 2.4, 1.6);
      b.bandit('miner', 29.5, 0);
    }),

    level('Forge', 6, ['tank', 'boomer', 'trio', 'zip', 'rusty'], function (b) {
      var a = b.frame('stone', 22, 0, 3, 2);
      b.tnt(21.4, 0);
      b.bandit('small', 22.55, 0);
      b.frame('stone', 26, 0, 3, 2);
      b.bandit('miner', 26, 0);
      var top = b.plank('stone', 24, a, 6.4);
      b.bandit('miner', 23, top);
      b.bandit('miner', 25, top);
      b.box('stone', 21.2, top, 0.6);
      b.box('stone', 26.8, top, 0.6);
    }),

    level('Volcano King', 6, ['tank', 'boomer', 'zip', 'trio', 'boomer', 'tank'], function (b) {
      var l1 = b.frame('stone', 19.5, 0, 2.2, 2);
      b.bandit('small', 19.5, 0);
      b.tri('stone', 19.5, l1, 2.2, 1, 'peak');
      var k1 = b.frame('stone', 25, 0, 5.2, 3);
      b.tnt(23.25, 0);
      b.tnt(26.75, 0);
      b.bandit('boss', 25, 0);
      var k2 = b.frame('stone', 25, k1, 4, 2.2);
      b.bandit('miner', 24.2, k1);
      b.bandit('miner', 25.8, k1);
      var k3 = b.frame('wood', 25, k2, 2.6, 1.8);
      b.bandit('mid', 25, k2);
      b.tri('wood', 25, k3, 2.6, 1.2, 'peak');
      var r1 = b.frame('stone', 31, 0, 2.2, 2.4);
      b.bandit('miner', 31, 0);
      b.bandit('small', 31, r1);
    })
  ];

  window.WORLDS = [
    { name: 'Meadow', theme: 0, from: 0, to: 4 },
    { name: 'Sunset Canyon', theme: 1, from: 4, to: 8 },
    { name: 'Snowy Peaks', theme: 2, from: 8, to: 12 },
    { name: 'Tropical Beach', theme: 3, from: 12, to: 18 },
    { name: 'Moonlit Castle', theme: 4, from: 18, to: 24 },
    { name: 'Jungle Ruins', theme: 5, from: 24, to: 30 },
    { name: 'Volcano Isle', theme: 6, from: 30, to: 36 }
  ];
})();
