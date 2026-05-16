import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";

const centralApi = axios.create({
  baseURL: "/api/v1",
  headers: { "Content-Type": "application/json", "Accept": "application/json" },
});

const STEPS = ["Plano", "Escola", "Administrador", "Confirmação", "Pagamento"];

function formatAOA(v) {
  return new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA", minimumFractionDigits: 0 }).format(Number(v || 0));
}

const CheckIcon = () => (
  <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export default function CadastroEscola() {
  const [searchParams] = useSearchParams();
  const planoQuery = searchParams.get("plano") || "";
  const [step, setStep] = useState(0);
  const [planos, setPlanos] = useState([]);
  const [loadingPlanos, setLoadingPlanos] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState("");
  const [resultado, setResultado] = useState(null);

  const [form, setForm] = useState({
    plano: "",
    nome: "",
    email: "",
    telefone: "",
    endereco: "",
    codigo: "",
    admin_nome: "",
    admin_email: "",
    admin_password: "",
    admin_password_confirmation: "",
    aceito_termos: false,
    termos_versao: "",
  });
  const [termosAtual, setTermosAtual] = useState(null);

  useEffect(() => {
    centralApi.get("/planos").then(r => {
      setPlanos(r.data);
      if (planoQuery && r.data.some(p => p.id === planoQuery)) {
        setForm(f => ({ ...f, plano: planoQuery }));
      }
      setLoadingPlanos(false);
    }).catch(() => setLoadingPlanos(false));

    centralApi.get("/termos/atual").then(r => {
      setTermosAtual(r.data);
      setForm(f => ({ ...f, termos_versao: r.data.versao }));
    }).catch(() => {});
  }, [planoQuery]);

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: null }));
  };

  const planoSelecionado = planos.find(p => p.id === form.plano);

  const validateStep1 = () => {
    if (!form.plano) { setErrors({ plano: "Seleccione um plano." }); return false; }
    return true;
  };

  const validateStep2 = () => {
    const e = {};
    if (!form.nome.trim())     e.nome = "Campo obrigatório.";
    if (!form.email.trim())    e.email = "Campo obrigatório.";
    if (!form.codigo.trim())   e.codigo = "Campo obrigatório.";
    else if (!/^[a-z0-9-]+$/.test(form.codigo)) e.codigo = "Apenas letras minúsculas, números e hífens.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep3 = () => {
    const e = {};
    if (!form.admin_nome.trim())    e.admin_nome = "Campo obrigatório.";
    if (!form.admin_email.trim())   e.admin_email = "Campo obrigatório.";
    if (!form.admin_password)       e.admin_password = "Campo obrigatório.";
    else if (form.admin_password.length < 8) e.admin_password = "Mínimo 8 caracteres.";
    if (form.admin_password !== form.admin_password_confirmation) e.admin_password_confirmation = "As passwords não coincidem.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = () => {
    setGlobalError("");
    if (step === 0 && !validateStep1()) return;
    if (step === 1 && !validateStep2()) return;
    if (step === 2 && !validateStep3()) return;
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setGlobalError("");
    try {
      const { data } = await centralApi.post("/register", form);
      setResultado(data);
      setStep(4);
    } catch (err) {
      const errs = err.response?.data?.errors;
      if (errs) {
        setErrors(errs);
        // go back to the right step
        const schoolFields = ["nome", "email", "telefone", "endereco", "codigo"];
        const adminFields  = ["admin_nome", "admin_email", "admin_password", "admin_password_confirmation"];
        const keys = Object.keys(errs);
        if (keys.some(k => schoolFields.includes(k)))      setStep(1);
        else if (keys.some(k => adminFields.includes(k)))  setStep(2);
      } else {
        setGlobalError(err.response?.data?.message || "Ocorreu um erro. Tente novamente.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const autoCode = (nome) => {
    const slug = nome.toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 25);
    set("codigo", slug);
  };

  if (step === 4 && resultado) {
    return <PagamentoPanel resultado={resultado} planoSelecionado={planoSelecionado} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 flex items-start justify-center p-4 py-10">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 text-white text-3xl">🎓</div>
          <h1 className="text-3xl font-bold text-white">Educajá</h1>
          <p className="text-blue-200 text-sm mt-1">Registe a sua escola gratuitamente</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center mb-8 gap-0">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors
                  ${i < step ? "bg-green-400 text-white" : i === step ? "bg-white text-blue-800" : "bg-white/20 text-white/50"}`}>
                  {i < step ? "✓" : i + 1}
                </div>
                <span className={`text-xs mt-1 font-medium ${i === step ? "text-white" : "text-white/50"}`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-16 h-0.5 mb-4 mx-1 ${i < step ? "bg-green-400" : "bg-white/20"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl w-full">
          {globalError && (
            <div className="mx-6 mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{globalError}</div>
          )}

          {/* Step 0 — Escolher plano */}
          {step === 0 && (
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-1">Escolha o seu plano</h2>
              <p className="text-gray-500 text-sm mb-6">Seleccione o plano que melhor se adequa à sua escola.</p>
              {loadingPlanos ? (
                <p className="text-center text-gray-400 py-12">A carregar planos...</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {planos.map(plano => (
                    <button
                      key={plano.id}
                      type="button"
                      onClick={() => set("plano", plano.id)}
                      className={`relative text-left rounded-2xl border-2 p-5 transition-all cursor-pointer
                        ${form.plano === plano.id
                          ? "border-blue-600 bg-blue-50 shadow-md"
                          : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                        }
                        ${plano.destaque ? "ring-2 ring-blue-400 ring-offset-1" : ""}`}
                    >
                      {plano.destaque && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                          Mais popular
                        </span>
                      )}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-gray-800 text-lg">{plano.nome}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">{plano.descricao}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 ml-2
                          ${form.plano === plano.id ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}>
                          {form.plano === plano.id && (
                            <svg className="w-full h-full text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="mb-4">
                        {plano.preco === 0 ? (
                          <span className="text-2xl font-extrabold text-gray-800">Grátis</span>
                        ) : (
                          <span className="text-2xl font-extrabold text-gray-800">
                            {plano.preco.toLocaleString("pt-PT")} Kz
                            <span className="text-sm font-normal text-gray-500">/{plano.periodo}</span>
                          </span>
                        )}
                      </div>
                      <ul className="space-y-1.5">
                        {plano.features.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                            <CheckIcon /> {f}
                          </li>
                        ))}
                      </ul>
                    </button>
                  ))}
                </div>
              )}
              {errors.plano && <p className="text-red-600 text-sm mt-3">{errors.plano}</p>}
              <div className="flex justify-end mt-6">
                <button onClick={nextStep} className="bg-blue-800 text-white px-8 py-2.5 rounded-xl hover:bg-blue-700 font-semibold">
                  Continuar →
                </button>
              </div>
            </div>
          )}

          {/* Step 1 — Dados da escola */}
          {step === 1 && (
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-1">Dados da Escola</h2>
              <p className="text-gray-500 text-sm mb-6">Preencha as informações da sua instituição de ensino.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Escola *</label>
                  <input
                    value={form.nome}
                    onChange={e => { set("nome", e.target.value); if (!form.codigo) autoCode(e.target.value); }}
                    placeholder="Ex: Colégio São Pedro"
                    className={`w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.nome ? "border-red-400" : "border-gray-300"}`}
                  />
                  {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email da Escola *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => set("email", e.target.value)}
                    placeholder="geral@escola.ao"
                    className={`w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? "border-red-400" : "border-gray-300"}`}
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input
                    value={form.telefone}
                    onChange={e => set("telefone", e.target.value)}
                    placeholder="Ex: +244 923 000 000"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                  <input
                    value={form.endereco}
                    onChange={e => set("endereco", e.target.value)}
                    placeholder="Ex: Rua Principal, Benguela"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código da Escola *</label>
                  <div className="flex items-center">
                    <span className="bg-gray-100 border border-r-0 border-gray-300 rounded-l-xl px-3 py-2.5 text-sm text-gray-500 whitespace-nowrap">
                      educaja.ao/
                    </span>
                    <input
                      value={form.codigo}
                      onChange={e => set("codigo", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      placeholder="codigo-escola"
                      className={`flex-1 border rounded-r-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.codigo ? "border-red-400" : "border-gray-300"}`}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Apenas letras minúsculas, números e hífens. Não pode ser alterado depois.</p>
                  {errors.codigo && <p className="text-red-500 text-xs mt-1">{errors.codigo}</p>}
                </div>
              </div>
              <div className="flex justify-between mt-6">
                <button onClick={() => setStep(0)} className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-xl hover:bg-gray-50 font-medium">
                  ← Voltar
                </button>
                <button onClick={nextStep} className="bg-blue-800 text-white px-8 py-2.5 rounded-xl hover:bg-blue-700 font-semibold">
                  Continuar →
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — Dados do administrador */}
          {step === 2 && (
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-1">Conta do Administrador</h2>
              <p className="text-gray-500 text-sm mb-6">Estas credenciais serão usadas para aceder ao sistema da sua escola.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
                  <input
                    value={form.admin_nome}
                    onChange={e => set("admin_nome", e.target.value)}
                    placeholder="Ex: João Silva"
                    className={`w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.admin_nome ? "border-red-400" : "border-gray-300"}`}
                  />
                  {errors.admin_nome && <p className="text-red-500 text-xs mt-1">{errors.admin_nome}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email do Administrador *</label>
                  <input
                    type="email"
                    value={form.admin_email}
                    onChange={e => set("admin_email", e.target.value)}
                    placeholder="admin@escola.ao"
                    className={`w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.admin_email ? "border-red-400" : "border-gray-300"}`}
                  />
                  {errors.admin_email && <p className="text-red-500 text-xs mt-1">{errors.admin_email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <input
                    type="password"
                    value={form.admin_password}
                    onChange={e => set("admin_password", e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className={`w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.admin_password ? "border-red-400" : "border-gray-300"}`}
                  />
                  {errors.admin_password && <p className="text-red-500 text-xs mt-1">{errors.admin_password}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Password *</label>
                  <input
                    type="password"
                    value={form.admin_password_confirmation}
                    onChange={e => set("admin_password_confirmation", e.target.value)}
                    placeholder="Repetir password"
                    className={`w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.admin_password_confirmation ? "border-red-400" : "border-gray-300"}`}
                  />
                  {errors.admin_password_confirmation && <p className="text-red-500 text-xs mt-1">{errors.admin_password_confirmation}</p>}
                </div>
              </div>
              <div className="flex justify-between mt-6">
                <button onClick={() => setStep(1)} className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-xl hover:bg-gray-50 font-medium">
                  ← Voltar
                </button>
                <button onClick={nextStep} className="bg-blue-800 text-white px-8 py-2.5 rounded-xl hover:bg-blue-700 font-semibold">
                  Rever Pedido →
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Revisão e confirmação */}
          {step === 3 && (
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-1">Confirmar Cadastro</h2>
              <p className="text-gray-500 text-sm mb-6">Reveja os dados antes de submeter o pedido.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-700 text-sm mb-3 uppercase tracking-wide">Plano Escolhido</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-lg">📋</div>
                    <div>
                      <p className="font-bold text-gray-800">{planoSelecionado?.nome}</p>
                      <p className="text-sm text-gray-500">
                        {planoSelecionado?.preco === 0 ? "Grátis" : `${planoSelecionado?.preco?.toLocaleString("pt-PT")} Kz/mês`}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-700 text-sm mb-3 uppercase tracking-wide">Escola</h3>
                  <p className="font-medium text-gray-800">{form.nome}</p>
                  <p className="text-sm text-gray-500">{form.email}</p>
                  {form.telefone && <p className="text-sm text-gray-500">{form.telefone}</p>}
                  <p className="text-xs text-blue-600 mt-1 font-mono">{form.codigo}.educaja.ao</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 md:col-span-2">
                  <h3 className="font-semibold text-gray-700 text-sm mb-3 uppercase tracking-wide">Administrador</h3>
                  <p className="font-medium text-gray-800">{form.admin_nome}</p>
                  <p className="text-sm text-gray-500">{form.admin_email}</p>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700 mb-4">
                Ao submeter, o seu pedido será analisado pela equipa Educajá. Receberá uma notificação quando a conta for activada.
              </div>

              <label className={`flex items-start gap-3 p-4 border rounded-xl mb-6 cursor-pointer transition-colors
                ${errors.aceito_termos ? "border-red-300 bg-red-50" : form.aceito_termos ? "border-blue-300 bg-blue-50" : "border-gray-300 bg-white hover:bg-gray-50"}`}>
                <input
                  type="checkbox"
                  checked={form.aceito_termos}
                  onChange={(e) => set("aceito_termos", e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-blue-600"
                />
                <span className="text-sm text-gray-700 leading-relaxed">
                  Li e aceito os{" "}
                  <Link to="/termos" target="_blank" className="text-blue-700 font-semibold hover:underline">
                    Termos e Condições
                  </Link>
                  {termosAtual && (
                    <span className="text-xs text-gray-500"> (versão {termosAtual.versao})</span>
                  )}
                  . Confirmo que tenho autoridade para vincular a escola a este contrato.
                </span>
              </label>
              {errors.aceito_termos && (
                <p className="text-red-500 text-xs -mt-4 mb-4">{Array.isArray(errors.aceito_termos) ? errors.aceito_termos[0] : errors.aceito_termos}</p>
              )}

              <div className="flex justify-between">
                <button onClick={() => setStep(2)} className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-xl hover:bg-gray-50 font-medium">
                  ← Voltar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !form.aceito_termos}
                  className="bg-green-600 text-white px-8 py-2.5 rounded-xl hover:bg-green-500 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? "A submeter..." : "Submeter Pedido ✓"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer link */}
        <p className="text-center text-sm text-blue-200 mt-6">
          Já tem uma conta?{" "}
          <Link to="/login" className="text-white font-semibold hover:underline">
            Entrar →
          </Link>
        </p>
      </div>
    </div>
  );
}

function PagamentoPanel({ resultado, planoSelecionado }) {
  const [estado, setEstado] = useState({
    factura: resultado.factura,
    referencia: resultado.referencia,
    ativo: false,
    paga: false,
  });
  const [copiou, setCopiou] = useState(null);

  const semPagamento = !resultado.factura;
  const tempoTrial = resultado.tem_trial;

  // Polling do estado a cada 8s para detectar pagamento
  useEffect(() => {
    if (semPagamento) return;
    let cancelado = false;
    const intervalo = setInterval(async () => {
      try {
        const { data } = await centralApi.get(`/cadastros/${resultado.codigo}/estado`);
        if (cancelado) return;
        setEstado((prev) => ({
          ...prev,
          factura: data.factura ?? prev.factura,
          referencia: data.referencia ?? prev.referencia,
          ativo: !!data.ativo,
          paga: data.factura?.estado === "paga",
        }));
      } catch {/* silencioso */}
    }, 8000);
    return () => { cancelado = true; clearInterval(intervalo); };
  }, [resultado.codigo, semPagamento]);

  function copiar(valor, tipo) {
    navigator.clipboard?.writeText(String(valor));
    setCopiou(tipo);
    setTimeout(() => setCopiou(null), 1500);
  }

  // Caso 1 — plano grátis ou em trial → ecrã simples
  if (semPagamento) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Cadastro Recebido!</h2>
          <p className="text-gray-500 mb-4">{resultado.message}</p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left mb-6">
            <p className="text-sm text-blue-700 font-medium mb-1">Detalhes do seu registo:</p>
            <p className="text-sm text-blue-600"><span className="font-medium">Escola:</span> {resultado.nome}</p>
            <p className="text-sm text-blue-600"><span className="font-medium">Código:</span> {resultado.codigo}</p>
            <p className="text-sm text-blue-600"><span className="font-medium">Plano:</span> {planoSelecionado?.nome}</p>
            {tempoTrial && <p className="text-xs text-blue-700 mt-2 font-semibold">🎁 {planoSelecionado?.dias_trial} dias de teste grátis</p>}
          </div>
          <p className="text-xs text-gray-400 mb-6">Receberá uma notificação quando a sua conta for activada pela equipa Educajá.</p>
          <Link to="/login" className="block w-full bg-blue-800 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors">
            Ir para o Login →
          </Link>
        </div>
      </div>
    );
  }

  // Caso 2 — pago e activo
  if (estado.paga && estado.ativo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-700 via-green-600 to-emerald-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Conta activada!</h2>
          <p className="text-gray-500 mb-6">Recebemos o seu pagamento. A sua escola está pronta a usar.</p>
          <Link to="/login" className="block w-full bg-blue-800 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors">
            Entrar →
          </Link>
        </div>
      </div>
    );
  }

  // Caso 3 — pago mas ainda a aguardar activação manual
  if (estado.paga) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Pagamento confirmado!</h2>
          <p className="text-gray-500 mb-4">A sua factura {estado.factura?.numero} está paga. A equipa Educajá vai activar a sua conta em breve.</p>
          <Link to="/login" className="block w-full bg-blue-800 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors">
            Ir para o Login →
          </Link>
        </div>
      </div>
    );
  }

  // Caso 4 — aguardar pagamento (referência Multicaixa)
  const ref = estado.referencia;
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 flex items-start justify-center p-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 text-white text-3xl">💳</div>
          <h1 className="text-3xl font-bold text-white">Pague para activar a sua conta</h1>
          <p className="text-blue-200 text-sm mt-1">Use a referência Multicaixa abaixo para concluir o registo.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
          {/* Resumo */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[10px] uppercase text-blue-700 font-bold">Escola</p>
              <p className="font-semibold text-gray-800">{resultado.nome}</p>
              <p className="text-xs text-gray-500 font-mono">{resultado.codigo}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-blue-700 font-bold">Plano</p>
              <p className="font-semibold text-gray-800">{planoSelecionado?.nome}</p>
              <p className="text-xs text-gray-500">Factura {estado.factura?.numero}</p>
            </div>
          </div>

          {/* Referência */}
          <div className="border-2 border-dashed border-blue-300 rounded-2xl p-5 bg-gradient-to-br from-blue-50 to-white mb-5">
            <p className="text-[10px] uppercase font-bold text-blue-700 tracking-widest mb-3 text-center">Referência Multicaixa Express</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                ["Entidade", ref?.entidade, "entidade"],
                ["Referência", ref?.referencia, "referencia"],
                ["Valor", ref ? formatAOA(ref.valor) : "—", "valor"],
              ].map(([label, valor, key]) => (
                <button key={key} onClick={() => valor && copiar(valor, key)}
                  className="text-left rounded-lg border border-blue-200 bg-white px-3 py-2.5 hover:bg-blue-50 transition-colors group">
                  <p className="text-[10px] uppercase text-blue-600 font-bold">{label}</p>
                  <p className="font-mono font-extrabold text-base text-gray-800 break-all">{valor ?? "—"}</p>
                  <p className="text-[10px] text-blue-500 mt-0.5 invisible group-hover:visible">
                    {copiou === key ? "✓ Copiado" : "Clica para copiar"}
                  </p>
                </button>
              ))}
            </div>
            {ref?.expira_em && (
              <p className="text-[11px] text-center text-gray-500 mt-3">
                Válida até {new Date(ref.expira_em).toLocaleDateString("pt-AO", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            )}
          </div>

          {/* Como pagar */}
          <details className="border border-gray-200 rounded-xl p-4 mb-5 bg-gray-50">
            <summary className="font-semibold text-gray-700 text-sm cursor-pointer">Como pagar?</summary>
            <ol className="text-xs text-gray-600 mt-3 space-y-1.5 list-decimal list-inside">
              <li>Abra a sua app de banco ou Multicaixa Express.</li>
              <li>Escolha "Pagamento por referência" ou "Pagamento de serviços".</li>
              <li>Insira a entidade, referência e valor acima.</li>
              <li>Confirme. Pode também pagar em qualquer ATM Multicaixa.</li>
            </ol>
          </details>

          {/* Estado actual */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <p className="text-xs text-yellow-800">
              A aguardar confirmação do pagamento. Esta página actualiza automaticamente quando recebermos o pagamento.
            </p>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Pode fechar esta página — o seu cadastro fica guardado. Quando pagar, recebemos a notificação automaticamente
            e activamos a sua conta.
          </p>

          <div className="flex justify-center gap-3 mt-5">
            <Link to="/login" className="text-sm text-blue-700 font-semibold hover:underline">
              Já tenho conta — entrar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
