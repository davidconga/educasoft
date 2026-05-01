<?php
namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\Bolsa;
use App\Models\Tenant\Pagamento;
use App\Services\Tenant\BolsaApplier;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class BolsaController extends Controller {
    public function index(Request $request) {
        $q = Bolsa::query()
            ->with(["aluno.user","financiador","matricula.classe","matricula.curso"]);
        if ($request->filled("aluno_id"))       $q->where("aluno_id", $request->aluno_id);
        if ($request->filled("financiador_id")) $q->where("financiador_id", $request->financiador_id);
        if ($request->filled("status"))         $q->where("status", $request->status);
        if ($request->filled("search")) {
            $s = "%".$request->search."%";
            $q->whereHas("aluno.user", fn($w) => $w->where("nome","like",$s));
        }
        return response()->json($q->orderByDesc("created_at")->get());
    }

    public function show(Bolsa $bolsa) {
        $bolsa->load(["aluno.user","financiador","matricula"]);
        return response()->json($bolsa);
    }

    public function store(Request $r) {
        $data = $r->validate([
            "aluno_id"          => "required|exists:alunos,id",
            "matricula_id"      => "nullable|exists:matriculas,id",
            "financiador_id"    => "nullable|exists:financiadores,id",
            "tipo"              => "required|in:percentagem,valor_fixo",
            "valor"             => "required|numeric|min:0",
            "cobre_propinas"    => "nullable|boolean",
            "cobre_emolumentos" => "nullable|boolean",
            "cobre_matricula"   => "nullable|boolean",
            "data_inicio"       => "nullable|date",
            "observacoes"       => "nullable|string",
        ]);
        if ($data["tipo"] === "percentagem" && $data["valor"] > 100) {
            return response()->json(["message" => "Percentagem não pode exceder 100."], 422);
        }
        $data["data_inicio"]       = $data["data_inicio"]       ?? Carbon::today()->toDateString();
        $data["cobre_propinas"]    = $data["cobre_propinas"]    ?? true;
        $data["cobre_emolumentos"] = $data["cobre_emolumentos"] ?? true;
        $data["cobre_matricula"]   = $data["cobre_matricula"]   ?? true;
        $data["status"]            = "activa";

        $bolsa = Bolsa::create($data);
        $this->reaplicarBolsaAPagamentosPendentes($bolsa);
        $bolsa->load(["aluno.user","financiador","matricula"]);
        return response()->json($bolsa, 201);
    }

    public function update(Request $r, Bolsa $bolsa) {
        $data = $r->validate([
            "tipo"              => "sometimes|required|in:percentagem,valor_fixo",
            "valor"             => "sometimes|required|numeric|min:0",
            "cobre_propinas"    => "nullable|boolean",
            "cobre_emolumentos" => "nullable|boolean",
            "cobre_matricula"   => "nullable|boolean",
            "financiador_id"    => "nullable|exists:financiadores,id",
            "observacoes"       => "nullable|string",
        ]);
        if (($data["tipo"] ?? $bolsa->tipo) === "percentagem"
            && (($data["valor"] ?? $bolsa->valor)) > 100) {
            return response()->json(["message" => "Percentagem não pode exceder 100."], 422);
        }
        $bolsa->update($data);
        $this->reaplicarBolsaAPagamentosPendentes($bolsa);
        $bolsa->load(["aluno.user","financiador","matricula"]);
        return response()->json($bolsa);
    }

    public function cancelar(Request $r, Bolsa $bolsa) {
        if ($bolsa->status === "cancelada") {
            return response()->json(["message" => "Bolsa já está cancelada."], 422);
        }
        $data = $r->validate([
            "motivo" => "nullable|string|max:255",
        ]);
        $bolsa->update([
            "status"                => "cancelada",
            "cancelada_em"          => Carbon::today(),
            "motivo_cancelamento"   => $data["motivo"] ?? null,
            "cancelada_por_user_id" => optional($r->user())->id,
        ]);

        // Remove bolsa de pagamentos ainda pendentes
        Pagamento::where("bolsa_id", $bolsa->id)
            ->whereIn("status", ["pendente","vencido"])
            ->update([
                "bolsa_id"             => null,
                "bolsa_financiador_id" => null,
                "bolsa_valor"          => 0,
            ]);

        return response()->json($bolsa->fresh());
    }

    public function reactivar(Bolsa $bolsa) {
        if ($bolsa->status === "activa") {
            return response()->json(["message" => "Bolsa já está activa."], 422);
        }
        $bolsa->update([
            "status"                => "activa",
            "cancelada_em"          => null,
            "motivo_cancelamento"   => null,
            "cancelada_por_user_id" => null,
        ]);
        $this->reaplicarBolsaAPagamentosPendentes($bolsa);
        return response()->json($bolsa->fresh());
    }

    public function destroy(Bolsa $bolsa) {
        $usadaEm = Pagamento::where("bolsa_id", $bolsa->id)->where("status","pago")->exists();
        if ($usadaEm) {
            return response()->json([
                "message" => "Bolsa já foi usada em pagamentos pagos. Cancele em vez de eliminar.",
            ], 422);
        }
        Pagamento::where("bolsa_id", $bolsa->id)
            ->update(["bolsa_id" => null, "bolsa_financiador_id" => null, "bolsa_valor" => 0]);
        $bolsa->delete();
        return response()->json(["message" => "Bolsa eliminada."]);
    }

    /** Recalcula a bolsa em todos os pagamentos pendentes/vencidos do aluno. */
    private function reaplicarBolsaAPagamentosPendentes(Bolsa $bolsa): void {
        $pendentes = Pagamento::where("aluno_id", $bolsa->aluno_id)
            ->whereIn("status", ["pendente","vencido"])
            ->get();
        foreach ($pendentes as $p) {
            $p->setRelation("bolsa", $bolsa->status === "activa" ? $bolsa : null);
            BolsaApplier::aplicar($p);
            $p->save();
        }
    }
}
