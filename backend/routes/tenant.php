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
use App\Http\Controllers\Tenant\FuncionarioController;
use App\Http\Controllers\Tenant\GuiaController;
use App\Http\Controllers\Tenant\FolhaPagamentoController;
use App\Http\Controllers\Tenant\PresencaFuncionarioController;
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
use App\Http\Controllers\Tenant\FinanciadorController;
use App\Http\Controllers\Tenant\BolsaController;
use App\Http\Controllers\Tenant\ReciboBolsaController;
use App\Http\Controllers\Tenant\PasswordResetController;
use App\Http\Controllers\Tenant\PortalController;
use App\Http\Controllers\Tenant\ConfiguracaoController;
use App\Http\Controllers\Tenant\UtilizadorController;
use App\Http\Controllers\Tenant\PresencaController;
use App\Http\Controllers\Tenant\PresencaProfessorController;
use App\Http\Controllers\Tenant\CaixaController;
use App\Http\Controllers\Tenant\PosController;
use App\Http\Controllers\Tenant\PublicAlunoController;
use App\Http\Controllers\Tenant\PublicProvaController;
use App\Http\Controllers\Tenant\PublicVerificationController;
use App\Http\Controllers\Tenant\ChatController;
use App\Http\Controllers\Tenant\ComunidadeController;
use App\Http\Controllers\Tenant\LembreteController;

