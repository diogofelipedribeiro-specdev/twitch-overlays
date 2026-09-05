# daretoreact · overlays e widgets para Twitch (ninja praiano)

Kit de overlays 100% estático (HTML/CSS/JS puro, sem build e sem backend), pronto para o **GitHub Pages** e para ser usado como **Browser Source** no OBS / Streamlabs.

A identidade visual (mascote ninja praiano, banner, emotes, thumbnail, paleta e fontes) vem do handoff do Claude Design. As artes **não foram recriadas**: os SVGs em `assets/` são gerados diretamente do arquivo de design original (`assets/source/ninja-praiano-design-original.html`).

```
├── index.html              página índice com links prontos para o OBS
├── starting-scene/         cena inicial (thumb como fundo + AO VIVO + chat)
├── overlay-gameplay/       HUD de gameplay (com e sem câmera)
├── alerts/                 alertas follow / sub / bits (+ Twitch EventSub)
├── now-playing/            widget Spotify (PKCE)
├── chat/                   chat customizado (widget isolado; motor em shared/twitch-chat.js)
├── transition/             transição entre cenas (onda + mascote)
├── lol/                    cena de League of Legends com map cover
├── assets/
│   ├── svg/                mascote, palmeira, banner 1200×480, thumbnail 1280×720
│   ├── emotes/             risada, hype, gg, to-de-boa, em-extase
│   └── source/             design original do handoff (fonte das artes)
├── tools/gen-assets.py     regenera os SVGs a partir do design original (Python 3)
└── shared/
    ├── theme.css           TEMA CENTRAL: cores e fontes (CSS variables)
    ├── config.js           placeholders: canal, Client IDs, textos dos alertas
    ├── sprites.js          injeta os desenhos do mascote em qualquer página
    ├── utils.js            querystring, template {name}, fonte dinâmica, PKCE
    └── twitch-chat.js      IRC anônimo da Twitch + emotes BTTV/FFZ/7TV
```

---

## 1. Identidade visual (do handoff)

| Token          | Valor     | Uso                               |
| -------------- | --------- | --------------------------------- |
| `--c-primary`  | `#16c1c8` | primária (água, pílulas, faixas)  |
| `--c-teal-2`   | `#49cccc` | mar / areia da thumb              |
| `--c-teal-3`   | `#7cd7cf` | espuma / detalhes                 |
| `--c-teal-4`   | `#aee1d3` | fundos claros                     |
| `--c-sand`     | `#e1ecd6` | mais clara (fundo dos cartões)    |
| `--c-ink`      | `#123c3f` | contorno e texto escuro           |
| `--c-primary-dark` | `#0f9ba1` | títulos secundários            |
| `--c-muted`    | `#5e7f7a` | textos de apoio                   |

Fontes (Google Fonts, carregadas em `shared/theme.css`):

- **Bungee** → nome do canal e títulos de impacto (`--font-impact`)
- **Fredoka** → alertas e textos legíveis (`--font-text`)
- **Poppins** → thumbnail, banner e painéis (`--font-panel`)

Para trocar qualquer cor ou fonte em **todos** os overlays, edite apenas `shared/theme.css`.

Velocidade das animações: também em `shared/theme.css`, nas variáveis `--anim-in` (entradas), `--anim-out` (saídas), `--anim-pulse` (pontinho AO VIVO), `--anim-idle` (balanços leves) e `--anim-slow` (respiração do cenário). Aumente os valores para deixar tudo mais lento; as demais animações de cada overlay são proporcionais a elas.

Para desligar todo o movimento de um overlay, acrescente `?motion=0` à URL. Os overlays **ignoram** a opção "reduzir animações" do sistema operacional de propósito: no OBS eles devem animar sempre, e encurtar loops infinitos para ~0 ms faria os elementos tremerem em vez de parar.

> Fontes offline: se preferir não depender do Google Fonts, baixe os `.woff2` para `assets/fonts/` e troque o `@import` de `theme.css` por regras `@font-face`.

---

## 2. Deploy no GitHub Pages

O repositório oficial é `diogofelipedribeiro-specdev/twitch-overlays` e o site fica em:

```
https://diogofelipedribeiro-specdev.github.io/twitch-overlays/
```

