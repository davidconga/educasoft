import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/auth";
import { useCentralAuth } from "./store/centralAuth";
import Layout from "./components/layout/Layout";
import Login from "./pages/auth/Login";
import CadastroEscola from "./pages/auth/CadastroEscola";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import SuperAdminLogin from "./pages/super-admin/Login";
import SuperAdminLayout from "./pages/super-admin/Layout";
import SuperAdminDashboard from "./pages/super-admin/Dashboard";
import SuperAdminEscolas from "./pages/super-admin/Escolas";
import Dashboard from "./pages/admin/Dashboard";
import Alunos from "./pages/admin/Alunos";
import Professores from "./pages/admin/Professores";
import ProfessorDetalhe from "./pages/admin/ProfessorDetalhe";
import Turmas from "./pages/admin/Turmas";
import TurmaDetalhe from "./pages/admin/TurmaDetalhe";
import Notas from "./pages/admin/Notas";
import Horarios from "./pages/admin/Horarios";
import Pagamentos from "./pages/admin/Pagamentos";
import AulasRemotas from "./pages/admin/AulasRemotas";
import Tesouraria from "./pages/admin/Tesouraria";
import Precario from "./pages/admin/Precario";
import Cursos from "./pages/admin/Cursos";
import GestaoEscolar from "./pages/admin/GestaoEscolar";
import Disciplinas from "./pages/admin/Disciplinas";
import AlunoDetalhe from "./pages/admin/AlunoDetalhe";
import Matriculas from "./pages/admin/Matriculas";
import PautaImpressao from "./pages/admin/PautaImpressao";
import Presencas from "./pages/admin/Presencas";
import PresencasProfessores from "./pages/admin/PresencasProfessores";
import ControloPropinas from "./pages/admin/ControloPropinas";
import ProfessorPresencas from "./pages/professor/ProfessorPresencas";
import ConfiguracaoEscola from "./pages/admin/ConfiguracaoEscola";
import GestaoUtilizadores from "./pages/admin/GestaoUtilizadores";
import GestaoPermissoes from "./pages/admin/GestaoPermissoes";
import CartaoEstudante from "./pages/admin/CartaoEstudante";
import ControloEmolumentos from "./pages/admin/ControloEmolumentos";
import PerfilAluno from "./pages/public/PerfilAluno";
import VerificarProva from "./pages/public/VerificarProva";
import CarteiraAluno from "./pages/admin/CarteiraAluno";
import RelatorioDiario from "./pages/admin/RelatorioDiario";
import FolhaProva from "./pages/admin/FolhaProva";
import PortalLayout from "./pages/portal/PortalLayout";
import PortalInicio from "./pages/portal/PortalInicio";
import PortalNotas from "./pages/portal/PortalNotas";
import PortalHorario from "./pages/portal/PortalHorario";
import PortalFinancas from "./pages/portal/PortalFinancas";
import PortalConta from "./pages/portal/PortalConta";
import PortalAulas from "./pages/portal/PortalAulas";
import ProfessorLayout from "./pages/professor/ProfessorLayout";
import ProfessorInicio from "./pages/professor/ProfessorInicio";
import ProfessorTurmas from "./pages/professor/ProfessorTurmas";
import ProfessorNotas from "./pages/professor/ProfessorNotas";
import ProfessorHorario from "./pages/professor/ProfessorHorario";
import ProfessorAulas from "./pages/professor/ProfessorAulas";
import ProfessorConta from "./pages/professor/ProfessorConta";

function ProtectedRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (user?.tipo === "aluno")     return <Navigate to="/portal"    replace />;
  if (user?.tipo === "professor") return <Navigate to="/professor" replace />;
  return <>{children}</>;
}

function PortalRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (user?.tipo !== "aluno") return <Navigate to={user?.tipo === "professor" ? "/professor" : "/dashboard"} replace />;
  return <>{children}</>;
}

function ProfessorRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (user?.tipo !== "professor") return <Navigate to={user?.tipo === "aluno" ? "/portal" : "/dashboard"} replace />;
  return <>{children}</>;
}

function SuperAdminRoute({ children }) {
  const { isAuthenticated } = useCentralAuth();
  return isAuthenticated() ? <>{children}</> : <Navigate to="/super-admin/login" replace />;
}

