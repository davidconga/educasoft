import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { registerSW } from "virtual:pwa-register";
import { installAutoFlush } from "./offline/queue";

// Activa o service worker (precache + runtime caching). Em dev é no-op.
registerSW({ immediate: true });

// Tenta re-enviar operações offline quando voltar a internet (e periodicamente).
installAutoFlush();

createRoot(document.getElementById("root")).render(<StrictMode><App /></StrictMode>);