A publicação é **automática** pelo workflow `.github/workflows/deploy.yml` (GitHub Actions). A cada push na branch `main`:

1. **validate** — regenera os SVGs com `tools/gen-assets.py` e falha se os arquivos commitados estiverem desatualizados; roda `tools/check-links.py` (confere que todo `href`/`src`/`url()` aponta para um arquivo existente com o mesmo caso de letras, já que o Pages roda em Linux); valida a sintaxe dos HTMLs com `htmlhint`.
2. **deploy** — empacota a raiz do repositório e publica no GitHub Pages (`actions/deploy-pages`). A URL aparece no resumo do job.

Configuração única no GitHub, **antes da primeira execução**: **Settings → Pages → Build and deployment → Source: "GitHub Actions"**. O token do workflow não tem permissão para criar o site do Pages sozinho; sem esse passo o job `deploy` falha com "Resource not accessible by integration".

Fluxo do dia a dia:

```bash
python tools/gen-assets.py     # só se você editou o design em assets/source
git add -A
git commit -m "ajuste nos alertas"
git push
```

Depois de 1 a 2 minutos o site está atualizado; acompanhe em **Actions**. Para publicar sem novo commit, use **Actions → Deploy no GitHub Pages → Run workflow**.

O arquivo `.nojekyll` continua na raiz (evita que o GitHub processe o site com Jekyll caso o Pages seja trocado para "Deploy from a branch").

Teste local (o chat da Twitch e as APIs exigem http, não `file://`):

```bash
python -m http.server 8080
```

e abra `http://localhost:8080/`.

---

## 3. Configuração (placeholders)

Tudo fica em **`shared/config.js`**. Nenhum segredo vai para o código: só Client IDs (públicos). Tokens são obtidos no navegador e ficam no `localStorage`.

| Chave                  | O que é                                                | Exemplo                |
| ---------------------- | ------------------------------------------------------ | ---------------------- |
| `TWITCH_CHANNEL`       | login do canal (minúsculo) — chat e EventSub           | `daretoreact`          |
| `CHANNEL_DISPLAY_NAME` | nome exibido nos overlays                              | `daretoreact`          |
| `CHAT_PARENT`          | `parent` do embed do chat; vazio = automático          | `seuusuario.github.io` |
| `TWITCH_CLIENT_ID`     | app do Twitch Developer Console (alertas em produção)  | `abc123…`              |
| `SPOTIFY_CLIENT_ID`    | app do Spotify Developer Dashboard (Now Playing)       | `def456…`              |
| `ALERT_TEMPLATES`      | frases dos alertas com `{name}` e `{amount}`           | ver arquivo            |

Todos os valores podem ser sobrescritos pela URL (`?canal=`, `?nome=`, `?client_id=`…), útil para testar sem editar arquivos.

---

## 4. Overlays

### 4.1 Cena inicial — `starting-scene/index.html`

Browser Source **1920 × 1080**. Usa a composição do template de thumbnail como fundo (faixa diagonal, sol, areia, palmeira e mascote), com a pílula **AO VIVO** e, abaixo dela, o **chat da Twitch** dentro de uma moldura no estilo da identidade.

Por padrão o chat é o **customizado** (seção 4.5): bolhas, emotes e selos com a identidade, sem token. Com `?chat=iframe` a cena volta ao embed oficial da Twitch:

```
https://www.twitch.tv/embed/SEUCANAL/chat?parent=diogofelipedribeiro-specdev.github.io
```

- `SEUCANAL` → `TWITCH_CHANNEL` em `shared/config.js` ou `?canal=`.
- `parent` → **deve ser o domínio que hospeda a página**. É detectado automaticamente (`diogofelipedribeiro-specdev.github.io` no Pages, `localhost` em teste). Force com `CHAT_PARENT` ou `?parent=` se necessário.
- O conteúdo interno do iframe não é estilizável (regra da Twitch); a moldura sim. `?tema=dark` ativa o modo escuro do chat.

Parâmetros: `?titulo=`, `?sub=`, `?nome=`, `?tema=dark`, `?chat=0`, `?chat=iframe`, `?size=`, `?max=`, `?demo=1`.

### 4.2 HUD de gameplay — `overlay-gameplay/`

