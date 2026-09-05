/* ============================================================
   alerts/twitch-eventsub.js — eventos REAIS via Twitch EventSub (WebSocket)
   ------------------------------------------------------------
   Fluxo 100% client-side:
     1. Autorização OAuth "Implicit Grant" da Twitch (a Twitch não oferece PKCE;
        o implicit é o fluxo oficial para apps sem backend). O token fica no
        localStorage deste navegador — nunca no código.
     2. Valida o token (id.twitch.tv/oauth2/validate) para descobrir o user_id.
     3. Abre o WebSocket wss://eventsub.wss.twitch.tv/ws e, ao receber
        "session_welcome", cria as assinaturas via Helix:
           channel.follow (v2)              -> escopo moderator:read:followers
           channel.subscribe (v1)           -> escopo channel:read:subscriptions
           channel.subscription.message(v1) -> (resub com mensagem)  idem
           channel.subscription.gift (v1)   -> (subs de presente)     idem
           channel.cheer (v1)               -> escopo bits:read
     4. Cada "notification" vira NinjaAlerts.fire({...}).

   Como ligar: abra alerts/index.html?twitch=1&setup=1 num navegador normal
   (ou use "Interagir" no OBS), clique em "Conectar Twitch", autorize.
   Depois use "Copiar URL para o OBS" — a URL leva o token no #hash e a página
   o salva no localStorage do OBS na primeira carga (e limpa o hash).

   Onde plugar o Client ID: shared/config.js -> TWITCH_CLIENT_ID (ou ?client_id=)
   Redirect URL a registrar no Twitch Developer Console:
     https://SEUUSUARIO.github.io/NOME-DO-REPO/alerts/index.html
   ============================================================ */
