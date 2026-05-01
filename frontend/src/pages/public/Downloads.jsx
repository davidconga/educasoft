import { Smartphone, Monitor, Apple, Download, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { useBranding } from "../../hooks/useBranding";

const APPS = [
  {
    id: "android",
    icon: Smartphone,
    title: "Android",
    subtitle: "APK — Android 7.0+",
    desc: "Instale directamente no seu dispositivo Android. Pode ser necessário activar \"Fontes desconhecidas\" nas definições.",
    href: "/downloads/educa-android.apk",
    filename: "educa-android.apk",
    available: true,
    color: "from-emerald-500 to-green-600",
    badge: "APK",
  },
  {
    id: "windows",
    icon: Monitor,
    title: "Windows",
    subtitle: "Aplicação desktop — Windows 10/11",
    desc: "Versão portátil para Windows. Extraia o ficheiro e execute Educa.exe — não requer instalação.",
    href: "/downloads/educa-windows.zip",
    filename: "educa-windows.zip",
    available: false,
    color: "from-blue-500 to-blue-700",
    badge: "Em breve",
  },
  {
    id: "ios",
    icon: Apple,
    title: "iOS",
    subtitle: "iPhone & iPad — iOS 14+",
    desc: "A versão para iOS está em desenvolvimento. Entretanto pode aceder via Safari em educa.okulandisa.com.",
    href: null,
    available: false,
    color: "from-slate-500 to-slate-700",
    badge: "Em breve",
  },
];

export default function Downloads() {
  const branding = useBranding();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-800 to-blue-600 px-8 pt-8 pb-6 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 overflow-hidden">
            {branding.logo
              ? <img src={branding.logo} alt={branding.name} className="w-full h-full object-contain" />
              : <GraduationCap size={32} className="text-white" />
            }
          </div>
          <h1 className="text-2xl font-bold text-white">{branding.name}</h1>
          <p className="text-blue-200 text-sm mt-1">Descarregar a Aplicação</p>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-500 text-center">
            Escolha a versão para o seu dispositivo
          </p>

          {APPS.map(app => {
            const Icon = app.icon;
            return (
              <div key={app.id} className={`border rounded-2xl overflow-hidden ${app.available ? "border-slate-200" : "border-slate-100 opacity-70"}`}>
                <div className="flex items-center gap-4 p-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${app.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={22} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-800 text-sm">{app.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        app.available
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        {app.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{app.subtitle}</p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{app.desc}</p>
                  </div>
                  {app.available && app.href && (
                    <a
                      href={app.href}
                      download={app.filename}
                      className="flex-shrink-0 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
                    >
                      <Download size={13} />
                      Baixar
                    </a>
                  )}
                </div>
              </div>
            );
          })}

          <div className="pt-2 text-center">
            <Link to="/login" className="text-blue-600 hover:underline text-sm font-medium">
              ← Voltar ao Login
            </Link>
          </div>

          <p className="text-center text-xs text-slate-400">
            {branding.name} © {new Date().getFullYear()} — Gestão Escolar
          </p>
        </div>
      </div>
    </div>
  );
}
