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

## Próximos passos (roadmap offline-first)

1. Migrar o **POS / `POST /pos/cobrar`** para `sendOrEnqueue()` com recibo
   provisório (número sequencial local prefixado com `OFF-`) e re-emissão
   quando sincronizar.
2. Cache pró-activo de **alunos, preçário, sessão de caixa** (já vão pelo
   `NetworkFirst`, mas falta um *pre-fetch* explícito ao login).
3. Mecanismo de resolução de conflitos para entradas em `status=failed` (UI
   para corrigir/substituir antes de re-enviar).
4. Métricas: enviar para o backend a quantidade de operações queued + tempo até
   sync (telemetria útil para escolas com internet intermitente).
