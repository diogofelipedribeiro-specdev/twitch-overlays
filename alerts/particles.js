/* ============================================================
   alerts/particles.js — partículas em canvas (sem imagens)
   Três "receitas" dentro da paleta:
     bubbles  -> bolhinhas subindo (follow, suave)
     confetti -> confete festivo (sub)
     sparks   -> faíscas explodindo (bits)
   Uso: NinjaParticles.burst('confetti', x, y)
   ============================================================ */
window.NinjaParticles = (function () {
  'use strict';
  var canvas = document.getElementById('particles');
  var ctx = canvas.getContext('2d');
  var parts = [];
  var running = false;
  var last = 0;

  function palette() {
    var s = getComputedStyle(document.documentElement);
    var get = function (v) { return s.getPropertyValue(v).trim(); };
    return {
      primary: get('--c-primary'), teal2: get('--c-teal-2'), teal3: get('--c-teal-3'),
      teal4: get('--c-teal-4'), sand: get('--c-sand'), ink: get('--c-ink'),
      white: get('--c-white'), coral: get('--c-coral'),
    };
  }

  function resize() {
    canvas.width = innerWidth * devicePixelRatio;
    canvas.height = innerHeight * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
  addEventListener('resize', resize); resize();

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  /* ---- receitas ---- */
  var RECIPES = {
    bubbles: function (x, y, P) {
      var out = [];
      for (var i = 0; i < 26; i++) {
        out.push({
          kind: 'circle', x: x + rand(-160, 160), y: y + rand(-20, 60),
          vx: rand(-15, 15), vy: rand(-90, -40), g: -8, drag: .995,
          r: rand(4, 14), color: pick([P.primary, P.teal2, P.teal3, P.teal4]),
          life: rand(2.2, 3.4), t: 0, stroke: P.ink, alpha: .9,
        });
      }
      return out;
    },
    confetti: function (x, y, P) {
      var out = [];
      for (var i = 0; i < 110; i++) {
        var a = rand(-Math.PI, 0), sp = rand(200, 560);
        out.push({
          kind: 'rect', x: x, y: y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 700, drag: .985,
          w: rand(8, 16), h: rand(5, 9), rot: rand(0, 6.28), vr: rand(-8, 8),
          color: pick([P.primary, P.teal2, P.teal3, P.teal4, P.sand, P.coral, P.white]),
          life: rand(2.2, 3.6), t: 0, stroke: P.ink, alpha: 1,
        });
      }
      return out;
    },
    sparks: function (x, y, P) {
      var out = [];
      for (var i = 0; i < 90; i++) {
        var a = rand(0, 6.283), sp = rand(160, 700);
        out.push({
          kind: 'spark', x: x, y: y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 500, drag: .96,
          len: rand(6, 22), color: pick([P.primary, P.white, P.teal3, P.teal2]),
          life: rand(.7, 1.4), t: 0, alpha: 1, glow: true,
        });
      }
      // estrelinhas que ficam um pouco mais
      for (var j = 0; j < 14; j++) {
        out.push({
          kind: 'star', x: x + rand(-220, 220), y: y + rand(-120, 120),
          vx: rand(-30, 30), vy: rand(-80, -20), g: 0, drag: .99,
          r: rand(6, 12), color: pick([P.white, P.primary]), rot: rand(0, 6.28), vr: rand(-4, 4),
          life: rand(1.4, 2.4), t: 0, alpha: 1, glow: true,
        });
      }
      return out;
    },
  };

  function burst(kind, x, y) {
    var P = palette();
    var recipe = RECIPES[kind];
    if (!recipe) return;
    parts = parts.concat(recipe(x, y, P));
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(tick); }
  }

  function star(cx, cy, r, rot) {
    ctx.beginPath();
    for (var i = 0; i < 8; i++) {
      var rr = i % 2 ? r * .45 : r, a = rot + i * Math.PI / 4;
      ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    ctx.closePath();
  }

  function tick(now) {
    var dt = Math.min(.05, (now - last) / 1000); last = now;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.t += dt;
      if (p.t >= p.life) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt; p.vx *= p.drag; p.vy *= p.drag;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.vr) p.rot += p.vr * dt;
      var k = 1 - p.t / p.life;                       // 1 -> 0
      ctx.globalAlpha = Math.min(1, k * 2) * p.alpha;
      ctx.fillStyle = p.color; ctx.strokeStyle = p.stroke || p.color;
      ctx.shadowBlur = p.glow ? 12 : 0; ctx.shadowColor = p.color;
      ctx.save(); ctx.translate(p.x, p.y);
      if (p.kind === 'circle') {
        ctx.beginPath(); ctx.arc(0, 0, p.r, 0, 6.283); ctx.fill();
        ctx.lineWidth = 2; ctx.globalAlpha *= .6; ctx.stroke();
      } else if (p.kind === 'rect') {
        ctx.rotate(p.rot); ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.lineWidth = 1.5; ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
      } else if (p.kind === 'spark') {
        var ang = Math.atan2(p.vy, p.vx);
        ctx.rotate(ang); ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-p.len * k, 0); ctx.stroke();
      } else if (p.kind === 'star') {
        star(0, 0, p.r * (0.6 + 0.4 * Math.sin(p.t * 7)), p.rot); ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    if (parts.length) requestAnimationFrame(tick);
    else { running = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  }

  return { burst: burst };
})();
