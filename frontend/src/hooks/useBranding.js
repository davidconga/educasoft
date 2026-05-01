const BRANDS = {
  "v2.grupogolfinho.com": {
    name: "Egolfinho",
    logo: "/logo-egolfinho.png",
  },
};

const DEFAULT = {
  name: "Educajá",
  logo: null,
};

export function useBranding() {
  return BRANDS[window.location.hostname] ?? DEFAULT;
}