Browser Source **1920 × 1080**, fundo transparente. HUD mínimo para não atrapalhar o jogo.

| Versão      | URL                                                      |
| ----------- | -------------------------------------------------------- |
| com câmera  | `overlay-gameplay/index.html?cam=1` (ou `com-camera.html`) |
| sem câmera  | `overlay-gameplay/index.html?cam=0` (ou `sem-camera.html`) |

Na versão com câmera a área interna da moldura é **transparente**: no OBS, coloque a fonte da webcam **abaixo** deste Browser Source e alinhe com o recorte (480 × 270 por padrão, canto inferior esquerdo, 32 px de margem).

Parâmetros: `?pos=bl|br|tl|tr`, `?w=480` (largura da câmera), `?nome=`, `?social=@arroba`, `?live=0`.

### 4.3 Alertas — `alerts/index.html`

Browser Source **1920 × 1080**, transparente. Três tipos com animação própria e partículas em canvas (sem imagens):

| Tipo   | Entrada                       | Partículas       | Emote        |
| ------ | ----------------------------- | ---------------- | ------------ |
| follow | desliza da esquerda, suave    | bolhinhas        | tô de boa    |
| sub    | cai de cima e quica, festivo  | confete          | em êxtase    |
| bits   | zoom + tremida, brilho        | faíscas          | hype         |

Texto alinhado à esquerda. A mensagem do usuário tem **fonte dinâmica**: começa em 30 px e diminui até 14 px conforme o texto cresce (`Ninja.fitText`).

Variáveis de template (estilo Streamlabs): `{name}`, `{amount}`, `{messageTemplate}`, `{userMessage}`. As frases ficam em `ALERT_TEMPLATES` (`shared/config.js`).

**Modo teste / preview:**

```
alerts/index.html?test=1        painel com botões (teclas F, S, B também disparam)
alerts/index.html?demo=all      dispara follow, sub e bits ao abrir
alerts/index.html?loop=1        fica repetindo alertas aleatórios
```

Também dá para disparar pelo console: `NinjaAlerts.fire({ type: 'bits', name: 'fulano', amount: 500, message: 'oi' })`.

Parâmetros: `?pos=tl|tc|tr|bl|bc|br`, `?dur=7000`.

### 4.4 Now Playing (Spotify) — `now-playing/index.html`

Browser Source **560 × 160**, transparente. Mostra capa, música, artista e barra de progresso (interpolada localmente entre consultas). Polling do endpoint `currently-playing` a cada 3 s (`?poll=`).

Parâmetros: `?setup=1`, `?autohide=1`, `?compact=1`, `?tema=dark`, `?demo=1`.

---

### 4.5 Chat customizado — `chat/index.html` (e dentro da cena inicial)

A cena inicial agora usa um chat **customizado** no lugar do iframe genérico: `shared/twitch-chat.js` conecta no IRC da Twitch por WebSocket em modo **anônimo** (sem token, somente leitura) e renderiza as mensagens com a identidade: bolhas com contorno, nome na cor do usuário (ajustada para contraste), selos de dono/mod/vip/sub, animação de entrada e emotes da **Twitch, BTTV, FFZ e 7TV** (globais e do canal, via APIs públicas sem chave). Trata `CLEARCHAT`/`CLEARMSG` (mensagens apagadas somem), `USERNOTICE` (sub, resub, raid viram avisos destacados) e reconecta sozinho.

`chat/index.html` é o mesmo chat como widget isolado (Browser Source **500 × 800**, transparente) para usar em qualquer cena.

Parâmetros: `?canal=`, `?tema=dark`, `?size=22`, `?max=40`, `?fade=30` (mensagens somem após N s, bom em gameplay), `?frame=1` (moldura), `?emotes3p=0`, `?demo=1`. Na cena inicial, `?chat=iframe` volta ao embed oficial da Twitch e `?chat=0` esconde o chat.

### 4.6 Transição entre cenas — `transition/index.html`

Browser Source **1920 × 1080**, transparente. Uma onda diagonal nas cores da identidade varre a tela, o mascote aparece no centro e tudo sai pelo outro lado. Duração padrão de 1,6 s, ajustável.

Como o OBS só aceita vídeo como transição nativa, o overlay funciona assim:

