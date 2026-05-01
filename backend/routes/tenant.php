<?php
declare(strict_types=1);
use Illuminate\Support\Facades\Route;
use App\Http\Middleware\InitializeTenant;
use App\Http\Controllers\Tenant\AuthController;
use App\Http\Controllers\Tenant\DashboardController;
use App\Http\Controllers\Tenant\AlunoController;
use App\Http\Controllers\Tenant\ProfessorController;
use App\Http\Controllers\Tenant\TurmaController;
use App\Http\Controllers\Tenant\DisciplinaController;
use App\Http\Controllers\Tenant\MatriculaController;
use App\Http\Controllers\Tenant\RegraAproveitamentoController;
use App\Http\Controllers\Tenant\TipoDocumentoController;
use App\Http\Controllers\Tenant\AlunoDocumentoEntregaController;
use App\Http\Controllers\Tenant\MesController;
use App\Http\Controllers\Tenant\NotaController;
use App\Http\Controllers\Tenant\HorarioController;
use App\Http\Controllers\Tenant\PagamentoController;
use App\Http\Controllers\Tenant\ReciboPdfController;
use App\Http\Controllers\Tenant\SaftController;
use App\Http\Controllers\Tenant\AulaRemotaController;
use App\Http\Controllers\Tenant\CursoController;
use App\Http\Controllers\Tenant\ClasseController;
use App\Http\Controllers\Tenant\TurnoController;
use App\Http\Controllers\Tenant\SalaController;
use App\Http\Controllers\Tenant\PrecarioController;
use App\Http\Controllers\Tenant\PasswordResetController;
use App\Http\Controllers\Tenant\PortalController;
use App\Http\Controllers\Tenant\ConfiguracaoController;
use App\Http\Controllers\Tenant\UtilizadorController;
use App\Http\Controllers\Tenant\PresencaController;
use App\Http\Controllers\Tenant\PresencaProfessorController;
use App\Http\Controllers\Tenant\PublicAlunoController;
use App\Http\Controllers\Tenant\PublicProvaController;