(function () {
  'use strict';
  var N = window.Ninja;
  var CFG = window.NINJA_CONFIG || {};
  var LS_TOKEN = 'ninja_twitch_token';
  var SCOPES = ['moderator:read:followers', 'channel:read:subscriptions', 'bits:read'];
  var WS_URL = 'wss://eventsub.wss.twitch.tv/ws';

  var enabled = N.qsBool('twitch', false);
  var setup = N.qsBool('setup', false) || N.qsBool('test', false);
  var clientId = N.setting('client_id', 'TWITCH_CLIENT_ID', '');
  var statusEl = document.getElementById('tpStatus');
  var panelRow = document.getElementById('tpTwitch');

  function status(msg, cls) {
    console.log('[twitch] ' + msg);
    if (statusEl) { statusEl.textContent = 'Twitch: ' + msg; statusEl.className = 'tp-status ' + (cls || ''); }
  }

  /* ---- 1. token: vindo do #hash (redirect OAuth ou URL do OBS) ou do localStorage ---- */
  function readHashToken() {
    if (!location.hash) return null;
    var h = new URLSearchParams(location.hash.slice(1));
    var t = h.get('access_token');
    if (t) {
      localStorage.setItem(LS_TOKEN, t);
      history.replaceState(null, '', location.pathname + location.search); // limpa o hash
      return t;
    }
    return null;
  }
  var token = readHashToken() || localStorage.getItem(LS_TOKEN);

  function redirectUri() { return location.origin + location.pathname; }

  function login() {
    if (!clientId || clientId === 'SEU_TWITCH_CLIENT_ID') {
      status('configure TWITCH_CLIENT_ID em shared/config.js', 'err'); return;
    }
    var state = N.randomString(24);
    sessionStorage.setItem('ninja_twitch_state', state);
    var url = 'https://id.twitch.tv/oauth2/authorize' +
      '?response_type=token&client_id=' + encodeURIComponent(clientId) +
      '&redirect_uri=' + encodeURIComponent(redirectUri()) +
      '&scope=' + encodeURIComponent(SCOPES.join(' ')) +
      '&state=' + state + '&force_verify=true';
    location.href = url;
  }

  function logout() { localStorage.removeItem(LS_TOKEN); token = null; location.reload(); }

  function obsUrl() {
    // URL pronta para colar no OBS: mantém os parâmetros atuais (menos setup/test) + token no hash
    var p = new URLSearchParams(location.search);
    p.delete('setup'); p.delete('test'); p.delete('demo'); p.delete('loop'); p.set('twitch', '1');
    return location.origin + location.pathname + '?' + p.toString() + '#access_token=' + token;
  }

  /* ---- painel de configuração (aparece com ?setup=1 ou ?test=1) ---- */
  function renderPanel() {
    if (!panelRow) return;
    document.body.classList.add('is-test');
    panelRow.innerHTML = '';
    if (!token) {
      var b = document.createElement('button'); b.textContent = 'Conectar Twitch'; b.onclick = login;
      panelRow.appendChild(b);
    } else {
      var c = document.createElement('button'); c.textContent = 'Copiar URL para o OBS';
      c.onclick = function () { navigator.clipboard.writeText(obsUrl()).then(function () { c.textContent = 'Copiado!'; }); };
      var d = document.createElement('button'); d.textContent = 'Desconectar'; d.className = 'secondary'; d.onclick = logout;
      panelRow.appendChild(c); panelRow.appendChild(d);
    }
  }

  if (!enabled) {
    if (setup) { status('desligado (abra com ?twitch=1)'); }
    return;
  }
  if (setup) renderPanel();
  if (!token) { status('sem token — clique em Conectar Twitch', 'err'); return; }

  /* ---- 2. valida o token e descobre o user_id ---- */
  var user = null;
  fetch('https://id.twitch.tv/oauth2/validate', { headers: { Authorization: 'OAuth ' + token } })
    .then(function (r) { if (!r.ok) throw new Error('token inválido/expirado (' + r.status + ')'); return r.json(); })
    .then(function (j) {
      user = j; clientId = j.client_id || clientId;
      status('conectado como ' + j.login + ' — abrindo EventSub…', 'ok');
      connect(WS_URL);
    })
    .catch(function (e) { status(e.message, 'err'); localStorage.removeItem(LS_TOKEN); token = null; if (setup) renderPanel(); });

  /* ---- 3. WebSocket EventSub ---- */
  var ws = null, keepaliveTimer = null, keepaliveSec = 10;

  function connect(url) {
    if (ws) { try { ws.close(); } catch (e) {} }
    ws = new WebSocket(url);
    ws.onmessage = function (ev) { onMessage(JSON.parse(ev.data)); };
    ws.onclose = function (ev) {
      status('WebSocket fechado (' + ev.code + ') — reconectando em 5 s…', 'err');
      clearTimeout(keepaliveTimer);
      setTimeout(function () { connect(WS_URL); }, 5000);
    };
    ws.onerror = function () { status('erro no WebSocket', 'err'); };
  }

  function armKeepalive() {
    clearTimeout(keepaliveTimer);
    keepaliveTimer = setTimeout(function () {
      status('sem keepalive — reconectando…', 'err');
      connect(WS_URL);
    }, (keepaliveSec + 5) * 1000);
  }

  function onMessage(msg) {
    var type = msg.metadata && msg.metadata.message_type;
    armKeepalive();
    switch (type) {
      case 'session_welcome':
        keepaliveSec = msg.payload.session.keepalive_timeout_seconds || 10;
        subscribeAll(msg.payload.session.id);
        break;
      case 'session_keepalive':
        break;
      case 'session_reconnect':
        // a Twitch pede para migrar para outra URL; a sessão antiga fecha sozinha
        connect(msg.payload.session.reconnect_url);
        break;
      case 'notification':
        handleEvent(msg.payload.subscription.type, msg.payload.event);
        break;
      case 'revocation':
        status('assinatura revogada: ' + msg.payload.subscription.type + ' (' + msg.payload.subscription.status + ')', 'err');
        break;
    }
  }

  function subscribeAll(sessionId) {
    var id = user.user_id;
    var subs = [
      { type: 'channel.follow', version: '2', condition: { broadcaster_user_id: id, moderator_user_id: id } },
      { type: 'channel.subscribe', version: '1', condition: { broadcaster_user_id: id } },
      { type: 'channel.subscription.message', version: '1', condition: { broadcaster_user_id: id } },
      { type: 'channel.subscription.gift', version: '1', condition: { broadcaster_user_id: id } },
      { type: 'channel.cheer', version: '1', condition: { broadcaster_user_id: id } },
    ];
    var ok = 0;
    Promise.all(subs.map(function (s) {
      return fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Client-Id': clientId, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: s.type, version: s.version, condition: s.condition, transport: { method: 'websocket', session_id: sessionId } }),
      }).then(function (r) {
        if (r.ok) ok++; else return r.json().then(function (j) { console.warn('[twitch] falha ao assinar ' + s.type, j); });
      });
    })).then(function () {
      status('ouvindo ' + ok + '/' + subs.length + ' eventos (' + user.login + ')', ok ? 'ok' : 'err');
    });
  }

  /* ---- 4. eventos -> alertas ---- */
  function handleEvent(type, e) {
    var A = window.NinjaAlerts;
    var name = e.user_name || e.user_login || 'alguém';
    switch (type) {
      case 'channel.follow':
        A.fire({ type: 'follow', name: name });
        break;
      case 'channel.subscribe':
        if (e.is_gift) return; // o presente já chega em channel.subscription.gift
        A.fire({ type: 'sub', name: name, amount: 1 });
        break;
      case 'channel.subscription.message': // resub com mensagem
        A.fire({ type: 'sub', name: name, amount: e.cumulative_months || 1,
                 message: e.message && e.message.text || '',
                 messageTemplate: '{name} renovou: {amount} meses de sub! 🌴' });
        break;
      case 'channel.subscription.gift':
        A.fire({ type: 'sub', name: e.is_anonymous ? 'Anônimo' : name, amount: e.total || 1,
                 messageTemplate: '{name} deu {amount} sub(s) de presente! 🎁' });
        break;
      case 'channel.cheer':
        A.fire({ type: 'bits', name: e.is_anonymous ? 'Anônimo' : name, amount: e.bits, message: e.message || '' });
        break;
    }
  }
})();
