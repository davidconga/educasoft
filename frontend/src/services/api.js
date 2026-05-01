import axios from "axios";

const api = axios.create({
  baseURL: "/api/tenant",
  headers: { "Content-Type": "application/json", "Accept": "application/json" },
});

const centralApi = axios.create({
  baseURL: "/api/v1",
  headers: { "Content-Type": "application/json", "Accept": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  const tenantId = localStorage.getItem("tenant_id");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (tenantId) config.params = { ...config.params, tenant: tenantId };
  // Para uploads multipart, deixar axios detectar e setar o boundary correcto
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

centralApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("central_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export { centralApi };
export default api;
