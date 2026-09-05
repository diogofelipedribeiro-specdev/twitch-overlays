/* ============================================================
   shared/twitch-chat.js — chat da Twitch customizado (somente leitura)
   ------------------------------------------------------------
   Conecta no IRC da Twitch por WebSocket em modo ANÔNIMO (justinfan),
   sem token nem chave. Renderiza as mensagens com a identidade visual.
   Emotes: Twitch (via tags do IRC) + BTTV, FFZ e 7TV (APIs públicas,
   globais e do canal). Trata PING, RECONNECT, CLEARCHAT, CLEARMSG e
   USERNOTICE (sub/resub/raid viram mensagens destacadas).

   Uso:
     var chat = NinjaChat.mount(document.getElementById('chat'), {
       channel: 'daretoreact',   // login do canal
       theme: 'light',           // 'light' | 'dark' (contraste dos nomes)
       max: 40,                  // mensagens mantidas na tela
       fade: 0,                  // segundos até a mensagem sumir (0 = nunca)
       emotes3p: true,           // BTTV / FFZ / 7TV
       onStatus: function (msg, ok) {}
     });
     chat.disconnect();
   Estilos: chat/style.css (classes .nchat-*)
   ============================================================ */
window.NinjaChat = (function () {
  'use strict';
  var IRC_URL = 'wss://irc-ws.chat.twitch.tv:443';

  /* ---------- parsing IRC ---------- */
  function unescapeTag(v) {
    return v.replace(/\\(.)/g, function (_, c) { return { s: ' ', ':': ';', n: '\n', r: '\r', '\\': '\\' }[c] || c; });
  }
  function parseTags(raw) {
    var tags = {};
    raw.split(';').forEach(function (kv) {
      var i = kv.indexOf('=');
      if (i < 0) { tags[kv] = ''; return; }
      tags[kv.slice(0, i)] = unescapeTag(kv.slice(i + 1));
    });
    return tags;
  }
  function parseLine(line) {
    var tags = {}, prefix = null, rest = line, trailing = null, i;
    if (rest[0] === '@') { i = rest.indexOf(' '); tags = parseTags(rest.slice(1, i)); rest = rest.slice(i + 1); }
    if (rest[0] === ':') { i = rest.indexOf(' '); prefix = rest.slice(1, i); rest = rest.slice(i + 1); }
    i = rest.indexOf(' :');
    if (i >= 0) { trailing = rest.slice(i + 2); rest = rest.slice(0, i); }
    else if (rest[0] === ':') { trailing = rest.slice(1); rest = ''; }
    var parts = rest.split(' ').filter(Boolean);
    return { tags: tags, prefix: prefix, command: parts[0], params: parts.slice(1), trailing: trailing };
  }

  /* ---------- cores dos nomes ---------- */
  var FALLBACK = ['#16c1c8', '#0f9ba1', '#5e7f7a', '#c98a52', '#f2807f', '#17565c'];
  function hashColor(name) {
    var h = 0; for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
    return FALLBACK[Math.abs(h) % FALLBACK.length];
  }
  function hexToHsl(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex); if (!m) return null;
    var n = parseInt(m[1], 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, h = 0, s = 0;
    if (max !== min) {
      var d = max - min; s = l > .5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0); else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h /= 6;
    }
    return [h * 360, s * 100, l * 100];
  }
  /* Twitch escolhe cores pensando em fundo escuro; no tema claro escurecemos as muito claras */
  function readableColor(hex, theme) {
    var hsl = hexToHsl(hex); if (!hsl) return hex;
    if (theme === 'dark') { if (hsl[2] < 45) hsl[2] = 62; }
    else {
      // amarelos/verdes-limão precisam escurecer mais para ler em fundo claro
      var limit = (hsl[0] > 40 && hsl[0] < 190) ? 34 : 42;
      if (hsl[2] > limit) hsl[2] = limit;
      if (hsl[1] < 25 && hsl[2] > 35) hsl[2] = 32;
    }
    return 'hsl(' + hsl[0].toFixed(0) + ',' + hsl[1].toFixed(0) + '%,' + hsl[2].toFixed(0) + '%)';
  }

  /* ---------- emotes de terceiros ---------- */
  function get(url) { return fetch(url).then(function (r) { return r.ok ? r.json() : null; }); }
  function loadThirdParty(roomId) {
    var map = {};
    function add(name, url) { if (name && url && !map[name]) map[name] = url; }
    function bttv(list) { (list || []).forEach(function (e) { add(e.code, 'https://cdn.betterttv.net/emote/' + e.id + '/2x'); }); }
    function ffz(d) {
      if (!d || !d.sets) return;
      Object.keys(d.sets).forEach(function (k) {
        (d.sets[k].emoticons || []).forEach(function (e) {
          var u = e.urls && (e.urls['2'] || e.urls['1']); if (u && u.indexOf('//') === 0) u = 'https:' + u;
          add(e.name, u);
        });
      });
    }
    function seventv(list) {
      (list || []).forEach(function (e) {
        var host = e.data && e.data.host; if (!host) return;
        add(e.name, 'https:' + host.url + '/2x.webp');
      });
    }
    var jobs = [
      get('https://api.betterttv.net/3/cached/emotes/global').then(bttv),
      get('https://api.betterttv.net/3/cached/users/twitch/' + roomId).then(function (d) { if (d) { bttv(d.channelEmotes); bttv(d.sharedEmotes); } }),
      get('https://api.frankerfacez.com/v1/set/global').then(ffz),
      get('https://api.frankerfacez.com/v1/room/id/' + roomId).then(ffz),
      get('https://7tv.io/v3/emote-sets/global').then(function (d) { seventv(d && d.emotes); }),
      get('https://7tv.io/v3/users/twitch/' + roomId).then(function (d) { seventv(d && d.emote_set && d.emote_set.emotes); }),
    ].map(function (p) { return p.catch(function () {}); });
    return Promise.all(jobs).then(function () { return map; });
  }

  /* ---------- render de uma mensagem ---------- */
  function emoteImg(url, alt) {
    var img = document.createElement('img');
    img.className = 'nchat-emote'; img.src = url; img.alt = alt; img.title = alt; img.loading = 'lazy';
    return img;
  }
  function renderText(text, tags, thirdParty, theme) {
    var frag = document.createDocumentFragment();
    var chars = Array.from(text);                       // posições dos emotes contam code points
    var ranges = [];
    if (tags.emotes) {
      tags.emotes.split('/').forEach(function (e) {
        var p = e.split(':'); if (p.length < 2) return;
        p[1].split(',').forEach(function (r) {
          var se = r.split('-'); ranges.push({ id: p[0], s: +se[0], e: +se[1] });
        });
      });
      ranges.sort(function (a, b) { return a.s - b.s; });
    }
    var variant = theme === 'dark' ? 'dark' : 'light';
    function plain(str) {
      // procura emotes de terceiros palavra a palavra
      str.split(/(\s+)/).forEach(function (w) {
        if (thirdParty[w]) frag.appendChild(emoteImg(thirdParty[w], w));
        else frag.appendChild(document.createTextNode(w));
      });
    }
    var pos = 0;
    ranges.forEach(function (r) {
      if (r.s > pos) plain(chars.slice(pos, r.s).join(''));
      var name = chars.slice(r.s, r.e + 1).join('');
      frag.appendChild(emoteImg('https://static-cdn.jtvnw.net/emoticons/v2/' + r.id + '/default/' + variant + '/2.0', name));
      pos = r.e + 1;
    });
    if (pos < chars.length) plain(chars.slice(pos).join(''));
    return frag;
  }
  var BADGES = { broadcaster: 'dono', moderator: 'mod', vip: 'vip', subscriber: 'sub' };
  function renderBadges(tags) {
    var wrap = document.createElement('span'); wrap.className = 'nchat-badges';
    (tags.badges || '').split(',').forEach(function (b) {
      var key = b.split('/')[0];
      if (!BADGES[key]) return;
      var s = document.createElement('span'); s.className = 'nchat-badge nchat-badge--' + key; s.textContent = BADGES[key];
      wrap.appendChild(s);
    });
    return wrap;
  }

  /* ---------- montagem ---------- */
  function mount(container, opts) {
    opts = opts || {};
    var channel = String(opts.channel || '').toLowerCase().replace(/^#/, '');
    var theme = opts.theme || 'light';
    var max = opts.max || 40;
    var fade = opts.fade || 0;
    var status = opts.onStatus || function () {};
    var thirdParty = {};
    var ws = null, closed = false, retry = 1000;

    container.classList.add('nchat', 'nchat--' + theme);
    var list = document.createElement('div'); list.className = 'nchat-list';
    container.appendChild(list);

    function push(node) {
      list.appendChild(node);
      while (list.children.length > max) list.removeChild(list.firstChild);
      if (fade > 0) setTimeout(function () {
        node.classList.add('nchat-fading');
        setTimeout(function () { node.remove(); }, 800);
      }, fade * 1000);
    }

    function addMessage(tags, login, text, kind) {
      var el = document.createElement('div');
      el.className = 'nchat-msg' + (kind ? ' nchat-msg--' + kind : '');
      el.dataset.id = tags.id || ''; el.dataset.user = login || '';
      var name = tags['display-name'] || login || '';
      var head = document.createElement('div'); head.className = 'nchat-head';
      head.appendChild(renderBadges(tags));
      var nm = document.createElement('span'); nm.className = 'nchat-name';
      nm.textContent = name; nm.style.color = readableColor(tags.color || hashColor(login || name), theme);
      head.appendChild(nm);
      el.appendChild(head);
      if (kind === 'system' && tags['system-msg']) {
        var sys = document.createElement('div'); sys.className = 'nchat-system'; sys.textContent = tags['system-msg'];
        el.appendChild(sys);
      }
      if (text) {
        var body = document.createElement('div'); body.className = 'nchat-text';
        var isAction = /^ACTION (.*)$/.test(text);
        if (isAction) { text = text.replace(/^ACTION (.*)$/, '$1'); body.classList.add('nchat-text--action'); }
        body.appendChild(renderText(text, tags, thirdParty, theme));
        el.appendChild(body);
      }
      push(el);
    }

    function handle(msg) {
      switch (msg.command) {
        case 'PING': ws.send('PONG :tmi.twitch.tv'); break;
        case 'PRIVMSG': addMessage(msg.tags, (msg.prefix || '').split('!')[0], msg.trailing || ''); break;
        case 'USERNOTICE': addMessage(msg.tags, msg.tags.login, msg.trailing || '', 'system'); break;
        case 'ROOMSTATE':
          if (msg.tags['room-id'] && opts.emotes3p !== false && !thirdParty.__loaded) {
            thirdParty.__loaded = true;
            loadThirdParty(msg.tags['room-id']).then(function (m) { Object.assign(thirdParty, m); status('emotes carregados (' + Object.keys(m).length + ')', true); });
          }
          break;
        case 'CLEARCHAT':
          if (msg.trailing) list.querySelectorAll('[data-user="' + msg.trailing.toLowerCase() + '"]').forEach(function (n) { n.remove(); });
          else list.innerHTML = '';
          break;
        case 'CLEARMSG':
          var t = msg.tags['target-msg-id']; if (t) list.querySelectorAll('[data-id="' + t + '"]').forEach(function (n) { n.remove(); });
          break;
        case 'RECONNECT': try { ws.close(); } catch (e) {} break;
        case '001': status('conectado a #' + channel, true); retry = 1000; break;
      }
    }

    function connect() {
      if (closed) return;
      status('conectando…');
      ws = new WebSocket(IRC_URL);
      ws.onopen = function () {
        ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
        ws.send('NICK justinfan' + Math.floor(10000 + Math.random() * 89999));
        ws.send('JOIN #' + channel);
      };
      ws.onmessage = function (ev) {
        ev.data.split('\r\n').forEach(function (line) { if (line) handle(parseLine(line)); });
      };
      ws.onclose = function () {
        if (closed) return;
        status('desconectado — tentando de novo em ' + (retry / 1000) + ' s', false);
        setTimeout(connect, retry); retry = Math.min(retry * 2, 30000);
      };
      ws.onerror = function () { status('erro na conexão', false); };
    }
    if (!channel) { status('canal não configurado', false); }
    else connect();

    return {
      disconnect: function () { closed = true; try { ws && ws.close(); } catch (e) {} },
      addFake: function (name, text, extra) { addMessage(Object.assign({ 'display-name': name, color: hashColor(name) }, extra || {}), name.toLowerCase(), text); },
    };
  }

  return { mount: mount, parseLine: parseLine };
})();
