import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import axios from "axios";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";
  const escolaCodigo = searchParams.get("escola") || "";

  const [form, setForm] = useState({ password: "", password_confirmation: "" });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token || !email || !escolaCodigo) {
      setStatus({ type: "error", message: "Link de recuperação inválido ou incompleto." });
    }
  }, [token, email, escolaCodigo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.password_confirmation) {
      setStatus({ type: "error", message: "As senhas não coincidem." });
      return;
    }
    setStatus(null);
    setLoading(true);
    try {
      const { data } = await axios.post("/api/v1/reset-password", {
        email,
        token,
        escola_codigo: escolaCodigo,
        password: form.password,
        password_confirmation: form.password_confirmation,
      });
      setSuccess(true);
      setStatus({ type: "success", message: data.message });
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setStatus({
        type: "error",
        message: err.response?.data?.message || "Erro ao redefinir a senha.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-700 text-3xl">
            {success ? "✅" : "🔑"}
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            {success ? "Senha Redefinida!" : "Nova Senha"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {success ? "A ser redireccionado para o login..." : `Escola: ${escolaCodigo}`}
          </p>
        </div>

        {status && (
          <div className={`px-4 py-3 rounded-lg mb-5 text-sm ${
            status.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}>
            {status.message}
          </div>
        )}

        {!success && token && email && escolaCodigo && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
              <input
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha</label>
              <input
                type="password"
                required
                value={form.password_confirmation}
                onChange={e => setForm({ ...form, password_confirmation: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Repita a nova senha"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-800 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60 mt-2"
            >
              {loading ? "A guardar..." : "Redefinir Senha"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link to="/login" className="text-blue-700 font-semibold hover:underline">← Voltar ao Login</Link>
        </p>
      </div>
    </div>
  );
}
