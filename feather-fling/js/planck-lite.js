/* planck-lite: a small ES5 rigid-body physics engine (circles + convex polygons) that implements the
 * part of the planck.js API Feather Fling uses. It replaces the planck.js CDN script so the game needs
 * no third-party code and runs on old browsers (iOS 6 Safari).
 * Method: sequential impulses with accumulated + warm-started contact impulses (Box2D-Lite style) and
 * split-impulse position correction (pseudo velocities, so fixing overlap never adds real energy),
 * SAT + edge clipping for polygons, sort-and-sweep broadphase, adaptive sub-steps, island sleeping. */
(function (w) {
  'use strict';

  var SKIN = 0.01;          // contacts exist slightly before shapes touch (keeps resting contacts stable)
  var SLOP = 0.005;         // allowed penetration
  var BAUMGARTE = 0.2;
  var REST_THRESHOLD = 1;   // m/s: slower impacts don't bounce
  var SLEEP_LIN = 0.05, SLEEP_ANG = 0.06, SLEEP_TIME = 0.5;

  function V(x, y) { return { x: x || 0, y: y || 0 }; }
  function dot(a, b) { return a.x * b.x + a.y * b.y; }
  function cross(a, b) { return a.x * b.y - a.y * b.x; }

  /* ------------------------------------------------------------------ shapes */
  function Circle(r, c) {
    if (typeof r === 'object') { var t = r; r = c; c = t; }
    return { type: 'circle', r: r, cx: c ? c.x : 0, cy: c ? c.y : 0 };
  }
  function Polygon(pts) {
    var v = [], i, n = pts.length, area = 0;
    for (i = 0; i < n; i++) v.push(V(pts[i].x, pts[i].y));
    for (i = 0; i < n; i++) area += cross(v[i], v[(i + 1) % n]);
    if (area < 0) v.reverse();
    var nr = [];
    for (i = 0; i < n; i++) {
      var a = v[i], b = v[(i + 1) % n], ex = b.x - a.x, ey = b.y - a.y, l = Math.sqrt(ex * ex + ey * ey) || 1;
      nr.push(V(ey / l, -ex / l));
    }
    return { type: 'poly', v: v, n: nr };
  }
  function Box(hx, hy, center, angle) {
    var pts = [V(-hx, -hy), V(hx, -hy), V(hx, hy), V(-hx, hy)];
    if (center || angle) {
      var c = Math.cos(angle || 0), s = Math.sin(angle || 0), ox = center ? center.x : 0, oy = center ? center.y : 0;
      for (var i = 0; i < 4; i++) { var p = pts[i]; pts[i] = V(ox + c * p.x - s * p.y, oy + s * p.x + c * p.y); }
    }
    return Polygon(pts);
  }
  // A one-sided edge, modelled as a thin slab under the segment (used for the ground).
  function Edge(a, b) {
    var ex = b.x - a.x, ey = b.y - a.y, l = Math.sqrt(ex * ex + ey * ey) || 1, nx = ey / l, ny = -ex / l;
    if (ny > 0) { nx = -nx; ny = -ny; }   // thickness goes "down"
    return Polygon([V(a.x, a.y), V(a.x + nx, a.y + ny), V(b.x + nx, b.y + ny), V(b.x, b.y)]);
  }

  function shapeMass(s, density) {
    if (s.type === 'circle') {
      var m = density * Math.PI * s.r * s.r;
      return { m: m, cx: s.cx, cy: s.cy, I: m * (0.5 * s.r * s.r + s.cx * s.cx + s.cy * s.cy) };
    }
    var area = 0, cx = 0, cy = 0, I = 0, v = s.v, n = v.length, i;
    var ref = v[0];
    for (i = 1; i < n - 1; i++) {
      var e1x = v[i].x - ref.x, e1y = v[i].y - ref.y, e2x = v[i + 1].x - ref.x, e2y = v[i + 1].y - ref.y;
      var D = e1x * e2y - e1y * e2x, ta = 0.5 * D;
      area += ta;
      cx += ta * (e1x + e2x) / 3; cy += ta * (e1y + e2y) / 3;
      var intx2 = e1x * e1x + e2x * e1x + e2x * e2x, inty2 = e1y * e1y + e2y * e1y + e2y * e2y;
      I += (0.25 / 3 * D) * (intx2 + inty2);
    }
    var mass = density * area;
    cx /= area; cy /= area;
    var wx = cx + ref.x, wy = cy + ref.y;
    // I about the reference point -> about the origin
    I = density * I + mass * (wx * wx + wy * wy - (cx * cx + cy * cy));
    return { m: mass, cx: wx, cy: wy, I: I };
  }

  /* ------------------------------------------------------------------ bodies */
  var nextId = 1;
  function Fixture(body, shape, def) {
    this.body = body; this.shape = shape; this.id = nextId++;
    this.density = def.density === undefined ? 0 : def.density;
    this.friction = def.friction === undefined ? 0.2 : def.friction;
    this.restitution = def.restitution || 0;
    this.cat = def.filterCategoryBits === undefined ? 1 : def.filterCategoryBits;
    this.mask = def.filterMaskBits === undefined ? 0xffff : def.filterMaskBits;
    this.wv = []; this.wn = []; this.wc = V(); this.box = { x0: 0, y0: 0, x1: 0, y1: 0 };
  }
  Fixture.prototype.getBody = function () { return this.body; };
  Fixture.prototype.getShape = function () { return this.shape; };
  Fixture.prototype.getUserData = function () { return this.ud; };

  function Body(world, def) {
    def = def || {};
    this.world = world; this.id = nextId++;
    this.dynamic = def.type === 'dynamic';
    this.p = V(def.position ? def.position.x : 0, def.position ? def.position.y : 0);
    this.a = def.angle || 0;
    this.c = V(this.p.x, this.p.y);
    this.lc = V();
    this.v = V(def.linearVelocity ? def.linearVelocity.x : 0, def.linearVelocity ? def.linearVelocity.y : 0);
    this.w = def.angularVelocity || 0;
    this.linDamp = def.linearDamping || 0; this.angDamp = def.angularDamping || 0;
    this.gScale = def.gravityScale === undefined ? 1 : def.gravityScale;
    this.m = 0; this.im = 0; this.I = 0; this.iI = 0;
    this.fixtures = []; this.ud = null;
    this.awake = true; this.sleepT = 0; this.alive = true;
    this.contacts = [];
    this.cs = Math.cos(this.a); this.sn = Math.sin(this.a);
  }
  var BP = Body.prototype;
  BP.createFixture = function (shape, def) {
    if (typeof def === 'number') def = { density: def };
    var f = new Fixture(this, shape, def || {});
    this.fixtures.push(f);
    this.world.fixtures.push(f);
    this.resetMass();
    return f;
  };
  BP.resetMass = function () {
    this.m = 0; this.im = 0; this.I = 0; this.iI = 0;
    if (!this.dynamic) { this.lc = V(); this.syncCenter(); return; }
    var m = 0, cx = 0, cy = 0, I = 0;
    for (var i = 0; i < this.fixtures.length; i++) {
      var f = this.fixtures[i]; if (!f.density) continue;
      var md = shapeMass(f.shape, f.density);
      m += md.m; cx += md.m * md.cx; cy += md.m * md.cy; I += md.I;
    }
    if (m > 0) { cx /= m; cy /= m; } else { m = 1; }
    this.m = m; this.im = 1 / m;
    this.lc = V(cx, cy);
    I -= m * (cx * cx + cy * cy);
    if (I > 0) { this.I = I; this.iI = 1 / I; }
    this.syncCenter();
  };
  BP.syncCenter = function () {
    this.cs = Math.cos(this.a); this.sn = Math.sin(this.a);
    this.c.x = this.p.x + this.cs * this.lc.x - this.sn * this.lc.y;
    this.c.y = this.p.y + this.sn * this.lc.x + this.cs * this.lc.y;
  };
  BP.syncOrigin = function () {
    this.cs = Math.cos(this.a); this.sn = Math.sin(this.a);
    this.p.x = this.c.x - (this.cs * this.lc.x - this.sn * this.lc.y);
    this.p.y = this.c.y - (this.sn * this.lc.x + this.cs * this.lc.y);
  };
  BP.getPosition = function () { return this.p; };
  BP.getWorldCenter = function () { return this.c; };
  BP.getAngle = function () { return this.a; };
  BP.getLinearVelocity = function () { return this.v; };
  BP.getAngularVelocity = function () { return this.w; };
  BP.getMass = function () { return this.m; };
  BP.getInertia = function () { return this.I + this.m * dot(this.lc, this.lc); };
  BP.getUserData = function () { return this.ud; };
  BP.setUserData = function (d) { this.ud = d; };
  BP.isAwake = function () { return this.awake; };
  BP.isDynamic = function () { return this.dynamic; };
  BP.isStatic = function () { return !this.dynamic; };
  BP.setAwake = function (f) { if (f) { this.awake = true; this.sleepT = 0; } else { this.awake = false; this.sleepT = 0; this.v.x = this.v.y = 0; this.w = 0; } };
  BP.getFixtureList = function () { return this.fixtures[0] || null; };
  BP.setLinearVelocity = function (v) { if (!this.dynamic) return; this.v.x = v.x; this.v.y = v.y; if (v.x || v.y) this.setAwake(true); };
  BP.setAngularVelocity = function (a) { if (!this.dynamic) return; this.w = a; if (a) this.setAwake(true); };
  BP.setPosition = function (p) { this.p.x = p.x; this.p.y = p.y; this.syncCenter(); };
  BP.setTransform = function (p, a) { this.p.x = p.x; this.p.y = p.y; this.a = a; this.syncCenter(); };
  BP.setAngle = function (a) { this.a = a; this.syncCenter(); };
  BP.applyLinearImpulse = function (imp, point, wake) {
    if (!this.dynamic) return;
    if (wake !== false) this.setAwake(true);
    if (!this.awake) return;
    this.v.x += this.im * imp.x; this.v.y += this.im * imp.y;
    this.w += this.iI * ((point.x - this.c.x) * imp.y - (point.y - this.c.y) * imp.x);
  };
  BP.applyForceToCenter = function (f, wake) {
    if (!this.dynamic) return; if (wake !== false) this.setAwake(true);
    this.fx = (this.fx || 0) + f.x; this.fy = (this.fy || 0) + f.y;
  };
  BP.getContactList = function () {
    var head = null;
    for (var i = this.contacts.length - 1; i >= 0; i--) {
      var c = this.contacts[i];
      head = { contact: c, other: c.fA.body === this ? c.fB.body : c.fA.body, next: head };
    }
    return head;
  };

  /* ---------------------------------------------------------------- geometry */
  function updateFixture(f) {
    var b = f.body, s = f.shape, cs = b.cs, sn = b.sn, box = f.box;
    if (s.type === 'circle') {
      f.wc.x = b.p.x + cs * s.cx - sn * s.cy; f.wc.y = b.p.y + sn * s.cx + cs * s.cy;
      box.x0 = f.wc.x - s.r; box.x1 = f.wc.x + s.r; box.y0 = f.wc.y - s.r; box.y1 = f.wc.y + s.r;
      return;
    }
    var v = s.v, n = s.n, i, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (i = 0; i < v.length; i++) {
      var wv = f.wv[i] || (f.wv[i] = V()), wn = f.wn[i] || (f.wn[i] = V());
      wv.x = b.p.x + cs * v[i].x - sn * v[i].y; wv.y = b.p.y + sn * v[i].x + cs * v[i].y;
      wn.x = cs * n[i].x - sn * n[i].y; wn.y = sn * n[i].x + cs * n[i].y;
      if (wv.x < x0) x0 = wv.x; if (wv.x > x1) x1 = wv.x; if (wv.y < y0) y0 = wv.y; if (wv.y > y1) y1 = wv.y;
    }
    box.x0 = x0; box.x1 = x1; box.y0 = y0; box.y1 = y1;
  }

  // Manifold: { nx, ny (A->B), pts: [{x, y, sep, id}] } or null
  function collideCircles(fA, fB) {
    var a = fA.wc, b = fB.wc, dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, rr = fA.shape.r + fB.shape.r;
    if (d2 > (rr + SKIN) * (rr + SKIN)) return null;
    var d = Math.sqrt(d2), nx = 0, ny = 1;
    if (d > 1e-9) { nx = dx / d; ny = dy / d; }
    var sep = d - rr, ra = fA.shape.r + sep * 0.5;
    return { nx: nx, ny: ny, pts: [{ x: a.x + nx * ra, y: a.y + ny * ra, sep: sep, id: 0 }] };
  }
  function collidePolyCircle(fA, fB) {
    var c = fB.wc, r = fB.shape.r, v = fA.wv, n = fA.wn, cnt = fA.shape.v.length;
    var best = -1e9, bi = 0, i;
    for (i = 0; i < cnt; i++) {
      var s = n[i].x * (c.x - v[i].x) + n[i].y * (c.y - v[i].y);
      if (s > r + SKIN) return null;
      if (s > best) { best = s; bi = i; }
    }
    var v1 = v[bi], v2 = v[(bi + 1) % cnt], nx, ny, d;
    if (best < 1e-9) { nx = n[bi].x; ny = n[bi].y; d = best; }
    else {
      var u1 = (c.x - v1.x) * (v2.x - v1.x) + (c.y - v1.y) * (v2.y - v1.y);
      var u2 = (c.x - v2.x) * (v1.x - v2.x) + (c.y - v2.y) * (v1.y - v2.y);
      var px, py;
      if (u1 <= 0) { px = v1.x; py = v1.y; }
      else if (u2 <= 0) { px = v2.x; py = v2.y; }
      else { px = null; }
      if (px !== null) {
        var dx = c.x - px, dy = c.y - py; d = Math.sqrt(dx * dx + dy * dy);
        if (d > r + SKIN) return null;
        if (d < 1e-9) { nx = n[bi].x; ny = n[bi].y; } else { nx = dx / d; ny = dy / d; }
      } else { nx = n[bi].x; ny = n[bi].y; d = best; }
    }
    var sep = d - r, k = (d + r) * 0.5;
    return { nx: nx, ny: ny, pts: [{ x: c.x - nx * k, y: c.y - ny * k, sep: sep, id: bi }] };
  }
  function maxSeparation(fA, fB) {
    var va = fA.wv, na = fA.wn, vb = fB.wv, ca = va.length, cb = vb.length, best = -1e9, edge = 0;
    for (var i = 0; i < ca; i++) {
      var nx = na[i].x, ny = na[i].y, ox = va[i].x, oy = va[i].y, si = 1e9;
      for (var j = 0; j < cb; j++) { var d = nx * (vb[j].x - ox) + ny * (vb[j].y - oy); if (d < si) si = d; }
      if (si > best) { best = si; edge = i; }
    }
    return { sep: best, edge: edge };
  }
  function clip(pts, nx, ny, off, edgeId) {
    var out = [], a = pts[0], b = pts[1];
    var d0 = nx * a.x + ny * a.y - off, d1 = nx * b.x + ny * b.y - off;
    if (d0 <= 0) out.push(a);
    if (d1 <= 0) out.push(b);
    if (d0 * d1 < 0) {
      var t = d0 / (d0 - d1);
      out.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y), id: 50 + edgeId });
    }
    return out;
  }
  function collidePolys(fA, fB) {
    var sa = maxSeparation(fA, fB); if (sa.sep > SKIN) return null;
    var sb = maxSeparation(fB, fA); if (sb.sep > SKIN) return null;
    var ref, inc, edge, flip;
    if (sb.sep > 0.98 * sa.sep + 0.001) { ref = fB; inc = fA; edge = sb.edge; flip = 1; }
    else { ref = fA; inc = fB; edge = sa.edge; flip = 0; }
    var rc = ref.wv.length, ic = inc.wv.length;
    var nx = ref.wn[edge].x, ny = ref.wn[edge].y;
    var ie = 0, md = 1e9, i;
    for (i = 0; i < ic; i++) { var dd = nx * inc.wn[i].x + ny * inc.wn[i].y; if (dd < md) { md = dd; ie = i; } }
    var i2 = (ie + 1) % ic;
    var pts = [{ x: inc.wv[ie].x, y: inc.wv[ie].y, id: ie }, { x: inc.wv[i2].x, y: inc.wv[i2].y, id: i2 }];
    var r1 = ref.wv[edge], r2 = ref.wv[(edge + 1) % rc];
    var tx = r2.x - r1.x, ty = r2.y - r1.y, tl = Math.sqrt(tx * tx + ty * ty) || 1; tx /= tl; ty /= tl;
    pts = clip(pts, -tx, -ty, -(tx * r1.x + ty * r1.y) + SKIN, 0); if (pts.length < 2) return null;
    pts = clip(pts, tx, ty, tx * r2.x + ty * r2.y + SKIN, 1); if (pts.length < 2) return null;
    var front = nx * r1.x + ny * r1.y, out = [];
    for (i = 0; i < 2; i++) {
      var p = pts[i], sep = nx * p.x + ny * p.y - front;
      if (sep <= SKIN) out.push({ x: p.x - nx * sep * 0.5, y: p.y - ny * sep * 0.5, sep: sep, id: edge * 1000 + p.id * 2 + flip });
    }
    if (!out.length) return null;
    return flip ? { nx: -nx, ny: -ny, pts: out } : { nx: nx, ny: ny, pts: out };
  }

  /* ---------------------------------------------------------------- contacts */
  function Contact(fA, fB) {
    this.fA = fA; this.fB = fB; this.pts = []; this.nx = 0; this.ny = 1; this.touching = false;
    this.friction = Math.sqrt(fA.friction * fB.friction);
    this.restitution = Math.max(fA.restitution, fB.restitution);
    this.sumN = [0, 0];
  }
  var CP = Contact.prototype;
  CP.getFixtureA = function () { return this.fA; };
  CP.getFixtureB = function () { return this.fB; };
  CP.isTouching = function () { return this.touching; };
  CP.getManifold = function () { return { pointCount: this.pts.length, localNormal: V(this.nx, this.ny) }; };
  CP.getWorldManifold = function () {
    var pts = [];
    for (var i = 0; i < this.pts.length; i++) pts.push(V(this.pts[i].x, this.pts[i].y));
    return { normal: V(this.nx, this.ny), points: pts, separations: this.pts.map(function (p) { return p.sep; }) };
  };
  CP.update = function () {
    var fA = this.fA, fB = this.fB, m;
    var ta = fA.shape.type, tb = fB.shape.type;
    if (ta === 'circle' && tb === 'circle') m = collideCircles(fA, fB);
    else if (ta === 'poly' && tb === 'circle') m = collidePolyCircle(fA, fB);
    else m = collidePolys(fA, fB);
    if (!m) { this.pts = []; this.touching = false; return; }
    var old = this.pts, np = m.pts;
    for (var i = 0; i < np.length; i++) {
      np[i].Pn = 0; np[i].Pt = 0;
      for (var j = 0; j < old.length; j++) if (old[j].id === np[i].id) { np[i].Pn = old[j].Pn; np[i].Pt = old[j].Pt; break; }
    }
    this.nx = m.nx; this.ny = m.ny; this.pts = np;
    var any = false; for (i = 0; i < np.length; i++) if (np[i].sep < 0.0001) any = true;
    this.touching = any || np.length > 0;
  };

  /* ------------------------------------------------------------------- world */
  function World(def) {
    if (!(this instanceof World)) return new World(def);
    def = def || {};
    var g = def.gravity || (def.x !== undefined ? def : V(0, -10));
    this.g = V(g.x, g.y);
    this.bodies = []; this.fixtures = []; this.contacts = {}; this.contactList = [];
    this.listeners = {};
    this.velIters = 10;
  }
  var WP = World.prototype;
  WP.createBody = function (def) {
    if (def && def.x !== undefined && def.y !== undefined && !def.position) def = { position: def };
    var b = new Body(this, def);
    this.bodies.push(b);
    return b;
  };
  WP.createDynamicBody = function (def) { def = def || {}; if (def.x !== undefined) def = { position: def }; def.type = 'dynamic'; return this.createBody(def); };
  WP.destroyBody = function (b) {
    if (!b || !b.alive) return;
    b.alive = false;
    var i = this.bodies.indexOf(b); if (i >= 0) this.bodies.splice(i, 1);
    for (var k = this.fixtures.length - 1; k >= 0; k--) if (this.fixtures[k].body === b) this.fixtures.splice(k, 1);
    for (var key in this.contacts) {
      var c = this.contacts[key];
      if (c.fA.body === b || c.fB.body === b) this.removeContact(key, c);
    }
  };
  WP.removeContact = function (key, c) {
    delete this.contacts[key];
    var a = c.fA.body.contacts, bb = c.fB.body.contacts, i;
    i = a.indexOf(c); if (i >= 0) a.splice(i, 1);
    i = bb.indexOf(c); if (i >= 0) bb.splice(i, 1);
  };
  WP.on = function (name, fn) { (this.listeners[name] || (this.listeners[name] = [])).push(fn); };
  WP.off = function (name, fn) { var l = this.listeners[name]; if (l) { var i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } };
  WP.getBodyList = function () { return this.bodies[0] || null; };
  WP.setGravity = function (g) { this.g.x = g.x; this.g.y = g.y; };

  function shouldCollide(fA, fB) {
    var a = fA.body, b = fB.body;
    if (a === b || (!a.dynamic && !b.dynamic)) return false;
    return (fA.cat & fB.mask) !== 0 && (fB.cat & fA.mask) !== 0;
  }

  // broadphase + narrowphase: refresh the contact set
  WP.collide = function () {
    var fx = this.fixtures, n = fx.length, i, j;
    for (i = 0; i < n; i++) updateFixture(fx[i]);
    var order = fx.slice().sort(function (p, q) { return p.box.x0 - q.box.x0; });
    var seen = {};
    for (i = 0; i < n; i++) {
      var fa = order[i], ba = fa.box;
      for (j = i + 1; j < n; j++) {
        var fb = order[j], bb = fb.box;
        if (bb.x0 > ba.x1 + SKIN) break;
        if (bb.y0 > ba.y1 + SKIN || bb.y1 < ba.y0 - SKIN) continue;
        if (!shouldCollide(fa, fb)) continue;
        var A = fa, B = fb;
        // order so the narrowphase gets (poly, circle)
        if (A.shape.type === 'circle' && B.shape.type === 'poly') { A = fb; B = fa; }
        else if (A.shape.type === B.shape.type && A.id > B.id) { A = fb; B = fa; }
        var key = A.id + '_' + B.id;
        seen[key] = true;
        var c = this.contacts[key];
        var awake = (A.body.awake && A.body.dynamic) || (B.body.awake && B.body.dynamic);
        if (!c) {
          c = this.contacts[key] = new Contact(A, B);
          A.body.contacts.push(c); B.body.contacts.push(c);
        } else if (!awake) continue;   // both asleep (or static): keep the old manifold
        c.update();
      }
    }
    for (var key2 in this.contacts) if (!seen[key2]) this.removeContact(key2, this.contacts[key2]);
    var list = this.contactList = [];
    for (var key3 in this.contacts) list.push(this.contacts[key3]);
  };

  // islands of touching dynamic bodies sleep and wake together
  WP.updateIslands = function () {
    var bodies = this.bodies, i, parent = {}, b;
    function find(id) { while (parent[id] !== id) { parent[id] = parent[parent[id]]; id = parent[id]; } return id; }
    for (i = 0; i < bodies.length; i++) if (bodies[i].dynamic) parent[bodies[i].id] = bodies[i].id;
    var cl = this.contactList;
    for (i = 0; i < cl.length; i++) {
      var c = cl[i]; if (!c.touching) continue;
      var a = c.fA.body, bb = c.fB.body;
      if (a.dynamic && bb.dynamic) { var ra = find(a.id), rb = find(bb.id); if (ra !== rb) parent[ra] = rb; }
    }
    var minT = {}, anyAwake = {};
    for (i = 0; i < bodies.length; i++) {
      b = bodies[i]; if (!b.dynamic) continue;
      var r = find(b.id);
      var t = b.awake ? b.sleepT : SLEEP_TIME;
      minT[r] = minT[r] === undefined ? t : Math.min(minT[r], t);
      if (b.awake) anyAwake[r] = true;
    }
    for (i = 0; i < bodies.length; i++) {
      b = bodies[i]; if (!b.dynamic) continue;
      var root = find(b.id);
      if (minT[root] >= SLEEP_TIME) { if (b.awake) b.setAwake(false); }
      else if (anyAwake[root] && !b.awake) b.setAwake(true);
    }
  };

  WP.solve = function (h) {
    var bodies = this.bodies, cl = this.contactList, g = this.g, i, j, b, c, p;
    for (i = 0; i < bodies.length; i++) {
      b = bodies[i]; if (!b.dynamic || !b.awake) continue;
      b.v.x += h * (g.x * b.gScale + (b.fx || 0) * b.im); b.v.y += h * (g.y * b.gScale + (b.fy || 0) * b.im);
      if (b.linDamp) { var ld = 1 / (1 + h * b.linDamp); b.v.x *= ld; b.v.y *= ld; }
      if (b.angDamp) b.w *= 1 / (1 + h * b.angDamp);
    }
    var active = [];
    for (i = 0; i < cl.length; i++) {
      c = cl[i]; if (!c.pts.length) continue;
      var A = c.fA.body, B = c.fB.body;
      if (!((A.dynamic && A.awake) || (B.dynamic && B.awake))) continue;
      var imA = A.awake ? A.im : 0, iIA = A.awake ? A.iI : 0, imB = B.awake ? B.im : 0, iIB = B.awake ? B.iI : 0;
      c.imA = imA; c.iIA = iIA; c.imB = imB; c.iIB = iIB;
      var nx = c.nx, ny = c.ny, tx = ny, ty = -nx;
      for (j = 0; j < c.pts.length; j++) {
        p = c.pts[j];
        p.rax = p.x - A.c.x; p.ray = p.y - A.c.y; p.rbx = p.x - B.c.x; p.rby = p.y - B.c.y;
        var rnA = p.rax * ny - p.ray * nx, rnB = p.rbx * ny - p.rby * nx;
        p.mN = 1 / (imA + imB + iIA * rnA * rnA + iIB * rnB * rnB || 1);
        var rtA = p.rax * ty - p.ray * tx, rtB = p.rbx * ty - p.rby * tx;
        p.mT = 1 / (imA + imB + iIA * rtA * rtA + iIB * rtB * rtB || 1);
        var dvx = B.v.x - B.w * p.rby - A.v.x + A.w * p.ray, dvy = B.v.y + B.w * p.rbx - A.v.y - A.w * p.rax;
        var vn = dvx * nx + dvy * ny;
        // points inside the contact skin are held (no approach); a fast impact bounces by the restitution
        p.bias = vn < -REST_THRESHOLD ? -c.restitution * vn : 0;
        if (p.sep > SKIN * 0.5 && vn < 0) p.bias = Math.max(p.bias, -(p.sep - SKIN * 0.5) / h);
        var pen = -(p.sep) - SLOP;
        p.pbias = pen > 0 ? BAUMGARTE / h * Math.min(pen, 0.2) : 0;
        p.Pp = 0;
      }
      active.push(c);
    }
    // warm start (after every bias was measured from the un-warmed velocities, as Box2D does)
    for (i = 0; i < active.length; i++) {
      c = active[i]; A = c.fA.body; B = c.fB.body; nx = c.nx; ny = c.ny; tx = ny; ty = -nx;
      for (j = 0; j < c.pts.length; j++) {
        p = c.pts[j];
        var Px = nx * p.Pn + tx * p.Pt, Py = ny * p.Pn + ty * p.Pt;
        A.v.x -= c.imA * Px; A.v.y -= c.imA * Py; A.w -= c.iIA * (p.rax * Py - p.ray * Px);
        B.v.x += c.imB * Px; B.v.y += c.imB * Py; B.w += c.iIB * (p.rbx * Py - p.rby * Px);
      }
    }
    // two-point manifolds: Box2D's block solver (both normal impulses at once) keeps stacks from see-sawing
    for (i = 0; i < active.length; i++) {
      c = active[i]; c.block = false;
      if (c.pts.length !== 2) continue;
      var p1 = c.pts[0], p2 = c.pts[1];
      var rn1A = p1.rax * c.ny - p1.ray * c.nx, rn1B = p1.rbx * c.ny - p1.rby * c.nx;
      var rn2A = p2.rax * c.ny - p2.ray * c.nx, rn2B = p2.rbx * c.ny - p2.rby * c.nx;
      var k11 = c.imA + c.imB + c.iIA * rn1A * rn1A + c.iIB * rn1B * rn1B;
      var k22 = c.imA + c.imB + c.iIA * rn2A * rn2A + c.iIB * rn2B * rn2B;
      var k12 = c.imA + c.imB + c.iIA * rn1A * rn2A + c.iIB * rn1B * rn2B;
      var det = k11 * k22 - k12 * k12;
      if (k11 * k11 < 1000 * det && det > 1e-12) { c.block = true; c.k11 = k11; c.k22 = k22; c.k12 = k12; c.det = det; }
    }
    function applyN(c, A, B, p, l) {
      var Px = c.nx * l, Py = c.ny * l;
      A.v.x -= c.imA * Px; A.v.y -= c.imA * Py; A.w -= c.iIA * (p.rax * Py - p.ray * Px);
      B.v.x += c.imB * Px; B.v.y += c.imB * Py; B.w += c.iIB * (p.rbx * Py - p.rby * Px);
    }
    function relVn(c, A, B, p) {
      return (B.v.x - B.w * p.rby - A.v.x + A.w * p.ray) * c.nx + (B.v.y + B.w * p.rbx - A.v.y - A.w * p.rax) * c.ny;
    }
    for (var it = 0; it < this.velIters; it++) {
      for (i = 0; i < active.length; i++) {
        c = active[i]; A = c.fA.body; B = c.fB.body;
        imA = c.imA; iIA = c.iIA; imB = c.imB; iIB = c.iIB;
        nx = c.nx; ny = c.ny; tx = ny; ty = -nx;
        // friction
        for (j = 0; j < c.pts.length; j++) {
          p = c.pts[j];
          dvx = B.v.x - B.w * p.rby - A.v.x + A.w * p.ray; dvy = B.v.y + B.w * p.rbx - A.v.y - A.w * p.rax;
          var vt = dvx * tx + dvy * ty, lt = -p.mT * vt, maxF = c.friction * p.Pn;
          var nPt = Math.max(-maxF, Math.min(maxF, p.Pt + lt)); lt = nPt - p.Pt; p.Pt = nPt;
          Px = tx * lt; Py = ty * lt;
          A.v.x -= imA * Px; A.v.y -= imA * Py; A.w -= iIA * (p.rax * Py - p.ray * Px);
          B.v.x += imB * Px; B.v.y += imB * Py; B.w += iIB * (p.rbx * Py - p.rby * Px);
        }
        // normal
        if (c.block) {
          var q1 = c.pts[0], q2 = c.pts[1], a1 = q1.Pn, a2 = q2.Pn;
          var b1 = relVn(c, A, B, q1) - q1.bias - (c.k11 * a1 + c.k12 * a2);
          var b2 = relVn(c, A, B, q2) - q2.bias - (c.k12 * a1 + c.k22 * a2);
          var x1, x2, done = false;
          // case 1: both points active
          x1 = -(c.k22 * b1 - c.k12 * b2) / c.det; x2 = -(c.k11 * b2 - c.k12 * b1) / c.det;
          if (x1 >= 0 && x2 >= 0) done = true;
          if (!done) { x1 = -b1 / c.k11; x2 = 0; if (x1 >= 0 && c.k12 * x1 + b2 >= 0) done = true; }
          if (!done) { x1 = 0; x2 = -b2 / c.k22; if (x2 >= 0 && c.k12 * x2 + b1 >= 0) done = true; }
          if (!done) { x1 = 0; x2 = 0; if (b1 >= 0 && b2 >= 0) done = true; }
          if (done) {
            applyN(c, A, B, q1, x1 - a1); applyN(c, A, B, q2, x2 - a2);
            q1.Pn = x1; q2.Pn = x2;
            continue;
          }
        }
        for (j = 0; j < c.pts.length; j++) {
          p = c.pts[j];
          vn = relVn(c, A, B, p);
          var ln = -p.mN * (vn - p.bias);
          var nPn = Math.max(0, p.Pn + ln); ln = nPn - p.Pn; p.Pn = nPn;
          applyN(c, A, B, p, ln);
        }
      }
    }
    for (i = 0; i < active.length; i++) { c = active[i]; for (j = 0; j < c.pts.length && j < 2; j++) c.sumN[j] += c.pts[j].Pn; }
    // split-impulse position correction on pseudo velocities (bx, by, bw)
    for (i = 0; i < bodies.length; i++) { b = bodies[i]; b.bx = 0; b.by = 0; b.bw = 0; }
    for (it = 0; it < 4; it++) {
      for (i = 0; i < active.length; i++) {
        c = active[i]; A = c.fA.body; B = c.fB.body;
        imA = c.imA; iIA = c.iIA; imB = c.imB; iIB = c.iIB; nx = c.nx; ny = c.ny;
        for (j = 0; j < c.pts.length; j++) {
          p = c.pts[j]; if (!p.pbias) continue;
          dvx = B.bx - B.bw * p.rby - A.bx + A.bw * p.ray; dvy = B.by + B.bw * p.rbx - A.by - A.bw * p.rax;
          vn = dvx * nx + dvy * ny;
          ln = -p.mN * (vn - p.pbias);
          nPn = Math.max(0, p.Pp + ln); ln = nPn - p.Pp; p.Pp = nPn;
          Px = nx * ln; Py = ny * ln;
          A.bx -= imA * Px; A.by -= imA * Py; A.bw -= iIA * (p.rax * Py - p.ray * Px);
          B.bx += imB * Px; B.by += imB * Py; B.bw += iIB * (p.rbx * Py - p.rby * Px);
        }
      }
    }
    for (i = 0; i < bodies.length; i++) {
      b = bodies[i]; if (!b.dynamic || !b.awake) continue;
      // keep things sane after huge impulses
      var v2 = b.v.x * b.v.x + b.v.y * b.v.y; if (v2 > 40000) { var k = 200 / Math.sqrt(v2); b.v.x *= k; b.v.y *= k; }
      b.c.x += h * (b.v.x + b.bx); b.c.y += h * (b.v.y + b.by); b.a += h * (b.w + b.bw);
      b.syncOrigin();
    }
  };

  WP.step = function (dt) {
    var bodies = this.bodies, i, b, maxV = 0;
    for (i = 0; i < bodies.length; i++) {
      b = bodies[i]; if (!b.dynamic || !b.awake) continue;
      var sp = Math.sqrt(b.v.x * b.v.x + b.v.y * b.v.y) + Math.abs(b.w) * 0.3;
      if (sp > maxV) maxV = sp;
    }
    var sub = Math.max(1, Math.min(4, Math.ceil(maxV * dt / 0.18))), h = dt / sub;
    var cl, c;
    for (var s = 0; s < sub; s++) {
      this.collide();
      if (s === 0) {
        cl = this.contactList;
        for (i = 0; i < cl.length; i++) { cl[i].sumN[0] = 0; cl[i].sumN[1] = 0; }
        this.updateIslands();
      }
      if (this.lastH && this.lastH !== h) this.scaleWarm(h / this.lastH);
      this.solve(h);
      this.lastH = h;
    }
    for (i = 0; i < bodies.length; i++) {
      b = bodies[i]; if (!b.dynamic) continue;
      b.fx = 0; b.fy = 0;
      if (!b.awake) continue;
      if (b.v.x * b.v.x + b.v.y * b.v.y > SLEEP_LIN * SLEEP_LIN || b.w * b.w > SLEEP_ANG * SLEEP_ANG) b.sleepT = 0;
      else b.sleepT += dt;
    }
    var post = this.listeners['post-solve'];
    if (post && post.length) {
      cl = this.contactList.slice();
      for (i = 0; i < cl.length; i++) {
        c = cl[i]; if (!c.touching || !c.pts.length) continue;
        if (!this.contacts[c.fA.id + '_' + c.fB.id]) continue;
        var imp = { normalImpulses: [c.sumN[0], c.sumN[1]], tangentImpulses: [0, 0], count: c.pts.length };
        for (var k = 0; k < post.length; k++) post[k](c, imp);
      }
    }
  };
  WP.scaleWarm = function (r) {
    var cl = this.contactList;
    for (var i = 0; i < cl.length; i++) for (var j = 0; j < cl[i].pts.length; j++) { cl[i].pts[j].Pn *= r; cl[i].pts[j].Pt *= r; }
  };

  var Vec2 = function (x, y) {
    if (typeof x === 'object') return V(x.x, x.y);
    return V(x, y);
  };
  w.planck = { Vec2: Vec2, World: World, Circle: Circle, Box: Box, Polygon: Polygon, Edge: Edge, lite: true };
})(window);
