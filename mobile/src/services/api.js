import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "https://educa.okulandisa.com/api/tenant";

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(async (config) => {
  const token     = await AsyncStorage.getItem("token");
  const tenantCode = await AsyncStorage.getItem("tenant");
  if (token)      config.headers.Authorization = `Bearer ${token}`;
  if (tenantCode) config.params = { ...config.params, tenant: tenantCode };
  return config;
});

api.interceptors.response.use(
  r => r,
  async (err) => {
    if (err.response?.status === 401) {
      await AsyncStorage.multiRemove(["token", "user", "tenant"]);
    }
    return Promise.reject(err);
  }
);

export default api;
