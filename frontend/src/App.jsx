import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/auth";
import { useCentralAuth } from "./store/centralAuth";
import Layout from "./components/layout/Layout";
import Login from "./pages/auth/Login";
import CadastroEscola from "./pages/auth/CadastroEscola";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import SsoLogin from "./pages/auth/SsoLogin";
import SuperAdminLogin from "./pages/super-admin/Login";
import SuperAdminLayout from "./pages/super-admin/Layout";
import SuperAdminDashboard from "./pages/super-admin/Dashboard";
import SuperAdminEscolas from "./pages/super-admin/Escolas";
import SuperAdminChat from "./pages/super-admin/Chat";
import SuperAdminContactos from "./pages/super-admin/Contactos";
import SuperAdminClientes from "./pages/super-admin/Clientes";
import SuperAdminFacturas from "./pages/super-admin/Facturas";
import SuperAdminPlanos from "./pages/super-admin/Planos";
import SuperAdminAssinaturas from "./pages/super-admin/Assinaturas";
import SuperAdminTermos from "./pages/super-admin/Termos";
import SuperAdminVendus from "./pages/super-admin/Vendus";
import Dashboard from "./pages/admin/Dashboard";
import Alunos from "./pages/admin/Alunos";
import Professores from "./pages/admin/Professores";
import ProfessorDetalhe from "./pages/admin/ProfessorDetalhe";
import Turmas from "./pages/admin/Turmas";
import TurmaDetalhe from "./pages/admin/TurmaDetalhe";
import Notas from "./pages/admin/Notas";
import Horarios from "./pages/admin/Horarios";
import Pagamentos from "./pages/admin/Pagamentos";
import RhDashboard from "./pages/admin/rh/Dashboard";
import RhFuncionarios from "./pages/admin/rh/Funcionarios";
import RhFuncionarioDetalhe from "./pages/admin/rh/FuncionarioDetalhe";
import RhFolhas from "./pages/admin/rh/Folhas";
import RhFolhaDetalhe from "./pages/admin/rh/FolhaDetalhe";
import AulasRemotas from "./pages/admin/AulasRemotas";
import Tesouraria from "./pages/admin/Tesouraria";
import Precario from "./pages/admin/Precario";
import Cursos from "./pages/admin/Cursos";
import GestaoEscolar from "./pages/admin/GestaoEscolar";
import Disciplinas from "./pages/admin/Disciplinas";
import AlunoDetalhe from "./pages/admin/AlunoDetalhe";
import Matriculas from "./pages/admin/Matriculas";
import RenovacaoMatriculas from "./pages/admin/RenovacaoMatriculas";
import RegrasAproveitamento from "./pages/admin/RegrasAproveitamento";
import TiposDocumento from "./pages/admin/TiposDocumento";
import Perfil from "./pages/Perfil";
import PautaImpressao from "./pages/admin/PautaImpressao";
import Presencas from "./pages/admin/Presencas";
import PresencasProfessores from "./pages/admin/PresencasProfessores";
import ControloPropinas from "./pages/admin/ControloPropinas";
import ProfessorPresencas from "./pages/professor/ProfessorPresencas";
import ConfiguracaoEscola from "./pages/admin/ConfiguracaoEscola";
import IntegracaoVendus from "./pages/admin/IntegracaoVendus";
import ConfiguracaoImpressao from "./pages/admin/ConfiguracaoImpressao";
import Caixa from "./pages/admin/Caixa";
import Pos from "./pages/admin/Pos";
import GestaoUtilizadores from "./pages/admin/GestaoUtilizadores";
import GestaoPermissoes from "./pages/admin/GestaoPermissoes";
import CartaoEstudante from "./pages/admin/CartaoEstudante";
import ControloEmolumentos from "./pages/admin/ControloEmolumentos";
import PerfilAluno from "./pages/public/PerfilAluno";
import Downloads from "./pages/public/Downloads";
import VerificarProva from "./pages/public/VerificarProva";
import VerificarDocumento from "./pages/public/VerificarDocumento";
import CarteiraAluno from "./pages/admin/CarteiraAluno";
import RelatorioDiario from "./pages/admin/RelatorioDiario";
import RelatorioFinanceiro from "./pages/admin/RelatorioFinanceiro";
import FolhaProva from "./pages/admin/FolhaProva";
import Financiadores from "./pages/admin/Financiadores";
import Bolsas from "./pages/admin/Bolsas";
import Lembretes from "./pages/admin/Lembretes";
import Upgrade from "./pages/Upgrade";
import RequiresFeature from "./components/RequiresFeature";
import SiteLayout from "./pages/site/SiteLayout";
import Home from "./pages/site/Home";
import Funcionalidades from "./pages/site/Funcionalidades";
import Precos from "./pages/site/Precos";
import Contacto from "./pages/site/Contacto";
import Termos from "./pages/site/Termos";
import Chat from "./pages/chat/Chat";
import Comunidade from "./pages/comunidade/Comunidade";
import PortalLayout from "./pages/portal/PortalLayout";
import PortalInicio from "./pages/portal/PortalInicio";
import PortalNotas from "./pages/portal/PortalNotas";
import PortalNotificacoes from "./pages/portal/PortalNotificacoes";
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
        <Route path="chat" element={<SuperAdminChat />} />
        <Route path="contactos" element={<SuperAdminContactos />} />
        <Route path="clientes" element={<SuperAdminClientes />} />
        <Route path="facturas" element={<SuperAdminFacturas />} />
        <Route path="planos" element={<SuperAdminPlanos />} />
        <Route path="assinaturas" element={<SuperAdminAssinaturas />} />
        <Route path="termos" element={<SuperAdminTermos />} />
        <Route path="vendus" element={<SuperAdminVendus />} />
      </Route>

      {/* Perfil público do aluno (via QR) */}
      <Route path="/p/:escola/:numero" element={<PerfilAluno />} />

      {/* Downloads das apps */}
      <Route path="/downloads" element={<Downloads />} />

      {/* Verificação pública de folha de prova */}
      <Route path="/verificar-prova/:codigo" element={<VerificarProva />} />

      {/* Verificação pública de documentos fiscais (via QR) */}
      <Route path="/verificar-recibo/:escola/:ref"        element={<VerificarDocumento />} />
      <Route path="/verificar-recibo-bolsa/:escola/:ref"  element={<VerificarDocumento />} />
      <Route path="/verificar-fecho-caixa/:escola/:codigo" element={<VerificarDocumento />} />
      <Route path="/verificar-factura/:numero"            element={<VerificarDocumento />} />
      <Route path="/verificar-recibo-central/:numero"     element={<VerificarDocumento />} />

      {/* Tenant public */}
      <Route path="/login" element={loginRedirect ? <Navigate to={loginRedirect} replace /> : <Login />} />
      <Route path="/cadastro" element={loginRedirect ? <Navigate to={loginRedirect} replace /> : <CadastroEscola />} />
      <Route path="/recuperar-senha" element={<ForgotPassword />} />
      <Route path="/recuperar-senha/confirmar" element={<ResetPassword />} />
      <Route path="/auth/sso" element={<SsoLogin />} />
      {/* Site público (educaja.com) */}
      <Route element={<SiteLayout />}>
        <Route path="/"                element={<Home />} />
        <Route path="/funcionalidades" element={<Funcionalidades />} />
        <Route path="/precos"          element={<Precos />} />
        <Route path="/contacto"        element={<Contacto />} />
        <Route path="/termos"          element={<Termos />} />
      </Route>

      {/* Portal do Aluno */}
      <Route path="/portal" element={<PortalRoute><PortalLayout /></PortalRoute>}>
        <Route index element={<PortalInicio />} />
        <Route path="notas" element={<PortalNotas />} />
        <Route path="horario" element={<PortalHorario />} />
        <Route path="aulas" element={<PortalAulas />} />
        <Route path="financas" element={<PortalFinancas />} />
        <Route path="conta" element={<PortalConta />} />
        <Route path="chat" element={<Chat />} />
        <Route path="comunidade" element={<Comunidade />} />
        <Route path="notificacoes" element={<PortalNotificacoes />} />
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
        <Route path="chat" element={<Chat />} />
        <Route path="comunidade" element={<Comunidade />} />
      </Route>

      {/* Admin */}
      <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/alunos" element={<ProtectedRoute><Layout><Alunos /></Layout></ProtectedRoute>} />
      <Route path="/alunos/:id" element={<ProtectedRoute><Layout><AlunoDetalhe /></Layout></ProtectedRoute>} />
      <Route path="/matriculas" element={<ProtectedRoute><Layout><Matriculas /></Layout></ProtectedRoute>} />
      <Route path="/matriculas/renovacao" element={<ProtectedRoute><Layout><RenovacaoMatriculas /></Layout></ProtectedRoute>} />
      <Route path="/regras-aproveitamento" element={<ProtectedRoute><Layout><RegrasAproveitamento /></Layout></ProtectedRoute>} />
      <Route path="/tipos-documento" element={<ProtectedRoute><Layout><TiposDocumento /></Layout></ProtectedRoute>} />
      <Route path="/perfil" element={<ProtectedRoute><Layout><Perfil /></Layout></ProtectedRoute>} />
      <Route path="/professores" element={<ProtectedRoute><Layout><Professores /></Layout></ProtectedRoute>} />
      <Route path="/professores/:id" element={<ProtectedRoute><Layout><ProfessorDetalhe /></Layout></ProtectedRoute>} />
      <Route path="/turmas" element={<ProtectedRoute><Layout><Turmas /></Layout></ProtectedRoute>} />
      <Route path="/turmas/:id" element={<ProtectedRoute><Layout><TurmaDetalhe /></Layout></ProtectedRoute>} />
      <Route path="/notas" element={<ProtectedRoute><Layout><Notas /></Layout></ProtectedRoute>} />
      <Route path="/notas/pauta" element={<ProtectedRoute><PautaImpressao /></ProtectedRoute>} />
      <Route path="/presencas" element={<ProtectedRoute><Layout><Presencas /></Layout></ProtectedRoute>} />
      <Route path="/presencas-professores" element={<ProtectedRoute><Layout><PresencasProfessores /></Layout></ProtectedRoute>} />
      <Route path="/controlo-propinas" element={<ProtectedRoute><RequiresFeature feature="tesouraria"><Layout><ControloPropinas /></Layout></RequiresFeature></ProtectedRoute>} />
      <Route path="/horarios" element={<ProtectedRoute><Layout><Horarios /></Layout></ProtectedRoute>} />
      <Route path="/pagamentos" element={<ProtectedRoute><RequiresFeature feature="tesouraria"><Layout><Pagamentos /></Layout></RequiresFeature></ProtectedRoute>} />
      <Route path="/rh" element={<ProtectedRoute><Layout><RhDashboard /></Layout></ProtectedRoute>} />
      <Route path="/rh/funcionarios" element={<ProtectedRoute><Layout><RhFuncionarios /></Layout></ProtectedRoute>} />
      <Route path="/rh/funcionarios/:id" element={<ProtectedRoute><Layout><RhFuncionarioDetalhe /></Layout></ProtectedRoute>} />
      <Route path="/rh/folhas" element={<ProtectedRoute><Layout><RhFolhas /></Layout></ProtectedRoute>} />
      <Route path="/rh/folhas/:id" element={<ProtectedRoute><Layout><RhFolhaDetalhe /></Layout></ProtectedRoute>} />
      <Route path="/upgrade" element={<ProtectedRoute><Upgrade /></ProtectedRoute>} />
      <Route path="/aulas-remotas" element={<ProtectedRoute><RequiresFeature feature="aulas_remotas"><Layout><AulasRemotas /></Layout></RequiresFeature></ProtectedRoute>} />
      <Route path="/tesouraria" element={<ProtectedRoute><RequiresFeature feature="tesouraria"><Layout><Tesouraria /></Layout></RequiresFeature></ProtectedRoute>} />
      <Route path="/precario" element={<ProtectedRoute><RequiresFeature feature="tesouraria"><Layout><Precario /></Layout></RequiresFeature></ProtectedRoute>} />
      <Route path="/cursos" element={<ProtectedRoute><Layout><Cursos /></Layout></ProtectedRoute>} />
      <Route path="/disciplinas" element={<ProtectedRoute><Layout><Disciplinas /></Layout></ProtectedRoute>} />
      <Route path="/gestao-escolar" element={<ProtectedRoute><Layout><GestaoEscolar /></Layout></ProtectedRoute>} />
      <Route path="/configuracao-escola" element={<ProtectedRoute><Layout><ConfiguracaoEscola /></Layout></ProtectedRoute>} />
      <Route path="/integracao-vendus" element={<ProtectedRoute><Layout><IntegracaoVendus /></Layout></ProtectedRoute>} />
      <Route path="/configuracao-impressao" element={<ProtectedRoute><Layout><ConfiguracaoImpressao /></Layout></ProtectedRoute>} />
      <Route path="/caixa" element={<ProtectedRoute><RequiresFeature feature="tesouraria"><Layout><Caixa /></Layout></RequiresFeature></ProtectedRoute>} />
      <Route path="/pos" element={<ProtectedRoute><RequiresFeature feature="tesouraria"><Layout><Pos /></Layout></RequiresFeature></ProtectedRoute>} />
      <Route path="/utilizadores" element={<ProtectedRoute><Layout><GestaoUtilizadores /></Layout></ProtectedRoute>} />
      <Route path="/permissoes" element={<ProtectedRoute><Layout><GestaoPermissoes /></Layout></ProtectedRoute>} />
      <Route path="/cartao-estudante" element={<ProtectedRoute><Layout><CartaoEstudante /></Layout></ProtectedRoute>} />
      <Route path="/controlo-emolumentos" element={<ProtectedRoute><RequiresFeature feature="tesouraria"><Layout><ControloEmolumentos /></Layout></RequiresFeature></ProtectedRoute>} />
      <Route path="/carteira-aluno"       element={<ProtectedRoute><RequiresFeature feature="tesouraria"><Layout><CarteiraAluno /></Layout></RequiresFeature></ProtectedRoute>} />
      <Route path="/relatorio-diario"      element={<ProtectedRoute><RequiresFeature feature="tesouraria"><Layout><RelatorioDiario /></Layout></RequiresFeature></ProtectedRoute>} />
      <Route path="/relatorio-financeiro" element={<ProtectedRoute><RequiresFeature feature="tesouraria"><Layout><RelatorioFinanceiro /></Layout></RequiresFeature></ProtectedRoute>} />
      <Route path="/folha-prova"          element={<ProtectedRoute><RequiresFeature feature="folha_prova_qr"><Layout><FolhaProva /></Layout></RequiresFeature></ProtectedRoute>} />
      <Route path="/financiadores"        element={<ProtectedRoute><RequiresFeature feature="bolsas"><Layout><Financiadores /></Layout></RequiresFeature></ProtectedRoute>} />
      <Route path="/bolsas"               element={<ProtectedRoute><RequiresFeature feature="bolsas"><Layout><Bolsas /></Layout></RequiresFeature></ProtectedRoute>} />
      <Route path="/lembretes"            element={<ProtectedRoute><RequiresFeature feature="lembretes_email_sms"><Layout><Lembretes /></Layout></RequiresFeature></ProtectedRoute>} />
      <Route path="/chat"                 element={<ProtectedRoute><Layout><Chat /></Layout></ProtectedRoute>} />
      <Route path="/comunidade"           element={<ProtectedRoute><Layout><Comunidade /></Layout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to={loginRedirect ?? "/login"} replace />} />
    </Routes>
  );
}

export default function App() {
  return <BrowserRouter><AppRoutes /></BrowserRouter>;
}
