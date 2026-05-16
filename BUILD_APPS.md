# Build das Apps Nativas — Educajá

O frontend é uma **PWA** (Progressive Web App) com service worker próprio, o que torna
a aplicação **utilizável offline** depois da primeira visita online. Todos os
empacotamentos (Electron, Capacitor) reutilizam essa mesma camada.

## Camada offline-first

- **Cache do shell + assets**: precache via Workbox (gerado a partir do build do Vite).
- **Cache de leituras (`GET /api/...`)**: `NetworkFirst` com fallback à última resposta cacheada.
- **Fila de escritas offline**: as escritas críticas (POS, pagamentos, etc) podem ser
  enviadas via `sendOrEnqueue()` (em [`frontend/src/offline/sendOrEnqueue.js`](frontend/src/offline/sendOrEnqueue.js))
  que, em caso de falha de rede, persiste o pedido em IndexedDB e re-tenta quando
  voltar a internet.
- **Banner de estado**: `<OfflineBanner />` no `Layout` mostra o estado da rede e
  permite ao utilizador rever/retentar operações pendentes ou falhadas.

> Nota: por enquanto a fila offline é **opt-in por fluxo**. Para activar num
> ecrã, substitua a chamada `api.post(...)` por `sendOrEnqueue({ method, url, data })`
> e adapte o UX (recibo provisório, etc).

---

## Windows / Linux desktop (Electron)

**Requisitos:** Node 20+, npm 10+, ImageMagick (para regerar ícones).
Para build cruzada em Linux para Windows é preciso Wine.

```bash
# 1) Build do frontend (gera dist/ com service worker)
cd frontend
npm install --legacy-peer-deps
npm run build

# 2) Build do instalador
cd ../electron
npm install
npm run build:win     # → dist/Educajá-Setup-1.1.0.exe + portable .exe
npm run build:linux   # → dist/Educajá-1.1.0.AppImage
```

O Electron carrega `https://educaja.ao` por defeito; quando o utilizador abre a app
pela primeira vez com internet, o service worker fica em cache. Em arranques
subsequentes, mesmo sem internet, a app abre normalmente (servida pelo SW). Se
faltar internet **e** cache, mostra `electron/offline.html`.

Partition Electron usada: `persist:educaja` — garante que SW + IndexedDB
sobrevivem entre arranques.

### Regerar ícones

```bash
cd frontend
convert -size 512x512 xc:'#1d4ed8' \
  \( src/assets/logos/educaja-logo.png -resize 400x \) -gravity center -composite \
  public/educaja-512.png
convert public/educaja-512.png -resize 192x192 public/educaja-192.png
cp public/educaja-512.png ../electron/icon.png
convert ../electron/icon.png -define icon:auto-resize=256,128,64,48,32,16 \
  ../electron/icon.ico
```

---

## Android (APK)

**Requisitos:** Java 17+, Android Studio, Node 20+

```bash
cd frontend
npm install --legacy-peer-deps @capacitor/android
npm run mobile:android   # build + add android + sync
```

Depois, no Android Studio:
1. Abrir `frontend/android/`
2. **Build → Generate Signed Bundle / APK**
3. Escolher APK, assinar com keystore

---

## iOS (IPA)

**Requisitos:** Mac com Xcode 15+, CocoaPods

```bash
cd frontend
npm install --legacy-peer-deps @capacitor/ios
npm run mobile:ios   # build + add ios + sync
```

Depois, no Xcode:
1. Abrir `frontend/ios/App/App.xcworkspace`
2. Selecionar target do dispositivo
3. **Product → Archive** → Distribute App

---

## Backend offline-first

A camada offline do frontend é complementada por suporte explícito no backend:

- **Idempotência por `Idempotency-Key`** — middleware
  [`Idempotency`](backend/app/Http/Middleware/Idempotency.php) registado como
  alias `idempotency` e aplicado em `POST /pos/cobrar`, `POST /pagamentos`,
  `POST /pagamentos/carteira/{aluno}/depositar` e
  `POST /pagamentos/carteira/{aluno}/levantar`. O frontend (outbox) envia uma
  chave estável por entrada; re-tentativas após resposta perdida devolvem a
  resposta original em vez de duplicar a operação. Chaves expiram em 7 dias.
  Tabela tenant: `idempotency_keys` (migração
  `2026_05_16_000002_create_idempotency_keys_table`).
- **Dedupe defensivo por `lote_offline_ref`** — em `PosController::cobrar`, se
  o `lote_offline_ref` enviado já existe num lote anterior, devolvemos esse
  lote com `deduped: true` em vez de criar um duplicado. Funciona como segunda
  rede de segurança caso a chave de idempotência já tenha expirado ou o
  cliente perca o estado da outbox.
- **`GET /offline/manifest`** — devolve `caixa_sessao` actual, marcadores de
  versão (counts e `max(updated_at)` de alunos/preçário/configuração) e a
  lista de URLs a pré-carregar no warm-up. O cliente consome no login via
  `warmupCache()`.
- **`POST /offline/telemetry`** — recebe `queued / synced / failed /
  ms_until_first_sync / ms_total` por ciclo offline→online; o frontend envia
  automaticamente via `installTelemetry()` quando a outbox volta a esvaziar.
  Para já só vai para os logs; se vier a justificar análise estruturada,
  fazemos uma tabela depois.

> Deploy: correr `php artisan tenants:migrate` para criar
> `idempotency_keys` em cada tenant.

## Próximos passos (roadmap offline-first)

1. UI de resolução de conflitos para entradas em `status=failed` (corrigir
   payload antes de re-enviar).
2. Job recorrente para limpar `idempotency_keys` expiradas (cron `db:prune`
   ou comando dedicado em todos os tenants).
3. Estender idempotência a mais endpoints à medida que mais fluxos forem
   suportados offline (lembretes manuais, comprovativos, etc).
