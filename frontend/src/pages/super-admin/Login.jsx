import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useCentralAuth } from "../../store/centralAuth";

export default function SuperAdminLogin() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth } = useCentralAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await axios.post("/api/v1/auth/login", form);
      setAuth(data.token, data.user);
      navigate("/super-admin");
    } catch (err) {
      setError(err.response?.data?.message || "Credenciais inválidas.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white text-3xl">⚙️</div>
          <h1 className="text-2xl font-bold text-gray-800">Painel Super-Admin</h1>
          <p className="text-gray-500 text-sm mt-1">Educajá — Gestão de Escolas</p>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-500"
              placeholder="admin@edusoft.ao"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-500"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60 mt-2"
          >
            {loading ? "A entrar..." : "Entrar →"}
          </button>
        </form>
        <p className="text-center mt-6">
          <Link to="/login" className="text-sm text-gray-400 hover:text-gray-600">← Voltar ao login de escola</Link>
        </p>
      </div>
    </div>
  );
}
