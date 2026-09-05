/* ============================================================
   alerts/alerts.js — motor dos alertas
   - fila sequencial (um alerta por vez)
   - variáveis de template estilo Streamlabs
   - fonte da mensagem do usuário diminui conforme o texto cresce
   - modo teste (?test=1, ?demo=, ?loop=1)
   API pública: window.NinjaAlerts.fire({type, name, amount, message})
   ============================================================ */
window.NinjaAlerts = (function () {
  'use strict';
  var N = window.Ninja;
  var CFG = window.NINJA_CONFIG || {};
  var stage = document.getElementById('stage');
  var tpl = document.getElementById('alert-template');

  var DURATION = parseInt(N.qs('dur', CFG.ALERT_DURATION_MS || 7000), 10);
  var GAP = CFG.ALERT_GAP_MS || 600;

  // posição do alerta
  var pos = N.qs('pos', 'tl');
  if (/^(tl|tc|tr|bl|bc|br)$/.test(pos)) stage.dataset.pos = pos;

  /* ---- definição visual de cada tipo ---- */
  var TYPES = {
    follow: { kicker: 'novo seguidor',  emote: 'emote-to-de-boa', particles: 'bubbles'  },
    sub:    { kicker: 'nova inscrição', emote: 'emote-em-extase', particles: 'confetti' },
    bits:   { kicker: 'bits!',          emote: 'emote-hype',      particles: 'sparks'   },
  };

  /* ---- pré-carrega as fontes usadas nos alertas (evita medir com a fonte reserva) ---- */
  if (document.fonts && document.fonts.load) {
    ['500 30px Fredoka', '700 34px Fredoka', '800 15px Poppins', '400 20px Bungee'].forEach(function (f) { document.fonts.load(f); });
  }

  /* ---- fila ---- */
  var queue = [];
  var busy = false;

  function fire(evt) {
    evt = evt || {};
    if (!TYPES[evt.type]) evt.type = 'follow';
    queue.push(evt);
    next();
  }

  function next() {
    if (busy || !queue.length) return;
    busy = true;
    show(queue.shift(), function () {
      setTimeout(function () { busy = false; next(); }, GAP);
    });
  }

  /* ---- monta e exibe um alerta ---- */
  function show(evt, done) {
    var T = TYPES[evt.type];
    var templates = CFG.ALERT_TEMPLATES || {};
    var name = evt.name || 'alguém';
    var amount = evt.amount != null ? evt.amount : '';

    // {messageTemplate} = frase configurada, com {name}/{amount} destacados
    var msgTpl = evt.messageTemplate || templates[evt.type] || '{name}';
    var messageHtml = N.template(N.escapeHtml(msgTpl), {
      name: '<span class="hl">' + N.escapeHtml(name) + '</span>',
      amount: '<span class="hl">' + N.escapeHtml(String(amount)) + '</span>',
    });

    var frag = tpl.content.cloneNode(true);
    var root = frag.querySelector('.alert');
    root.classList.add('alert--' + evt.type, 'in');

    // preenche variáveis do template do HTML
    frag.querySelector('.alert-kicker').textContent = evt.kicker || T.kicker;
    frag.querySelector('.alert-message').innerHTML = messageHtml;
    frag.querySelector('use').setAttribute('href', '#' + T.emote);

    var um = frag.querySelector('.alert-user-message');
    var userMessage = (evt.message || '').trim();
    um.textContent = userMessage;
    um.classList.toggle('empty', !userMessage);

    stage.appendChild(frag);

    // fonte dinâmica: 30px para textos curtos, encolhendo até 14px em textos longos.
    // Se as fontes web ainda estiverem carregando, a medição usaria a fonte reserva;
    // por isso refazemos o ajuste quando document.fonts.ready resolver.
    if (userMessage) {
      // 1) ponto de partida pelo comprimento: até 70 caracteres = 30px, caindo
      //    linearmente até 14px em ~240 caracteres (funciona mesmo sem medição);
      // 2) a medição real (fitText) refina a partir daí, e é repetida no próximo
      //    frame e depois que as fontes web terminarem de carregar.
      var start = Math.round(Math.max(14, Math.min(30, 30 - (userMessage.length - 70) * 16 / 170)));
      var refit = function () { if (um.isConnected) N.fitText(um, start, 14); };
      refit();
      requestAnimationFrame(refit);
      setTimeout(refit, 120);
      if (document.fonts) document.fonts.ready.then(refit);
    }

    // partículas nascem no emote
    var emote = root.querySelector('.alert-emote').getBoundingClientRect();
    var cx = emote.left + emote.width / 2, cy = emote.top + emote.height / 2;
    window.NinjaParticles.burst(T.particles, cx, cy);
    if (evt.type === 'sub') setTimeout(function () { window.NinjaParticles.burst('confetti', cx + 300, cy); }, 250);
    if (evt.type === 'bits') setTimeout(function () { window.NinjaParticles.burst('sparks', cx, cy); }, 350);

    // saída
    setTimeout(function () {
      root.classList.remove('in'); root.classList.add('out');
      root.addEventListener('animationend', function () { root.remove(); done(); }, { once: true });
      // segurança: se a animação não disparar (ex.: prefers-reduced-motion)
      setTimeout(function () { if (root.parentNode) { root.remove(); done(); } }, 900);
    }, DURATION);
  }

  /* ============================================================
     MODO TESTE
     ============================================================ */
  var FAKE_NAMES = ['coco_gelado', 'surfista_ninja', 'maria_da_praia', 'ze_do_cajuzinho', 'vaiTerLive', 'brisa_do_mar'];
  var FAKE_MSGS = [
    '', 'boa live!', 'GG demais, ninja de férias 🌴',
    'cheguei agora, o que já rolou? tô de boa aqui vendo o mar de fundo',
    'mano essa live tá muito boa, vim do vídeo do tutorial de ninjutsu e fiquei, manda um salve pra galera de Recife que tá assistindo junto aqui em casa',
    'segunda live que assisto e já virei fã, faz mais reação a tutorial ruim por favor, o de kunai foi impagável, abraço pra família toda que tá aqui no sofá comigo assistindo hoje à noite, obrigado por existir',
  ];
  function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }

  function fake(kind) {
    var name = rnd(FAKE_NAMES);
    switch (kind) {
      case 'follow':   return { type: 'follow', name: name };
      case 'sub':      return { type: 'sub', name: name, amount: 1, message: rnd(FAKE_MSGS) };
      case 'sub-long': return { type: 'sub', name: name, amount: 12, message: FAKE_MSGS[5] };
      case 'bits':     return { type: 'bits', name: name, amount: rnd([100, 250, 500, 1000]), message: rnd(FAKE_MSGS) };
      case 'bits-huge':return { type: 'bits', name: name, amount: 10000, message: 'TOMA ESSE CAMINHÃO DE BITS 🔥' };
      default:         return fake(rnd(['follow', 'sub', 'bits']));
    }
  }

  var testMode = N.qsBool('test', false);
  var demo = N.qs('demo', null);
  var loop = N.qsBool('loop', false);

  if (testMode) {
    document.body.classList.add('is-test');
    document.querySelectorAll('[data-fire]').forEach(function (b) {
      b.addEventListener('click', function () { fire(fake(b.dataset.fire)); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      var k = e.key.toLowerCase();
      if (k === 'f') fire(fake('follow'));
      if (k === 's') fire(fake('sub'));
      if (k === 'b') fire(fake('bits'));
    });
    var posSel = document.getElementById('tpPos');
    posSel.value = stage.dataset.pos;
    posSel.addEventListener('change', function () { stage.dataset.pos = posSel.value; });
    var loopChk = document.getElementById('tpLoop');
    loopChk.checked = loop;
    loopChk.addEventListener('change', function () { loop = loopChk.checked; if (loop) loopTick(); });
  }

  if (demo) {
    var list = demo === 'all' ? ['follow', 'sub', 'bits'] : demo.split(',');
    list.forEach(function (k) { fire(fake(k)); });
  }

  function loopTick() {
    if (!loop) return;
    if (!busy && !queue.length) fire(fake('random'));
    setTimeout(loopTick, 1500);
  }
  if (loop) loopTick();

  return { fire: fire, fake: fake, TYPES: TYPES };
})();
