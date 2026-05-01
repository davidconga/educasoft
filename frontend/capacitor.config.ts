import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.educaja.app",
  appName: "Educajá",
  webDir: "dist",
  server: {
    url: "https://educa.okulandisa.com",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#1d4ed8",
  },
  ios: {
    backgroundColor: "#1d4ed8",
    contentInset: "automatic",
  },
};

export default config;
