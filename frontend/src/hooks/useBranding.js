const BRANDS = {
  "v2.grupogolfinho.com": {
    name: "Egolfinho",
    logo: "/logo-egolfinho.png",
  },
};

const DEFAULT = {
  name: "EduSoft",
  logo: null,
};

export function useBranding() {
  return BRANDS[window.location.hostname] ?? DEFAULT;
}
