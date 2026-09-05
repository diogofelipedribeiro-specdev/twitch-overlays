/* ============================================================
   starting-scene/script.js — cena inicial
   - escala o palco 1920×1080 para o tamanho da janela
   - lê textos da querystring
   - monta o iframe oficial do chat da Twitch
   ============================================================ */
(function () {
  'use strict';
  var N = window.Ninja;

  /* ---- escala do palco ---- */
  function fit() {
    var s = Math.min(innerWidth / 1920, innerHeight / 1080);
    document.getElementById('stage').style.transform = 'scale(' + s + ')';
  }
  addEventListener('resize', fit); fit();

  /* ---- textos ---- */
  document.getElementById('titulo').textContent = N.qs('titulo', 'COMEÇANDO JÁ JÁ');
  document.getElementById('sub').textContent    = N.qs('sub', 'pega uma água de coco e senta aí');
  document.getElementById('nome').textContent   = N.setting('nome', 'CHANNEL_DISPLAY_NAME', 'daretoreact');

  /* ---- chat ----
     Padrão: chat CUSTOMIZADO (shared/twitch-chat.js) — IRC anônimo, sem token,
     estilizado com a identidade e com emotes Twitch/BTTV/FFZ/7TV.
     ?chat=iframe usa o embed oficial da Twitch:
       https://www.twitch.tv/embed/<CANAL>/chat?parent=<HOST>
     (o "parent" DEVE ser o domínio que hospeda esta página; é detectado pelo hostname). */
  var frame = document.getElementById('chatFrame');
  var body  = document.getElementById('chatBody');
  var mode  = N.qs('chat', 'custom');

  if (mode === '0' || mode === 'off') { frame.style.display = 'none'; return; }

  var canal  = String(N.setting('canal', 'TWITCH_CHANNEL', 'SEUCANAL')).toLowerCase();
  var parent = N.qs('parent', N.chatParent());
  var dark   = N.qs('tema', 'light') === 'dark';
  var demo   = N.qsBool('demo', false);

  if (canal === 'seucanal' && !demo) {
    body.innerHTML =
      '<div class="chat-notice"><div>Configure o seu canal para o chat aparecer:</div>' +
      '<code>TWITCH_CHANNEL</code> em <code>shared/config.js</code>' +
      '<div>ou abra com <code>?canal=nome_do_canal</code></div></div>';
    return;
  }

  /* chat customizado (padrão) */
  if (mode !== 'iframe') {
    var chatEl = document.createElement('div');
    chatEl.className = 'chat-custom';
    chatEl.style.setProperty('--nchat-size', parseInt(N.qs('size', '22'), 10) + 'px');
    body.appendChild(chatEl);
    if (dark) body.classList.add('dark');
    var chat = window.NinjaChat.mount(chatEl, {
      channel: demo ? '' : canal,
      theme: dark ? 'dark' : 'light',
      max: parseInt(N.qs('max', '30'), 10),
      emotes3p: N.qsBool('emotes3p', true),
      onStatus: function (m) { console.log('[chat] ' + m); },
    });
    if (demo) {
      var fakes = [
        ['coco_gelado', 'boa live! 🌴', { badges: 'subscriber/3' }],
        ['surfista_ninja', 'esse tutorial de ninjutsu é impagável', { badges: 'moderator/1', color: '#1E90FF' }],
        ['maria_da_praia', 'cheguei agora, o que já rolou?', { color: '#FFFF00' }],
        ['daretoreact', 'sejam bem-vindos, pega uma água de coco', { badges: 'broadcaster/1', color: '#16c1c8' }],
      ];
      var i = 0;
      setInterval(function () { var f = fakes[i++ % fakes.length]; chat.addFake(f[0], f[1], f[2]); }, 1800);
    }
    return;
  }

  /* embed oficial (iframe) */
  if (location.protocol === 'file:') {
    body.innerHTML =
      '<div class="chat-notice"><div>O chat da Twitch só carrega via http(s).</div>' +
      '<div>Abra pelo GitHub Pages ou por um servidor local<br>(ex.: <code>python -m http.server</code>).</div></div>';
    return;
  }

  var url = 'https://www.twitch.tv/embed/' + encodeURIComponent(canal) + '/chat' +
            '?parent=' + encodeURIComponent(parent) + (dark ? '&darkpopout' : '');
  var iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.title = 'Chat da Twitch';
  iframe.setAttribute('allow', 'autoplay');
  body.appendChild(iframe);
})();
