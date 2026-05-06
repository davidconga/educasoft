<?php
namespace App\Http\Controllers\Tenant;
use App\Http\Controllers\Controller;
use App\Models\Tenant\Aluno;
use App\Models\Tenant\AlunoDocumento;
use App\Models\Tenant\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
class AlunoController extends Controller {
    private function relations(): array {
        return ["user","matriculas.turma.classe.curso","matriculas.turma.turnoObj"];
    }

    public function index(Request $request) {
        $query = Aluno::with($this->relations());
        if ($request->search) {
            $query->whereHas("user", fn($q) => $q->where("nome","like","%{$request->search}%")->orWhere("email","like","%{$request->search}%"));
        }
        if ($request->turma_id) {
            $query->whereHas("matriculas", fn($q) => $q->where("turma_id", $request->turma_id)->where("status","activa"));
        }
        if ($request->classe_id) {
            $query->whereHas("matriculas.turma", fn($q) => $q->where("classe_id", $request->classe_id));
        }
        if ($request->turno_id) {
            $query->whereHas("matriculas.turma", fn($q) => $q->where("turno_id", $request->turno_id));
        }
        if ($request->curso_id) {
            $query->whereHas("matriculas.turma.classe", fn($q) => $q->where("curso_id", $request->curso_id));
        }
        if ($request->status) {
            $query->whereHas("matriculas", fn($q) => $q->where("status", $request->status));
        }
        if ($request->ano_letivo) {
            $query->whereHas("matriculas", fn($q) => $q->where("ano_letivo", $request->ano_letivo));
        }
        if ($request->genero) {
            $query->where("genero", $request->genero);
        }
        return response()->json($query->paginate($request->per_page ?? 50));
    }

    public function store(Request $request) {
        $request->validate(["nome"=>"required","email"=>"required|email|unique:users","data_nascimento"=>"nullable|date"]);
        return DB::transaction(function() use ($request) {
            $user = User::create(["nome"=>$request->nome,"email"=>$request->email,"password"=>bcrypt($request->password ?? "educasoft123"),"tipo"=>"aluno","telefone"=>$request->telefone]);
            $aluno = Aluno::create(array_merge($request->only(["data_nascimento","genero","naturalidade","nacionalidade","bi","nome_pai","nome_mae","telefone_responsavel","email_responsavel","endereco"]),["user_id"=>$user->id,"numero_aluno"=>"A".str_pad(Aluno::count()+1, 5, "0", STR_PAD_LEFT)]));
            return response()->json(["message"=>"Aluno criado.","aluno"=>$aluno->load($this->relations())], 201);
        });
    }

    public function show(Aluno $aluno) {
        return response()->json($aluno->load("user","documento","matriculas.turma.classe.curso","matriculas.turma.turnoObj","notas.disciplina","pagamentos.plano"));
    }

    public function update(Request $request, Aluno $aluno) {
        $aluno->update($request->only(["data_nascimento","genero","naturalidade","nacionalidade","bi","nome_pai","nome_mae","telefone_responsavel","email_responsavel","endereco"]));
        $aluno->user->update($request->only(["nome","email","telefone"]));

        // Documento extendido — upsert se vier no payload
        $docInput = $request->input("documento");
        if (is_array($docInput)) {
            $payload = array_intersect_key($docInput, array_flip(AlunoDocumento::inputFields()));
            AlunoDocumento::updateOrCreate(["aluno_id" => $aluno->id], $payload);
        }

        return response()->json(["message"=>"Aluno actualizado.","aluno"=>$aluno->load(array_merge($this->relations(), ["documento"]))]);
    }

    public function uploadFoto(Request $request, Aluno $aluno) {
        $request->validate(["foto"=>"required|image|max:2048"]);
        // Delete old photo if exists
        if ($aluno->foto) Storage::disk("public")->delete($aluno->foto);
        $path = $request->file("foto")->store("fotos/alunos", "public");
        $aluno->update(["foto" => $path]);
        return response()->json(["foto_url" => "/storage/{$path}"]);
    }