Route::prefix("api/tenant")->middleware([InitializeTenant::class, \Illuminate\Routing\Middleware\SubstituteBindings::class])->group(function () {
    Route::post("auth/login", [AuthController::class, "login"]);
    Route::get("public/aluno/{numero}", [PublicAlunoController::class, "show"]);
    Route::get("public/prova/{codigo}",  [PublicProvaController::class, "show"]);
    Route::post("auth/forgot-password", [PasswordResetController::class, "forgotPassword"]);
    Route::post("auth/reset-password", [PasswordResetController::class, "resetPassword"]);

    Route::middleware(App\Http\Middleware\AuthenticateTenant::class)->group(function () {
        Route::post("auth/logout", [AuthController::class, "logout"]);
        Route::get("auth/me", [AuthController::class, "me"]);
        Route::get("dashboard", [DashboardController::class, "index"]);
        Route::post("alunos/{aluno}/foto", [AlunoController::class, "uploadFoto"]);
        Route::patch("alunos/{aluno}/reset-senha", [AlunoController::class, "resetSenha"]);
        Route::patch("alunos/{aluno}/definir-senha", [AlunoController::class, "definirSenha"]);
        Route::apiResource("alunos", AlunoController::class)->except(["store"]);
        Route::get("portal/me", [PortalController::class, "me"]);
        Route::get("portal/professor/me", [PortalController::class, "professorMe"]);
        Route::get("portal/perfil",       [PortalController::class, "perfil"]);
        Route::put("portal/perfil",       [PortalController::class, "atualizarPerfil"]);
        Route::post("portal/perfil/foto", [PortalController::class, "uploadFoto"]);
        Route::post("portal/alterar-senha", [PortalController::class, "alterarSenha"]);
        Route::patch("professores/{professor}/reset-senha", [ProfessorController::class, "resetSenha"]);
        Route::patch("professores/{professor}/definir-senha", [ProfessorController::class, "definirSenha"]);
        Route::post("professores/{professor}/foto", [ProfessorController::class, "uploadFoto"]);
        Route::apiResource("professores", ProfessorController::class);
        Route::apiResource("turmas", TurmaController::class);
        Route::post("turmas/{turma}/disciplinas", [TurmaController::class, "atribuirDisciplina"]);
        Route::apiResource("disciplinas", DisciplinaController::class);
        Route::get("matriculas", [MatriculaController::class, "index"]);
        Route::post("matriculas", [MatriculaController::class, "store"]);
        Route::post("matriculas/confirmar-multiplas", [MatriculaController::class, "confirmarMultiplas"]);
        Route::post("matriculas/renovar-ano/preview",  [MatriculaController::class, "renovarAnoPreview"]);
        Route::post("matriculas/renovar-ano/executar", [MatriculaController::class, "renovarAnoExecutar"]);
        Route::apiResource("regras-aproveitamento", RegraAproveitamentoController::class)->parameters(["regras-aproveitamento" => "regrasAproveitamento"]);

        // Tipos de Documento (config) + entregas por aluno
        Route::apiResource("tipos-documento", TipoDocumentoController::class)->parameters(["tipos-documento" => "tiposDocumento"]);
        Route::get("alunos/{aluno}/documentos",            [AlunoDocumentoEntregaController::class, "index"]);
        Route::post("alunos/{aluno}/documentos",           [AlunoDocumentoEntregaController::class, "store"]);
        Route::delete("alunos/{aluno}/documentos/{entrega}/ficheiro", [AlunoDocumentoEntregaController::class, "destroyFile"]);

        Route::get("meses", [MesController::class, "index"]);
        Route::get("matriculas/{matricula}", [MatriculaController::class, "show"]);
        Route::put("matriculas/{matricula}", [MatriculaController::class, "update"]);
        Route::patch("matriculas/{matricula}/confirmar", [MatriculaController::class, "confirmar"]);
        Route::patch("matriculas/{matricula}/cancelar",  [MatriculaController::class, "cancelar"]);
        Route::patch("matriculas/{matricula}/reactivar", [MatriculaController::class, "reactivar"]);
        Route::patch("matriculas/{matricula}/transferir",[MatriculaController::class, "transferir"]);
        Route::delete("matriculas/{matricula}", [MatriculaController::class, "destroy"]);
        Route::get("notas", [NotaController::class, "index"]);
        Route::post("notas", [NotaController::class, "store"]);
        Route::post("notas/bulk", [NotaController::class, "storeBulk"]);
        Route::get("notas/pauta", [NotaController::class, "pauta"]);
        Route::get("notas/pauta-anual", [NotaController::class, "pautaAnual"]);
        Route::get("notas/por-disciplina", [NotaController::class, "porDisciplina"]);
        Route::get("notas/boletim/{aluno}", [NotaController::class, "boletim"]);
        Route::get("horarios", [HorarioController::class, "index"]);
        Route::post("horarios", [HorarioController::class, "store"]);
        Route::delete("horarios/{horario}", [HorarioController::class, "destroy"]);
        // Presenças — alunos
        Route::get("presencas",              [PresencaController::class, "index"]);
        Route::post("presencas/bulk",        [PresencaController::class, "storeBulk"]);
        Route::get("presencas/relatorio",    [PresencaController::class, "relatorio"]);
        // Presenças — professores
        Route::get("presencas/professores",           [PresencaProfessorController::class, "index"]);
        Route::post("presencas/professores/bulk",     [PresencaProfessorController::class, "storeBulk"]);
        Route::get("presencas/professores/relatorio", [PresencaProfessorController::class, "relatorio"]);

        Route::get("pagamentos", [PagamentoController::class, "index"]);
        Route::post("pagamentos", [PagamentoController::class, "store"]);
        Route::get("pagamentos/relatorio",            [PagamentoController::class, "relatorio"]);
        Route::get("pagamentos/relatorio-diario",    [PagamentoController::class, "relatorioDiario"]);
        Route::get("pagamentos/relatorio-financeiro",[PagamentoController::class, "relatorioFinanceiro"]);
        Route::get("pagamentos/controlo-propinas",    [PagamentoController::class, "controloPropinas"]);
        Route::get("pagamentos/controlo-emolumentos", [PagamentoController::class, "controloEmolumentos"]);
        Route::get("pagamentos/calendario", [PagamentoController::class, "calendario"]);
        Route::post("pagamentos/pagar-multiplos", [PagamentoController::class, "pagarMultiplos"]);
        Route::post("pagamentos/gerar-propinas", [PagamentoController::class, "gerarPropinas"]);
        Route::post("pagamentos/gerar-emolumentos", [PagamentoController::class, "gerarEmolumentos"]);
        Route::post("folhas-prova/registar",        [PublicProvaController::class, "registar"]);
        Route::get("pagamentos/{pagamento}/recibo.pdf", [ReciboPdfController::class, "single"]);
        Route::get("pagamentos/lote/{loteId}/recibo.pdf", [ReciboPdfController::class, "lote"]);
        Route::get("saft", [SaftController::class, "exportar"]);
        Route::get("pagamentos/{pagamento}", [PagamentoController::class, "show"]);
        Route::patch("pagamentos/{pagamento}/pagar",    [PagamentoController::class, "pagar"]);
        Route::patch("pagamentos/{pagamento}/estornar", [PagamentoController::class, "estornar"]);
        Route::get("pagamentos/carteira/{alunoId}",     [PagamentoController::class, "carteira"]);
        Route::get("planos-pagamento", [PagamentoController::class, "planos"]);
        Route::post("planos-pagamento", [PagamentoController::class, "storePlano"]);
        Route::get("aulas-remotas", [AulaRemotaController::class, "index"]);
        Route::post("aulas-remotas", [AulaRemotaController::class, "store"]);
        Route::get("aulas-remotas/{aulaRemota}", [AulaRemotaController::class, "show"]);
        Route::put("aulas-remotas/{aulaRemota}", [AulaRemotaController::class, "update"]);
        Route::post("aulas-remotas/{aulaRemota}/materiais", [AulaRemotaController::class, "uploadMaterial"]);

        // Cursos + Plano Curricular
        Route::apiResource("cursos", CursoController::class);
        Route::get("cursos/{curso}/disciplinas", [CursoController::class, "disciplinas"]);
        Route::post("cursos/{curso}/disciplinas", [CursoController::class, "storeDisciplina"]);
        Route::put("cursos/{curso}/disciplinas/{disciplina}", [CursoController::class, "updateDisciplina"]);
        Route::delete("cursos/{curso}/disciplinas/{disciplina}", [CursoController::class, "destroyDisciplina"]);

        // Gestão Escolar
        Route::apiResource("classes", ClasseController::class)->except(["show"])->parameters(["classes" => "classe"]);
        Route::get("classes/{classe}/disciplinas", [ClasseController::class, "disciplinas"]);
        Route::apiResource("turnos", TurnoController::class)->except(["show"]);
        Route::apiResource("salas", SalaController::class)->except(["show"]);

        // Configurações
        Route::get("configuracoes/escola", [ConfiguracaoController::class, "escola"]);
        Route::put("configuracoes/escola", [ConfiguracaoController::class, "updateEscola"]);
        Route::post("configuracoes/escola/logo", [ConfiguracaoController::class, "uploadLogo"]);

        // Utilizadores (admins)
        Route::get("utilizadores", [UtilizadorController::class, "index"]);
        Route::post("utilizadores", [UtilizadorController::class, "store"]);
        Route::put("utilizadores/{user}", [UtilizadorController::class, "update"]);
        Route::put("utilizadores/{user}/permissoes", [UtilizadorController::class, "updatePermissoes"]);
        Route::patch("utilizadores/{user}/toggle-ativo", [UtilizadorController::class, "toggleAtivo"]);
        Route::delete("utilizadores/{user}", [UtilizadorController::class, "destroy"]);

        // Preçário
        Route::get("precario/propinas", [PrecarioController::class, "propinas"]);
        Route::post("precario/propinas", [PrecarioController::class, "storePropina"]);
        Route::put("precario/propinas/{propina}", [PrecarioController::class, "updatePropina"]);
        Route::delete("precario/propinas/{propina}", [PrecarioController::class, "destroyPropina"]);
        Route::get("precario/emolumentos", [PrecarioController::class, "emolumentos"]);
        Route::post("precario/emolumentos", [PrecarioController::class, "storeEmolumento"]);
        Route::put("precario/emolumentos/{emolumento}", [PrecarioController::class, "updateEmolumento"]);
        Route::delete("precario/emolumentos/{emolumento}", [PrecarioController::class, "destroyEmolumento"]);
        Route::get("precario/multas", [PrecarioController::class, "multas"]);
        Route::post("precario/multas", [PrecarioController::class, "storeMulta"]);
        Route::put("precario/multas/{multa}", [PrecarioController::class, "updateMulta"]);
        Route::delete("precario/multas/{multa}", [PrecarioController::class, "destroyMulta"]);
    });
});
