const { app, BrowserWindow, Menu, shell, dialog } = require("electron");
const path = require("path");

// Primary domain — apontamos para educaja.ao (educa.okulandisa.com mantém-se como fallback histórico).
const PRIMARY_URL  = "https://educaja.ao";
const FALLBACK_URL = "https://educa.okulandisa.com";

// O service worker do PWA fica cacheado no perfil de utilizador do Electron,
// pelo que após a primeira visita online a app arranca offline sem alterações.

const isDev = process.env.NODE_ENV === "development";
let mainWindow = null;
let startUrl = PRIMARY_URL;

function loadAppShell(win) {
  // Tenta primeiro o domínio principal; se falhar logo na primeira tentativa,
  // muda para o fallback. Quando já há cache, o SW serve mesmo offline.
  win.loadURL(startUrl).catch(() => {
    if (startUrl !== FALLBACK_URL) {
      startUrl = FALLBACK_URL;
      win.loadURL(startUrl);
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    icon: path.join(__dirname, "icon.png"),
    title: "Educajá — Gestão Escolar",
    backgroundColor: "#1e3a8a",
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      // Persistir partição → garante que o service worker e o IndexedDB
      // (fila offline) sobrevivem entre arranques.
      partition: "persist:educaja",
    },
    autoHideMenuBar: true,
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());

  loadAppShell(mainWindow);

  // Abrir links externos no browser do sistema (não na app).
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const internal = url.startsWith(PRIMARY_URL) || url.startsWith(FALLBACK_URL);
    if (!internal) shell.openExternal(url);
    return { action: "deny" };
  });

  // Quando a 1ª carga falha por completo (sem internet E sem cache do SW),
  // mostramos a página local de fallback com botão para tentar de novo.
  mainWindow.webContents.on("did-fail-load", (_e, errorCode, errorDesc, validatedURL, isMainFrame) => {
    if (!isMainFrame) return;
    // Ignorar erros de redirect/abort que não são realmente "falhou".
    if (errorCode === -3) return;
    mainWindow.loadFile(path.join(__dirname, "offline.html"));
  });

  if (isDev) mainWindow.webContents.openDevTools({ mode: "detach" });
}

Menu.setApplicationMenu(null);

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Atalho global F5 → recarregar (útil para sair da página offline.html).
app.on("browser-window-focus", () => {
  // no-op por agora; deixamos espaço para registar atalhos.
});

// Garante que só corre uma instância da app desktop.
const gotSingleInstance = app.requestSingleInstanceLock();
if (!gotSingleInstance) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