    public function resetSenha(Aluno $aluno) {
        $aluno->user->update(["password" => bcrypt("educasoft123")]);
        return response()->json(["message" => "Senha redefinida para educasoft123."]);
    }

    public function definirSenha(Request $request, Aluno $aluno) {
        $request->validate([
            "password"              => "required|min:6|confirmed",
            "password_confirmation" => "required",
        ]);
        $aluno->user->update(["password" => bcrypt($request->password)]);
        return response()->json(["message" => "Senha definida com sucesso."]);
    }

    /**
     * Reposição de dados (Golfinho): valida/actualiza turma da matrícula activa
     * e marca os dados académicos do aluno como verificados.
     */
    public function verificarDadosAcademicos(Request $request, Aluno $aluno) {
        $escola = $request->attributes->get("escola");
        if (!$escola || !$escola->permite_pago_historico) {
            return response()->json(["message" => "Funcionalidade não disponível para esta escola."], 403);
        }

        $request->validate([
            "turma_id"   => "required|exists:turmas,id",
            "ano_letivo" => "nullable|string|max:20",
        ]);

        $anoAlvo = $request->ano_letivo ?: "2025-2026";
        $authNome = $request->attributes->get("auth_user")?->nome ?? "Sistema";
        $obs = "Concluída automaticamente — aluno verificado em {$anoAlvo} por {$authNome} a " . now()->format("d/m/Y H:i");

        // 1) Fecha outras matriculas activas/em curso de outros anos lectivos.
        \App\Models\Tenant\Matricula::where("aluno_id", $aluno->id)
            ->where("ano_letivo", "!=", $anoAlvo)
            ->whereIn("status", ["activa", "confirmada", "pendente"])
            ->update([
                "status"     => "concluida",
                "observacao" => $obs,
            ]);

        // 2) Procura matricula existente para o ano alvo (qualquer estado).
        $matAno = \App\Models\Tenant\Matricula::where("aluno_id", $aluno->id)
            ->where("ano_letivo", $anoAlvo)
            ->orderByRaw("FIELD(status,'activa','confirmada','pendente','concluida','transferida','cancelada')")
            ->orderByDesc("id")
            ->first();

        if ($matAno) {
            // Existe → actualiza turma e garante que está activa.
            $matAno->update([
                "turma_id" => $request->turma_id,
                "status"   => "activa",
            ]);
        } else {
            // Não existe → cria nova matricula activa para o ano alvo.
            \App\Models\Tenant\Matricula::create([
                "aluno_id"       => $aluno->id,
                "turma_id"       => $request->turma_id,
                "ano_letivo"     => $anoAlvo,
                "status"         => "activa",
                "data_matricula" => now()->toDateString(),
                "observacao"     => "Criada via verificação de dados académicos por {$authNome} a " . now()->format("d/m/Y H:i"),
            ]);
        }

        $aluno->update(["dados_academicos_verificados_em" => now()]);
        return response()->json([
            "message" => "Dados académicos verificados.",
            "aluno"   => $aluno->fresh()->load($this->relations()),
        ]);
    }

    /** Reset (uso de teste): limpa a flag de verificação académica do aluno. */
    public function resetVerificacaoAcademica(Request $request, Aluno $aluno) {
        $escola = $request->attributes->get("escola");
        if (!$escola || !$escola->permite_pago_historico) {
            return response()->json(["message" => "Funcionalidade não disponível para esta escola."], 403);
        }
        $aluno->update(["dados_academicos_verificados_em" => null]);
        return response()->json([
            "message" => "Verificação académica resetada — modal vai abrir na próxima selecção.",
            "aluno"   => $aluno->fresh()->load($this->relations()),
        ]);
    }

    public function destroy(Aluno $aluno) {
        if ($aluno->foto) Storage::disk("public")->delete($aluno->foto);
        $aluno->user->delete();
        return response()->json(["message"=>"Aluno removido."]);
    }
}