1. Adicione a página como fonte de navegador em **cada cena** (clique com o botão direito na fonte → Copiar → Colar (referência) nas outras cenas).
2. Nas propriedades da fonte, marque **"Atualizar navegador quando a cena ficar ativa"**. A animação toca toda vez que a cena entra.
3. Deixe a fonte no topo da lista de fontes.

Ela também reage ao evento `obsSceneChanged` do OBS quando a fonte é compartilhada. Parâmetros: `?dur=1600`, `?texto=Gameplay`, `?dir=rl`, `?emote=hype`, `?full=1` (corpo inteiro), `?loop=1` (pré-visualização).

### 4.7 Cena League of Legends com map cover — `lol/index.html`

Browser Source **1920 × 1080**, transparente. Reúne o nome do canal (mesmo badge do HUD) e um **map cover**: uma arte da identidade cobre o minimapa deixando **recortes** transparentes sobre o que você quer continuar vendo. Reproduz a função da ferramenta lea.gy/map-cover-creator com o visual da stream.

Grupos de recortes (cada um liga/desliga): Baron, Dragão, escutas, buffs azul/vermelho, camps pequenos, arbustos de ward e faixas das rotas top/mid/bot (para os ícones dos laners). As posições vêm das coordenadas do Summoner's Rift normalizadas para o quadrado do minimapa.

Animações ligadas à live (`?anim=0` desliga): varredura de radar sobre a capa, anéis dos recortes pulsando como wards, espuma na borda de cima, mascote espiando por cima do cover de tempos em tempos e pílula AO VIVO.

**Configuração** (`lol/index.html?setup=1`, num navegador normal ou pelo botão "Interagir" do OBS):

- Ligue a **guia tracejada** e ajuste tamanho/posição até cobrir exatamente o minimapa do jogo. O padrão (300 px em 1620, 780) é uma aproximação para escala padrão em 1080p no canto inferior direito.
- **Imagem própria**: botão de arquivo (fica salva no armazenamento do navegador/OBS onde foi enviada, até 4 MB) ou campo de URL / `?img=` para uma imagem no repositório (ex.: `../assets/minha-capa.png`). "Remover imagem" volta para `lol/cover-default.svg`, gerado do design original.
- **Copiar URL** gera o link com todos os ajustes (tamanho, posição, raio, rotas, grupos, opacidade). A imagem enviada por arquivo não vai na URL; para usá-la no OBS, envie pelo "Interagir" ou hospede em `assets/` e use `?img=`.

Todos os ajustes ficam em `localStorage`; os parâmetros da URL têm prioridade.

## 5. Spotify — registro do app e login (PKCE)

1. Acesse <https://developer.spotify.com/dashboard> → **Create app**.
2. Em **Redirect URIs** adicione **exatamente** a URL da página do widget:
   ```
   https://diogofelipedribeiro-specdev.github.io/twitch-overlays/now-playing/index.html
   ```
   Para testes locais adicione também `http://127.0.0.1:8080/now-playing/index.html` (o Spotify não aceita `localhost`; use `127.0.0.1`).
3. Marque **Web API**, salve e copie o **Client ID** para `SPOTIFY_CLIENT_ID` em `shared/config.js`.
   Não é preciso (nem se deve) usar o Client Secret: o fluxo é *Authorization Code with PKCE*.
4. Abra `now-playing/index.html?setup=1` num navegador normal → **Conectar Spotify** → autorize.
5. Clique em **Copiar URL para o OBS** e cole no Browser Source. Essa URL leva o `refresh_token` no `#hash`; na primeira carga a página o guarda no `localStorage` do OBS e limpa o hash.
   Alternativa: adicione a URL sem token no OBS, clique em **Interagir** e faça o login ali mesmo.

Escopos usados: `user-read-currently-playing user-read-playback-state`. O `access_token` é renovado automaticamente pelo `refresh_token` (também sem secret).

---

## 6. Twitch — alertas em produção (EventSub WebSocket)

O conector está em `alerts/twitch-eventsub.js` e é ativado com `?twitch=1`.

### 6.1 Registro do app

