import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { registerSW } from "virtual:pwa-register";
import { installAutoFlush } from "./offline/queue";
import { installTelemetry } from "./offline/telemetry";
import { installSnapshotRefresh } from "./offline/alunos";

// Activa o service worker (precache + runtime caching). Em dev é no-op.
registerSW({ immediate: true });

// Tenta re-enviar operações offline quando voltar a internet (e periodicamente).
installAutoFlush();
// Acompanha métricas da outbox para enviar ao servidor quando ciclo offline fecha.
installTelemetry();
// Refresca snapshots de alunos/dívidas ao voltar online (throttled a 60s).
installSnapshotRefresh();

createRoot(document.getElementById("root")).render(<StrictMode><App /></StrictMode>);
