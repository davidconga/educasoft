import educajaLogo from "../assets/logos/educaja-logo.svg";

const BRANDS = {
  "v2.grupogolfinho.com": {
    name: "eGolfinho",
    logo: "/logo-egolfinho.png",
    title: "eGolfinho",
    favicon: "/logo-egolfinho.png",
  },
  "colegio.grupogolfinho.com": {
    name: "eGolfinho",
    logo: "/logo-egolfinho.png",
    title: "eGolfinho",
    favicon: "/logo-egolfinho.png",
  },
  "golfinho.educa.okulandisa.com": {
    name: "eGolfinho",
    logo: "/logo-egolfinho.png",
    title: "eGolfinho",
    favicon: "/logo-egolfinho.png",
  },
};

const DEFAULT = {
  name: "Educajá",
  logo: educajaLogo,
  title: "Educajá",
  favicon: educajaLogo,
};

export function getBranding() {
  return BRANDS[window.location.hostname] ?? DEFAULT;
}

export function useBranding() {
  return getBranding();
}