function AppRoutes() {
  const { isAuthenticated, user } = useAuthStore();
  const centralAuth = useCentralAuth();

  const loginRedirect = isAuthenticated()
    ? (user?.tipo === "aluno" ? "/portal" : user?.tipo === "professor" ? "/professor" : "/dashboard")
    : null;

  return (
    <Routes>
      {/* Super-admin */}
      <Route path="/super-admin/login" element={centralAuth.isAuthenticated() ? <Navigate to="/super-admin" replace /> : <SuperAdminLogin />} />
      <Route path="/super-admin" element={<SuperAdminRoute><SuperAdminLayout /></SuperAdminRoute>}>
        <Route index element={<SuperAdminDashboard />} />
        <Route path="escolas" element={<SuperAdminEscolas />} />
      </Route>

      {/* Perfil público do aluno (via QR) */}
      <Route path="/p/:escola/:numero" element={<PerfilAluno />} />

      {/* Verificação pública de folha de prova */}
      <Route path="/verificar-prova/:codigo" element={<VerificarProva />} />

      {/* Tenant public */}
      <Route path="/login" element={loginRedirect ? <Navigate to={loginRedirect} replace /> : <Login />} />
      <Route path="/cadastro" element={loginRedirect ? <Navigate to={loginRedirect} replace /> : <CadastroEscola />} />
      <Route path="/recuperar-senha" element={<ForgotPassword />} />
      <Route path="/recuperar-senha/confirmar" element={<ResetPassword />} />
      <Route path="/" element={<Navigate to={loginRedirect ?? "/login"} replace />} />

      {/* Portal do Aluno */}
      <Route path="/portal" element={<PortalRoute><PortalLayout /></PortalRoute>}>
        <Route index element={<PortalInicio />} />
        <Route path="notas" element={<PortalNotas />} />
        <Route path="horario" element={<PortalHorario />} />
        <Route path="aulas" element={<PortalAulas />} />
        <Route path="financas" element={<PortalFinancas />} />
        <Route path="conta" element={<PortalConta />} />
      </Route>

      {/* Portal do Professor */}
      <Route path="/professor" element={<ProfessorRoute><ProfessorLayout /></ProfessorRoute>}>
        <Route index element={<ProfessorInicio />} />
        <Route path="turmas" element={<ProfessorTurmas />} />
        <Route path="notas" element={<ProfessorNotas />} />
        <Route path="horario" element={<ProfessorHorario />} />
        <Route path="aulas" element={<ProfessorAulas />} />
        <Route path="presencas" element={<ProfessorPresencas />} />
        <Route path="conta" element={<ProfessorConta />} />
      </Route>

      {/* Admin */}
      <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/alunos" element={<ProtectedRoute><Layout><Alunos /></Layout></ProtectedRoute>} />
      <Route path="/alunos/:id" element={<ProtectedRoute><Layout><AlunoDetalhe /></Layout></ProtectedRoute>} />
      <Route path="/matriculas" element={<ProtectedRoute><Layout><Matriculas /></Layout></ProtectedRoute>} />
      <Route path="/professores" element={<ProtectedRoute><Layout><Professores /></Layout></ProtectedRoute>} />
      <Route path="/professores/:id" element={<ProtectedRoute><Layout><ProfessorDetalhe /></Layout></ProtectedRoute>} />
      <Route path="/turmas" element={<ProtectedRoute><Layout><Turmas /></Layout></ProtectedRoute>} />
      <Route path="/turmas/:id" element={<ProtectedRoute><Layout><TurmaDetalhe /></Layout></ProtectedRoute>} />
      <Route path="/notas" element={<ProtectedRoute><Layout><Notas /></Layout></ProtectedRoute>} />
      <Route path="/notas/pauta" element={<ProtectedRoute><PautaImpressao /></ProtectedRoute>} />
      <Route path="/presencas" element={<ProtectedRoute><Layout><Presencas /></Layout></ProtectedRoute>} />
      <Route path="/presencas-professores" element={<ProtectedRoute><Layout><PresencasProfessores /></Layout></ProtectedRoute>} />
      <Route path="/controlo-propinas" element={<ProtectedRoute><Layout><ControloPropinas /></Layout></ProtectedRoute>} />
      <Route path="/horarios" element={<ProtectedRoute><Layout><Horarios /></Layout></ProtectedRoute>} />
      <Route path="/pagamentos" element={<ProtectedRoute><Layout><Pagamentos /></Layout></ProtectedRoute>} />
      <Route path="/aulas-remotas" element={<ProtectedRoute><Layout><AulasRemotas /></Layout></ProtectedRoute>} />
      <Route path="/tesouraria" element={<ProtectedRoute><Layout><Tesouraria /></Layout></ProtectedRoute>} />
      <Route path="/precario" element={<ProtectedRoute><Layout><Precario /></Layout></ProtectedRoute>} />
      <Route path="/cursos" element={<ProtectedRoute><Layout><Cursos /></Layout></ProtectedRoute>} />
      <Route path="/disciplinas" element={<ProtectedRoute><Layout><Disciplinas /></Layout></ProtectedRoute>} />
      <Route path="/gestao-escolar" element={<ProtectedRoute><Layout><GestaoEscolar /></Layout></ProtectedRoute>} />
      <Route path="/configuracao-escola" element={<ProtectedRoute><Layout><ConfiguracaoEscola /></Layout></ProtectedRoute>} />
      <Route path="/utilizadores" element={<ProtectedRoute><Layout><GestaoUtilizadores /></Layout></ProtectedRoute>} />
      <Route path="/permissoes" element={<ProtectedRoute><Layout><GestaoPermissoes /></Layout></ProtectedRoute>} />
      <Route path="/cartao-estudante" element={<ProtectedRoute><Layout><CartaoEstudante /></Layout></ProtectedRoute>} />
      <Route path="/controlo-emolumentos" element={<ProtectedRoute><Layout><ControloEmolumentos /></Layout></ProtectedRoute>} />
      <Route path="/carteira-aluno"       element={<ProtectedRoute><Layout><CarteiraAluno /></Layout></ProtectedRoute>} />
      <Route path="/relatorio-diario"     element={<ProtectedRoute><Layout><RelatorioDiario /></Layout></ProtectedRoute>} />
      <Route path="/folha-prova"          element={<ProtectedRoute><Layout><FolhaProva /></Layout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to={loginRedirect ?? "/login"} replace />} />
    </Routes>
  );
}

export default function App() {
  return <BrowserRouter><AppRoutes /></BrowserRouter>;
}