Route::prefix("api/tenant")->middleware([InitializeTenant::class, \Illuminate\Routing\Middleware\SubstituteBindings::class])->group(function () {
    Route::post("auth/login", [AuthController::class, "login"]);
    Route::get("public/aluno/{numero}", [PublicAlunoController::class, "show"]);
    Route::get("public/prova/{codigo}",  [PublicProvaController::class, "show"]);
    Route::get("public/recibo/{referencia}",       [PublicVerificationController::class, "recibo"]);
    Route::get("public/recibo-bolsa/{referencia}", [PublicVerificationController::class, "reciboBolsa"]);
    Route::get("public/fecho-caixa/{codigo}",      [PublicVerificationController::class, "fechoCaixa"]);
    Route::post("auth/forgot-password", [PasswordResetController::class, "forgotPassword"]);
    Route::post("auth/reset-password", [PasswordResetController::class, "resetPassword"]);

    Route::middleware(App\Http\Middleware\AuthenticateTenant::class)->group(function () {
        Route::post("auth/logout", [AuthController::class, "logout"]);
        Route::get("auth/me", [AuthController::class, "me"]);
        Route::get("dashboard", [DashboardController::class, "index"]);
        Route::post("alunos/{aluno}/foto", [AlunoController::class, "uploadFoto"]);
        Route::patch("alunos/{aluno}/reset-senha", [AlunoController::class, "resetSenha"]);
        Route::patch("alunos/{aluno}/definir-senha", [AlunoController::class, "definirSenha"]);
        Route::patch("alunos/{aluno}/verificar-dados-academicos", [AlunoController::class, "verificarDadosAcademicos"]);
        Route::patch("alunos/{aluno}/reset-verificacao-academica", [AlunoController::class, "resetVerificacaoAcademica"]);
        Route::apiResource("alunos", AlunoController::class)->except(["store"]);

        // ── RH: Funcionários e Folhas de Pagamento ──
        Route::get("rh/guia-rapido.pdf", [GuiaController::class, "rh"]);
        Route::get("rh/dashboard", [FuncionarioController::class, "dashboard"]);
        Route::get("rh/professores-sem-funcionario", [FuncionarioController::class, "professoresSemFuncionario"]);
        Route::post("rh/funcionarios/criar-de-professor", [FuncionarioController::class, "criarDeProfessor"]);
        Route::post("funcionarios/{funcionario}/foto", [FuncionarioController::class, "uploadFoto"]);
        Route::apiResource("funcionarios", FuncionarioController::class);

        Route::post("folhas-pagamento/gerar-mes", [FolhaPagamentoController::class, "gerarMes"]);
        Route::patch("folhas-pagamento/{folha}/processar", [FolhaPagamentoController::class, "processar"]);
        Route::patch("folhas-pagamento/{folha}/pagar", [FolhaPagamentoController::class, "pagar"]);
        Route::patch("folhas-pagamento/{folha}/anular", [FolhaPagamentoController::class, "anular"]);
        Route::get("folhas-pagamento/{folha}/recibo.pdf", [FolhaPagamentoController::class, "reciboPdf"]);
        Route::apiResource("folhas-pagamento", FolhaPagamentoController::class)->parameters(["folhas-pagamento" => "folha"]);

        // ── RH: Presenças de Funcionários ──
        Route::get("presencas-funcionarios/dashboard", [PresencaFuncionarioController::class, "dashboard"]);
        Route::get("presencas-funcionarios/grelha-mes", [PresencaFuncionarioController::class, "grelhaMes"]);
        Route::post("presencas-funcionarios/clock-in", [PresencaFuncionarioController::class, "clockIn"]);
        Route::post("presencas-funcionarios/clock-out", [PresencaFuncionarioController::class, "clockOut"]);
        Route::apiResource("presencas-funcionarios", PresencaFuncionarioController::class)
            ->only(["index", "store", "update", "destroy"])
            ->parameters(["presencas-funcionarios" => "presenca"]);
        Route::get("portal/me", [PortalController::class, "me"]);
        Route::get("portal/professor/me", [PortalController::class, "professorMe"]);
        Route::get("portal/perfil",       [PortalController::class, "perfil"]);
        Route::put("portal/perfil",       [PortalController::class, "atualizarPerfil"]);
        Route::post("portal/perfil/foto", [PortalController::class, "uploadFoto"]);
        Route::post("portal/alterar-senha", [PortalController::class, "alterarSenha"]);
        Route::get ("portal/notificacoes",            [PortalController::class, "notificacoes"]);
        Route::get ("portal/notificacoes/contagem",   [PortalController::class, "notificacoesContagem"]);
        Route::post("portal/notificacoes/lidas",      [PortalController::class, "marcarTodasLidas"]);
        Route::post("portal/notificacoes/{id}/lida",  [PortalController::class, "marcarNotificacaoLida"]);
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

        // === Tesouraria (plano standard+) ===
        Route::middleware("feature:tesouraria")->group(function () {
            Route::get("pagamentos", [PagamentoController::class, "index"]);
            Route::post("pagamentos", [PagamentoController::class, "store"]);
            Route::get("pagamentos/relatorio",            [PagamentoController::class, "relatorio"]);
            Route::get("pagamentos/relatorio-diario",    [PagamentoController::class, "relatorioDiario"]);
            Route::get("pagamentos/relatorio-financeiro",[PagamentoController::class, "relatorioFinanceiro"]);
            Route::get("pagamentos/controlo-propinas",    [PagamentoController::class, "controloPropinas"]);
            Route::get("pagamentos/controlo-emolumentos", [PagamentoController::class, "controloEmolumentos"]);
            Route::get("pagamentos/calendario", [PagamentoController::class, "calendario"]);
            Route::post("pagamentos/pagar-multiplos", [PagamentoController::class, "pagarMultiplos"]);
            Route::post("pagamentos/pagar-multiplos-historico", [PagamentoController::class, "pagarMultiplosHistorico"]);
            Route::post("pagamentos/gerar-propinas", [PagamentoController::class, "gerarPropinas"]);
            Route::post("pagamentos/gerar-emolumentos", [PagamentoController::class, "gerarEmolumentos"]);
            Route::get("pagamentos/{pagamento}/recibo.pdf", [ReciboPdfController::class, "single"]);
            Route::get("pagamentos/lote/{loteId}/recibo.pdf", [ReciboPdfController::class, "lote"]);
            Route::get("saft", [SaftController::class, "exportar"]);
            Route::get("pagamentos/{pagamento}", [PagamentoController::class, "show"]);
            Route::patch("pagamentos/{pagamento}/pagar",    [PagamentoController::class, "pagar"]);
            Route::patch("pagamentos/{pagamento}/estornar", [PagamentoController::class, "estornar"]);
            Route::post("pagamentos/{pagamento}/vendus/emitir", [PagamentoController::class, "emitirVendus"]);
            Route::post("pagamentos/{pagamento}/vendus/nota-credito", [PagamentoController::class, "emitirNotaCreditoVendus"]);
            Route::get("pagamentos/carteira/{alunoId}",                [PagamentoController::class, "carteira"]);
            Route::post("pagamentos/carteira/{alunoId}/depositar",     [PagamentoController::class, "depositarCarteira"]);
            Route::post("pagamentos/carteira/{alunoId}/levantar",      [PagamentoController::class, "levantarCarteira"]);
            Route::get("planos-pagamento", [PagamentoController::class, "planos"]);
            Route::post("planos-pagamento", [PagamentoController::class, "storePlano"]);
        });

        // === Folha de prova com QR (plano standard+) ===
        Route::middleware("feature:folha_prova_qr")->group(function () {
            Route::post("folhas-prova/registar", [PublicProvaController::class, "registar"]);
        });

        // === Aulas remotas (plano standard+) ===
        Route::middleware("feature:aulas_remotas")->group(function () {
            Route::get("aulas-remotas", [AulaRemotaController::class, "index"]);
            Route::post("aulas-remotas", [AulaRemotaController::class, "store"]);
            Route::get("aulas-remotas/{aulaRemota}", [AulaRemotaController::class, "show"]);
            Route::put("aulas-remotas/{aulaRemota}", [AulaRemotaController::class, "update"]);
            Route::post("aulas-remotas/{aulaRemota}/materiais", [AulaRemotaController::class, "uploadMaterial"]);
        });

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
        Route::get("configuracoes/vendus", [ConfiguracaoController::class, "vendus"]);
        Route::put("configuracoes/vendus", [ConfiguracaoController::class, "updateVendus"]);
        Route::post("configuracoes/vendus/test", [ConfiguracaoController::class, "testarVendus"]);
        Route::get("configuracoes/impressao", [ConfiguracaoController::class, "impressao"]);
        Route::put("configuracoes/impressao", [ConfiguracaoController::class, "updateImpressao"]);

        // Caixa (gestão de sessões)
        Route::middleware("feature:tesouraria")->group(function () {
            Route::get("caixa", [CaixaController::class, "index"]);
            Route::get("caixa/actual", [CaixaController::class, "actual"]);
            Route::get("caixa/resumo", [CaixaController::class, "resumo"]);
            Route::post("caixa/abrir", [CaixaController::class, "abrir"]);
            Route::get("caixa/{sessao}", [CaixaController::class, "show"]);
            Route::get("caixa/{sessao}/fecho.pdf", [CaixaController::class, "pdfFecho"]);
            Route::post("caixa/{sessao}/fechar", [CaixaController::class, "fechar"]);
            Route::post("caixa/{sessao}/sangria", [CaixaController::class, "sangria"]);
            Route::post("caixa/{sessao}/reforco", [CaixaController::class, "reforco"]);
            Route::post("caixa/{sessao}/despesa", [CaixaController::class, "despesa"]);

            // POS — ecrã rápido de cobrança
            Route::get("pos/alunos", [PosController::class, "pesquisarAlunos"]);
            Route::get("pos/alunos/{aluno}/dividas", [PosController::class, "dividasAluno"]);
            Route::get("pos/verificar-referencia", [PosController::class, "verificarReferencia"]);
            Route::post("pos/cobrar", [PosController::class, "cobrar"]);
            Route::get("pos/recibo/{loteOrPag}", [PosController::class, "recibo"]);
        });

        // Utilizadores (admins)
        Route::get("utilizadores", [UtilizadorController::class, "index"]);
        Route::post("utilizadores", [UtilizadorController::class, "store"]);
        Route::put("utilizadores/{user}", [UtilizadorController::class, "update"]);
        Route::put("utilizadores/{user}/permissoes", [UtilizadorController::class, "updatePermissoes"]);
        Route::patch("utilizadores/{user}/toggle-ativo", [UtilizadorController::class, "toggleAtivo"]);
        Route::delete("utilizadores/{user}", [UtilizadorController::class, "destroy"]);

        // Preçário (parte do tesouraria) — plano standard+
        Route::middleware("feature:tesouraria")->group(function () {
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

        // Bolsas e financiadores (plano standard+)
        Route::middleware("feature:bolsas")->group(function () {
            Route::apiResource("financiadores", FinanciadorController::class);
            Route::apiResource("bolsas", BolsaController::class);
            Route::post("bolsas/{bolsa}/cancelar",  [BolsaController::class, "cancelar"]);
            Route::post("bolsas/{bolsa}/reactivar", [BolsaController::class, "reactivar"]);

            Route::get ("recibos-bolsa",                      [ReciboBolsaController::class, "index"]);
            Route::post("recibos-bolsa/emitir",               [ReciboBolsaController::class, "emitir"]);
            Route::get ("recibos-bolsa/{reciboBolsa}",        [ReciboBolsaController::class, "show"]);
            Route::get ("recibos-bolsa/{reciboBolsa}/pdf",    [ReciboBolsaController::class, "pdf"]);
        });

        // Chat / Papo Instantâneo
        Route::get ("chat/conversas",                          [ChatController::class, "conversas"]);
        Route::get ("chat/sondagem",                           [ChatController::class, "sondagem"]);
        Route::get ("chat/contactos",                          [ChatController::class, "contactos"]);
        Route::post("chat/conversas/privada",                  [ChatController::class, "iniciarPrivada"]);
        Route::post("chat/conversas/turma/{turma}",            [ChatController::class, "iniciarTurma"]);
        Route::get ("chat/conversas/{conversa}",               [ChatController::class, "showConversa"]);
        Route::get ("chat/conversas/{conversa}/mensagens",     [ChatController::class, "mensagens"]);
        Route::post("chat/conversas/{conversa}/mensagens",     [ChatController::class, "enviar"]);
        Route::post("chat/conversas/{conversa}/lida",          [ChatController::class, "marcarLida"]);

        // Lembretes de pagamento email + SMS (plano standard+)
        Route::middleware("feature:lembretes_email_sms")->group(function () {
            Route::get ("lembretes",                          [LembreteController::class, "index"]);
            Route::get ("lembretes/config",                   [LembreteController::class, "config"]);
            Route::put ("lembretes/config",                   [LembreteController::class, "updateConfig"]);
            Route::post("lembretes/gerar",                    [LembreteController::class, "gerar"]);
            Route::post("lembretes/processar",                [LembreteController::class, "processar"]);
            Route::post("lembretes/teste-sms",                [LembreteController::class, "testarSms"]);
            Route::post("lembretes/{lembrete}/reenviar",      [LembreteController::class, "reenviar"]);
            Route::post("pagamentos/{pagamento}/lembrete",    [LembreteController::class, "enviarManual"]);
        });

        // Comunidade Educaja (feed + fórum)
        Route::get   ("comunidade/feed",                                [ComunidadeController::class, "feed"]);
        Route::get   ("comunidade/forum/turma/{turma}",                 [ComunidadeController::class, "forumTurma"]);
        Route::post  ("comunidade/posts",                               [ComunidadeController::class, "criar"]);
        Route::get   ("comunidade/posts/{post}",                        [ComunidadeController::class, "show"]);
        Route::put   ("comunidade/posts/{post}",                        [ComunidadeController::class, "actualizar"]);
        Route::delete("comunidade/posts/{post}",                        [ComunidadeController::class, "apagar"]);
        Route::post  ("comunidade/posts/{post}/comentarios",            [ComunidadeController::class, "comentar"]);
        Route::delete("comunidade/comentarios/{comentario}",            [ComunidadeController::class, "apagarComentario"]);
        Route::post  ("comunidade/posts/{post}/gostar",                 [ComunidadeController::class, "gostar"]);
        Route::post  ("comunidade/posts/{post}/aceitar/{comentario}",   [ComunidadeController::class, "aceitar"]);
    });
});
