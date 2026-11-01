/* iPod touch 4th gen / iOS 6 support kit (ES5 only - this file must parse in Safari 6).
   Load it first, as a classic script:  <script src="/_ipod/ios6.js"></script>
   - polyfills the newer APIs our games use (rAF, performance.now, Promise, Object.assign, Array.from,
     includes/startsWith/endsWith/repeat/padStart, find/findIndex/fill, Map/Set (basic), Math.sign/trunc/hypot, Number.isFinite)
   - window.IPOD: { oldIOS, webgl, small, touch } feature flags
   - IPOD.needsNewer(name): full-screen card for games that can't run here (no WebGL), with a link home
   - IPOD.audio(): returns a shared (webkit)AudioContext, unlocked on the first touch
   - adds class "ipod-small" (screen <= 480px), "ipod-old" (iOS <= 6), "ipod-touch" to <html> */
(function (w, d) {
  'use strict';
  var ua = navigator.userAgent, m = ua.match(/OS (\d+)_\d+(?:_\d+)? like Mac OS X/);
  var iosMajor = m ? +m[1] : 0;
  function hasWebGL() {
    try { var c = d.createElement('canvas'); return !!(w.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); }
    catch (e) { return false; }
  }
  var IPOD = w.IPOD = {
    iosMajor: iosMajor,
    oldIOS: iosMajor > 0 && iosMajor <= 7,
    webgl: hasWebGL(),
    touch: ('ontouchstart' in w),
    small: Math.min(screen.width, screen.height) <= 480 || Math.min(w.innerWidth || 9999, w.innerHeight || 9999) <= 480
  };
  var root = d.documentElement;
  root.className += (IPOD.small ? ' ipod-small' : '') + (IPOD.oldIOS ? ' ipod-old' : '') + (IPOD.touch ? ' ipod-touch' : '') + (IPOD.webgl ? '' : ' ipod-nogl');

  // ---------- timing
  if (!w.requestAnimationFrame) {
    w.requestAnimationFrame = w.webkitRequestAnimationFrame || function (cb) { return w.setTimeout(function () { cb(+new Date()); }, 16); };
    w.cancelAnimationFrame = w.webkitCancelAnimationFrame || w.webkitCancelRequestAnimationFrame || w.clearTimeout;
  }
  if (!w.performance) w.performance = {};
  if (!w.performance.now) { var t0 = +new Date(); w.performance.now = function () { return +new Date() - t0; }; }

  // ---------- language
  function def(o, k, v) { if (!o[k]) try { Object.defineProperty(o, k, { value: v, writable: true, configurable: true }); } catch (e) { o[k] = v; } }
  def(Object, 'assign', function (t) { for (var i = 1; i < arguments.length; i++) { var s = arguments[i]; if (s) for (var k in s) if (Object.prototype.hasOwnProperty.call(s, k)) t[k] = s[k]; } return t; });
  def(Array, 'from', function (a, f) { var r = [], i, n; if (a == null) return r; if (typeof a.length === 'number') { for (i = 0, n = a.length; i < n; i++) r.push(f ? f(a[i], i) : a[i]); } else if (a.forEach) { a.forEach(function (v) { r.push(f ? f(v, r.length) : v); }); } return r; });
  def(Array, 'of', function () { return Array.prototype.slice.call(arguments); });
  var AP = Array.prototype, SP = String.prototype;
  def(AP, 'includes', function (v) { for (var i = 0; i < this.length; i++) if (this[i] === v || (v !== v && this[i] !== this[i])) return true; return false; });
  def(AP, 'find', function (f, t) { for (var i = 0; i < this.length; i++) if (f.call(t, this[i], i, this)) return this[i]; });
  def(AP, 'findIndex', function (f, t) { for (var i = 0; i < this.length; i++) if (f.call(t, this[i], i, this)) return i; return -1; });
  def(AP, 'fill', function (v, s, e) { var n = this.length; s = s == null ? 0 : (s < 0 ? Math.max(n + s, 0) : s); e = e == null ? n : (e < 0 ? n + e : e); for (var i = s; i < e; i++) this[i] = v; return this; });
  if (w.Float32Array && !Float32Array.prototype.fill) { var TA = [w.Int8Array, w.Uint8Array, w.Uint8ClampedArray, w.Int16Array, w.Uint16Array, w.Int32Array, w.Uint32Array, w.Float32Array, w.Float64Array]; for (var ti = 0; ti < TA.length; ti++) if (TA[ti]) def(TA[ti].prototype, 'fill', AP.fill); }
  def(SP, 'includes', function (s, p) { return this.indexOf(s, p || 0) !== -1; });
  def(SP, 'startsWith', function (s, p) { p = p || 0; return this.substr(p, s.length) === s; });
  def(SP, 'endsWith', function (s, e) { var t = String(this); e = e === undefined ? t.length : e; return t.slice(e - s.length, e) === s; });
  def(SP, 'repeat', function (n) { var r = '', s = String(this); for (var i = 0; i < n; i++) r += s; return r; });
  def(SP, 'padStart', function (n, c) { var s = String(this); c = c == null ? ' ' : String(c); while (s.length < n) s = c + s; return s.length > n && c.length > 1 ? s.slice(s.length - n) : s; });
  def(SP, 'trimStart', function () { return String(this).replace(/^\s+/, ''); });
  def(SP, 'trimEnd', function () { return String(this).replace(/\s+$/, ''); });
  def(Math, 'sign', function (x) { x = +x; return x > 0 ? 1 : x < 0 ? -1 : x; });
  def(Math, 'trunc', function (x) { return x < 0 ? Math.ceil(x) : Math.floor(x); });
  def(Math, 'hypot', function () { var s = 0; for (var i = 0; i < arguments.length; i++) s += arguments[i] * arguments[i]; return Math.sqrt(s); });
  def(Math, 'log2', function (x) { return Math.log(x) / Math.LN2; });
  def(Math, 'log10', function (x) { return Math.log(x) / Math.LN10; });
  def(Number, 'isFinite', function (x) { return typeof x === 'number' && isFinite(x); });
  def(Number, 'isNaN', function (x) { return typeof x === 'number' && x !== x; });
  def(Number, 'isInteger', function (x) { return typeof x === 'number' && isFinite(x) && Math.floor(x) === x; });
  def(Number, 'EPSILON', Math.pow(2, -52));

  // Basic Map/Set (insertion-ordered, linear lookups; fine for the small collections games use)
  if (!w.Map) {
    var MapP = function (it) { this._k = []; this._v = []; this.size = 0; var self = this; if (it) Array.from(it).forEach(function (p) { self.set(p[0], p[1]); }); };
    MapP.prototype = {
      _i: function (k) { for (var i = 0; i < this._k.length; i++) if (this._k[i] === k || (k !== k && this._k[i] !== this._k[i])) return i; return -1; },
      get: function (k) { var i = this._i(k); return i < 0 ? undefined : this._v[i]; },
      set: function (k, v) { var i = this._i(k); if (i < 0) { this._k.push(k); this._v.push(v); this.size++; } else this._v[i] = v; return this; },
      has: function (k) { return this._i(k) >= 0; },
      'delete': function (k) { var i = this._i(k); if (i < 0) return false; this._k.splice(i, 1); this._v.splice(i, 1); this.size--; return true; },
      clear: function () { this._k = []; this._v = []; this.size = 0; },
      forEach: function (f, t) { for (var i = 0; i < this._k.length; i++) f.call(t, this._v[i], this._k[i], this); },
      keys: function () { return this._k.slice(); }, values: function () { return this._v.slice(); },
      entries: function () { var r = []; for (var i = 0; i < this._k.length; i++) r.push([this._k[i], this._v[i]]); return r; }
    };
    w.Map = MapP;
  }
  if (!w.Set) {
    var SetP = function (it) { this._m = new w.Map(); this.size = 0; var self = this; if (it) Array.from(it).forEach(function (v) { self.add(v); }); };
    SetP.prototype = {
      add: function (v) { this._m.set(v, v); this.size = this._m.size; return this; },
      has: function (v) { return this._m.has(v); },
      'delete': function (v) { var r = this._m['delete'](v); this.size = this._m.size; return r; },
      clear: function () { this._m.clear(); this.size = 0; },
      forEach: function (f, t) { var s = this; this._m.forEach(function (v) { f.call(t, v, v, s); }); },
      values: function () { return this._m.keys(); }, keys: function () { return this._m.keys(); }
    };
    w.Set = SetP;
  }

  // Small Promise (then/catch/finally, resolve/reject/all/race)
  if (!w.Promise) {
    var P = function (ex) {
      var self = this; self._s = 0; self._v = undefined; self._q = [];
      function settle(s, v) { if (self._s) return; if (s === 1 && v && (typeof v === 'object' || typeof v === 'function')) { var th; try { th = v.then; } catch (e) { return settle(2, e); } if (typeof th === 'function') { var done = false; try { th.call(v, function (x) { if (!done) { done = true; settle(1, x); } }, function (x) { if (!done) { done = true; settle(2, x); } }); } catch (e2) { if (!done) { done = true; settle(2, e2); } } return; } } self._s = s; self._v = v; var q = self._q; self._q = null; for (var i = 0; i < q.length; i++) q[i](); }
      try { ex(function (v) { settle(1, v); }, function (e) { settle(2, e); }); } catch (e) { settle(2, e); }
    };
    P.prototype.then = function (a, b) {
      var self = this;
      return new P(function (res, rej) {
        function run() { setTimeout(function () { var f = self._s === 1 ? a : b; if (typeof f !== 'function') return (self._s === 1 ? res : rej)(self._v); try { res(f(self._v)); } catch (e) { rej(e); } }, 0); }
        if (self._s) run(); else self._q.push(run);
      });
    };
    P.prototype['catch'] = function (b) { return this.then(null, b); };
    P.prototype['finally'] = function (f) { return this.then(function (v) { f(); return v; }, function (e) { f(); throw e; }); };
    P.resolve = function (v) { return v instanceof P ? v : new P(function (r) { r(v); }); };
    P.reject = function (e) { return new P(function (r, j) { j(e); }); };
    P.all = function (a) { return new P(function (res, rej) { var n = a.length, out = new Array(n); if (!n) return res(out); a.forEach(function (p, i) { P.resolve(p).then(function (v) { out[i] = v; if (--n === 0) res(out); }, rej); }); }); };
    P.race = function (a) { return new P(function (res, rej) { a.forEach(function (p) { P.resolve(p).then(res, rej); }); }); };
    w.Promise = P;
  }

  // ---------- audio: one shared context, unlocked by the first touch (iOS needs a sound started inside a touch handler)
  var actx = null;
  IPOD.audio = function () {
    if (actx) return actx;
    var C = w.AudioContext || w.webkitAudioContext; if (!C) return null;
    try { actx = new C(); } catch (e) { return null; }
    return actx;
  };
  function unlock() {
    var a = IPOD.audio(); if (!a) return;
    try { var b = a.createBuffer(1, 1, 22050), s = a.createBufferSource(); s.buffer = b; s.connect(a.destination); if (s.start) s.start(0); else s.noteOn(0); if (a.resume) a.resume(); } catch (e) { }
    d.removeEventListener('touchend', unlock, true);
  }
  d.addEventListener('touchend', unlock, true);

  // ---------- "needs a newer device" card for games that can't run here
  IPOD.needsNewer = function (name, why) {
    function show() {
      var b = d.body; if (!b) return setTimeout(show, 30);
      var o = d.createElement('div');
      o.setAttribute('style', 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:2147483647;background:#111;color:#eee;font:16px/1.4 Helvetica,Arial,sans-serif;text-align:center;padding:60px 24px 0;overflow:auto;-webkit-text-size-adjust:100%');
      o.innerHTML = '<div style="font-size:44px;margin-bottom:14px">📱</div>' +
        '<div style="font-size:20px;font-weight:bold;margin-bottom:10px">' + String(name || 'This game').replace(/</g, '&lt;') + '</div>' +
        '<div style="color:#aaa;margin-bottom:26px">' + (why || 'needs 3D graphics (WebGL), which this device’s browser doesn’t have. Try it on a newer phone, tablet or computer.') + '</div>' +
        '<a href="' + location.protocol + '//' + location.host + '/" style="display:inline-block;padding:12px 26px;border-radius:22px;background:#0a84ff;color:#fff;text-decoration:none;font-weight:bold">← All games</a>';
      b.appendChild(o);
    }
    show();
  };

  // ---------- more gaps builders hit on iOS 6 (all guarded: only filled in when missing)
  def(Math, 'imul', function (a, b) { var ah = (a >>> 16) & 0xffff, al = a & 0xffff, bh = (b >>> 16) & 0xffff, bl = b & 0xffff; return ((al * bl) + (((ah * bl + al * bh) << 16) >>> 0) | 0); });
  def(Object, 'values', function (o) { var r = []; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r.push(o[k]); return r; });
  def(Object, 'entries', function (o) { var r = []; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r.push([k, o[k]]); return r; });
  if (w.NodeList) def(NodeList.prototype, 'forEach', AP.forEach);
  if (w.HTMLCollection) def(HTMLCollection.prototype, 'forEach', AP.forEach);
  if (w.Element) def(Element.prototype, 'remove', function () { if (this.parentNode) this.parentNode.removeChild(this); });
  var C2 = w.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  if (C2) {
    def(C2, 'ellipse', function (x, y, rx, ry, rot, a0, a1, ccw) { this.save(); this.translate(x, y); this.rotate(rot || 0); this.scale(rx || 1e-6, ry || 1e-6); this.arc(0, 0, 1, a0, a1, !!ccw); this.restore(); });
    def(C2, 'roundRect', function (x, y, wd, ht, r) { r = Math.min(typeof r === 'number' ? r : (r && r[0]) || 0, Math.abs(wd) / 2, Math.abs(ht) / 2); this.moveTo(x + r, y); this.arcTo(x + wd, y, x + wd, y + ht, r); this.arcTo(x + wd, y + ht, x, y + ht, r); this.arcTo(x, y + ht, x, y, r); this.arcTo(x, y, x + wd, y, r); this.closePath(); });
    if (!C2.setLineDash) { C2.setLineDash = function (a) { this._dash = a; if ('webkitLineDash' in this) this.webkitLineDash = a; }; C2.getLineDash = function () { return this._dash || []; }; }
  }
  // old Web Audio names (iOS 6): createGain/createDelay, start/stop on sources, setTargetAtTime
  var AC = w.webkitAudioContext && w.webkitAudioContext.prototype;
  if (AC) {
    def(AC, 'createGain', AC.createGainNode);
    def(AC, 'createDelay', AC.createDelayNode);
    var fixSrc = function (n) { if (n && !n.start && n.noteOn) { n.start = function (t, o, d2) { if (o !== undefined && n.noteGrainOn) n.noteGrainOn(t || 0, o, d2 === undefined ? (n.buffer ? n.buffer.duration - o : 1) : d2); else n.noteOn(t || 0); }; n.stop = function (t) { n.noteOff(t || 0); }; } return n; };
    ['createOscillator', 'createBufferSource'].forEach(function (k) { var f = AC[k]; if (f) AC[k] = function () { return fixSrc(f.apply(this, arguments)); }; });
    if (w.AudioParam) def(AudioParam.prototype, 'setTargetAtTime', AudioParam.prototype.setTargetValueAtTime);
  }

  // Stop iOS rubber-band scrolling / double-tap zoom inside games that opt in: <body class="ipod-game">
  d.addEventListener('touchmove', function (e) { if (d.body && /\bipod-game\b/.test(d.body.className)) { var t = e.target; while (t && t !== d.body) { if (t.getAttribute && t.getAttribute('data-scroll') != null) return; t = t.parentNode; } e.preventDefault(); } }, false);
})(window, document);
