<?php
namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\Aluno;
use App\Models\Tenant\AlunoDocumentoEntrega;
use App\Models\Tenant\TipoDocumento;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AlunoDocumentoEntregaController extends Controller {
    /**
     * GET /alunos/{aluno}/documentos
     * Retorna todos os tipos aplicáveis ao aluno (com base na matrícula activa/pendente)
     * com o estado de entrega de cada um.
     */
    public function index(Aluno $aluno) {
        $matricula = $aluno->matriculas()->with("turma.classe")->whereIn("status", ["activa","pendente"])->latest("id")->first();
        $cursoId  = $matricula?->turma?->classe?->curso_id;
        $classeId = $matricula?->turma?->classe_id;

        $tipos    = TipoDocumento::aplicaveisAo($cursoId, $classeId);
        $entregas = AlunoDocumentoEntrega::where("aluno_id", $aluno->id)->get()->keyBy("tipo_documento_id");

        $documentos = $tipos->map(function ($t) use ($entregas) {
            $e = $entregas[$t->id] ?? null;
            return [
                "tipo_documento_id"        => $t->id,
                "nome"                     => $t->nome,
                "descricao"                => $t->descricao,
                "obrigatorio"              => $t->obrigatorio,
                "bloqueia_matricula"       => $t->bloqueia_matricula,
                "aceita_upload"            => $t->aceita_upload,
                "ordem"                    => $t->ordem,
                "entregue"                 => $e?->entregue ?? false,
                "data_entrega"             => $e?->data_entrega?->format("Y-m-d"),
                "ficheiro"                 => $e?->ficheiro,
                "ficheiro_original_nome"   => $e?->ficheiro_original_nome,
                "observacoes"              => $e?->observacoes,
                "entrega_id"               => $e?->id,
            ];
        });

        return response()->json(["documentos" => $documentos]);
    }

    /** POST /alunos/{aluno}/documentos — upsert entrega (com upload opcional) */
    public function store(Request $request, Aluno $aluno) {
        $request->validate([
            "tipo_documento_id" => "required|exists:tipos_documento,id",
            "entregue"          => "boolean",
            "data_entrega"      => "nullable|date",
            "ficheiro"          => "nullable|file|max:5120|mimes:pdf,jpg,jpeg,png,webp",
            "observacoes"       => "nullable|string",
        ]);

        $entrega = AlunoDocumentoEntrega::firstOrNew([
            "aluno_id"          => $aluno->id,
            "tipo_documento_id" => $request->tipo_documento_id,
        ]);

        $entrega->entregue = $request->boolean("entregue", true);
        if ($request->has("data_entrega")) {
            $entrega->data_entrega = $request->data_entrega;
        } elseif ($entrega->entregue && !$entrega->data_entrega) {
            $entrega->data_entrega = now()->toDateString();
        }
        if ($request->has("observacoes")) $entrega->observacoes = $request->observacoes;

        if ($request->hasFile("ficheiro")) {
            if ($entrega->ficheiro) Storage::disk("public")->delete($entrega->ficheiro);
            $file = $request->file("ficheiro");
            $entrega->ficheiro = $file->store("documentos_alunos/{$aluno->id}", "public");
            $entrega->ficheiro_original_nome = $file->getClientOriginalName();
        }

        $entrega->save();
        return response()->json(["message" => "Entrega registada.", "entrega" => $entrega]);
    }

    /** DELETE /alunos/{aluno}/documentos/{entrega}/ficheiro — remove apenas o ficheiro */
    public function destroyFile(Aluno $aluno, AlunoDocumentoEntrega $entrega) {
        if ($entrega->aluno_id !== $aluno->id) abort(404);
        if ($entrega->ficheiro) {
            Storage::disk("public")->delete($entrega->ficheiro);
            $entrega->ficheiro = null;
            $entrega->ficheiro_original_nome = null;
            $entrega->save();
        }
        return response()->json(["message" => "Ficheiro removido."]);
    }
}