1. Acesse <https://dev.twitch.tv/console/apps> → **Register Your Application**.
2. **OAuth Redirect URLs**: a URL da página de alertas:
   ```
   https://diogofelipedribeiro-specdev.github.io/twitch-overlays/alerts/index.html
   ```
   (para teste local: `http://localhost:8080/alerts/index.html`)
3. Category: *Broadcaster Suite*. Client Type: **Public**. Salve e copie o **Client ID** para `TWITCH_CLIENT_ID`.

### 6.2 Autorização

A Twitch não oferece PKCE; para apps sem backend o fluxo oficial é o **OAuth Implicit Grant** (`response_type=token`), também 100% client-side. O token fica só no `localStorage`.

1. Abra `alerts/index.html?twitch=1&setup=1` num navegador normal → **Conectar Twitch** → autorize os escopos:
   - `moderator:read:followers` → `channel.follow`
   - `channel:read:subscriptions` → `channel.subscribe`, `channel.subscription.message`, `channel.subscription.gift`
   - `bits:read` → `channel.cheer`
2. O painel mostra "ouvindo 5/5 eventos". Clique em **Copiar URL para o OBS** e cole no Browser Source (mesma mecânica do Spotify: token no `#hash`, salvo no primeiro carregamento).

### 6.3 Como as assinaturas são criadas

Ao receber `session_welcome` do WebSocket `wss://eventsub.wss.twitch.tv/ws`, o script faz um `POST https://api.twitch.tv/helix/eventsub/subscriptions` por evento, com `transport: { method: 'websocket', session_id }`, headers `Authorization: Bearer <token>` e `Client-Id`. Reconexão automática (`session_reconnect`, keepalive perdido, fechamento).

Mapeamento evento → alerta em `handleEvent()`; para adicionar `channel.raid`, por exemplo, inclua-o na lista `subs` e trate no `switch`.

### 6.4 Alternativa: Streamlabs

Se preferir os eventos pelo Streamlabs, use **Alert Box → Custom HTML/CSS/JS**: o layout de `alerts/index.html` usa as mesmas variáveis (`{name}`, `{amount}`, `{userMessage}`) e o CSS de `alerts/style.css` pode ser colado direto (troque `var(--c-…)` pelos valores de `shared/theme.css`, pois o Streamlabs não carrega arquivos externos).

---

## 7. Adicionando no OBS / Streamlabs

1. **Fontes → + → Navegador (Browser Source)**.
2. Cole a URL do overlay (a página índice do site mostra todas), largura/altura conforme a tabela abaixo, marque **"Desligar a fonte quando não estiver visível"** se quiser reiniciar animações ao trocar de cena.
3. Para overlays transparentes, deixe o campo CSS personalizado padrão (`body { background: rgba(0,0,0,0); }`).

| Overlay              | Tamanho     | URL                                              |
| -------------------- | ----------- | ------------------------------------------------ |
| Cena inicial         | 1920 × 1080 | `…/starting-scene/index.html`                    |
| HUD com câmera       | 1920 × 1080 | `…/overlay-gameplay/index.html?cam=1`            |
| HUD sem câmera       | 1920 × 1080 | `…/overlay-gameplay/index.html?cam=0`            |
| Alertas              | 1920 × 1080 | `…/alerts/index.html?twitch=1#access_token=…`    |
| Now Playing          | 560 × 160   | `…/now-playing/index.html#refresh_token=…`       |

No Streamlabs Desktop o caminho é **Sources → Browser Source**, mesma configuração.

---

## 8. Assets

- `assets/svg/mascote-corpo-inteiro.svg`, `mascote-busto.svg`, `mascote-cabeca.svg`, `palmeira.svg`
- `assets/svg/banner-1200x480.svg` (banner do canal) e `thumbnail-1280x720.svg` (template para VODs — edite os textos no arquivo)
- `assets/emotes/*.svg` (128 px sugeridos: exporte para PNG com fundo transparente ao enviar à Twitch em 28/56/112 px)
- Nos overlays, os desenhos são usados inline via `shared/sprites.js`: `<svg viewBox="100 34 200 200"><use href="#emote-hype"/></svg>`.

Todos os SVGs foram gerados a partir do design original por um script; para regenerar após editar o design, execute `python tools/gen-assets.py` (Python 3, sem dependências).
