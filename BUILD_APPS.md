# Build das Apps Nativas

Todas as apps carregam `https://educa.okulandisa.com` num WebView nativo.

---

## Android (APK)

**Requisitos:** Java 17+, Android Studio, Node 20+

```bash
# Na pasta frontend/
npm install @capacitor/android
npm run mobile:android   # faz build + add android + sync
```

Depois, no Android Studio:
1. Abrir a pasta `frontend/android/`
2. **Build → Generate Signed Bundle / APK**
3. Escolher APK, assinar com keystore

---

## iOS (IPA)

**Requisitos:** Mac com Xcode 15+, CocoaPods

```bash
# Na pasta frontend/ (num Mac)
npm install @capacitor/ios
npm run mobile:ios   # faz build + add ios + sync
```

Depois, no Xcode:
1. Abrir `frontend/ios/App/App.xcworkspace`
2. Selecionar target do dispositivo
3. **Product → Archive** → Distribute App

---

## Windows (EXE installer)

**Requisitos:** Node 20+, Wine (se a build for feita em Linux/Mac)

```bash
# Na pasta electron/
npm install
npm run build:win    # gera .exe em electron/dist/
```

O instalador fica em `electron/dist/Educa Setup 1.0.0.exe`.

---

## Notas

- O ícone da app está em `electron/icon.png` — substitua por um PNG 512×512 para melhor qualidade.
- Para Android/iOS, coloque ícones em `frontend/resources/icon.png` (1024×1024) e execute `npx @capacitor/assets generate`.
- A app requer ligação à internet para funcionar (carrega o servidor live).
