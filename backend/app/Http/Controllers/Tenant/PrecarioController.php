<?php
namespace App\Http\Controllers\Tenant;
use App\Http\Controllers\Controller;
use App\Models\Tenant\PrecarioPropina;
use App\Models\Tenant\PrecarioEmolumento;
use App\Models\Tenant\PrecarioMulta;
use Illuminate\Http\Request;
class PrecarioController extends Controller {
    private function applyAmbito($query, Request $request) {
        if ($request->ano_letivo) $query->where("ano_letivo", $request->ano_letivo);
        if ($request->curso_id)   $query->where("curso_id",   $request->curso_id);
        if ($request->nivel)      $query->where("nivel",      $request->nivel);
        return $query;
    }

    // ── Propinas ──
    public function propinas(Request $request) {
        return response()->json($this->applyAmbito(PrecarioPropina::query(), $request)->get());
    }
    public function storePropina(Request $request) {
        $request->validate(["valor_mensal" => "required|numeric"]);
        return response()->json(PrecarioPropina::create($request->only(["nome","nivel","turno","valor_mensal","ano_letivo","curso_id","descricao"])), 201);
    }
    public function updatePropina(Request $request, PrecarioPropina $propina) {
        $propina->update($request->only(["nome","nivel","turno","valor_mensal","ano_letivo","curso_id","descricao"]));
        return response()->json($propina);
    }
    public function destroyPropina(PrecarioPropina $propina) {
        $propina->delete();
        return response()->json(["message" => "Propina eliminada."]);
    }

    // ── Emolumentos ──
    public function emolumentos(Request $request) {
        return response()->json($this->applyAmbito(PrecarioEmolumento::query(), $request)->get());
    }
    public function storeEmolumento(Request $request) {
        $request->validate(["nome" => "required", "valor" => "required|numeric"]);
        return response()->json(PrecarioEmolumento::create($request->only(["nome","categoria","valor","obrigatorio","ano_letivo","curso_id","nivel","descricao"])), 201);
    }
    public function updateEmolumento(Request $request, PrecarioEmolumento $emolumento) {
        $emolumento->update($request->only(["nome","categoria","valor","obrigatorio","ano_letivo","curso_id","nivel","descricao"]));
        return response()->json($emolumento);
    }
    public function destroyEmolumento(PrecarioEmolumento $emolumento) {
        $emolumento->delete();
        return response()->json(["message" => "Emolumento eliminado."]);
    }

    // ── Multas ──
    public function multas(Request $request) {
        return response()->json($this->applyAmbito(PrecarioMulta::query(), $request)->get());
    }
    public function storeMulta(Request $request) {
        $request->validate(["nome" => "required", "valor" => "required|numeric"]);
        return response()->json(PrecarioMulta::create($request->only(["nome","tipo_calculo","valor","dias_carencia","aplicar_em","descricao","ativo","ano_letivo","curso_id","nivel"])), 201);
    }
    public function updateMulta(Request $request, PrecarioMulta $multa) {
        $multa->update($request->only(["nome","tipo_calculo","valor","dias_carencia","aplicar_em","descricao","ativo","ano_letivo","curso_id","nivel"]));
        return response()->json($multa);
    }
    public function destroyMulta(PrecarioMulta $multa) {
        $multa->delete();
        return response()->json(["message" => "Multa eliminada."]);
    }
}
