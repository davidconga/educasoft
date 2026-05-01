<?php
namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\Financiador;
use Illuminate\Http\Request;

class FinanciadorController extends Controller {
    public function index(Request $request) {
        $q = Financiador::query()->withCount(["bolsas","recibos"]);
        if ($request->filled("activo")) $q->where("activo", $request->boolean("activo"));
        if ($request->filled("tipo"))   $q->where("tipo", $request->tipo);
        if ($request->filled("search")) {
            $s = "%".$request->search."%";
            $q->where(fn($w) => $w->where("nome","like",$s)->orWhere("nif","like",$s));
        }
        return response()->json($q->orderBy("nome")->get());
    }

    public function show(Financiador $financiador) {
        $financiador->loadCount(["bolsas","recibos"]);
        return response()->json($financiador);
    }

    public function store(Request $r) {
        $data = $r->validate([
            "nome"   => "required|string|max:255",
            "tipo"   => "required|in:interno,governo,empresa,fundacao,particular,outro",
            "nif"    => "nullable|string|max:30",
            "email"  => "nullable|email",
            "telefone" => "nullable|string|max:30",
            "endereco" => "nullable|string|max:255",
            "contacto_responsavel" => "nullable|string|max:255",
            "observacoes" => "nullable|string",
            "activo" => "nullable|boolean",
        ]);
        $data["activo"] = $data["activo"] ?? true;
        return response()->json(Financiador::create($data), 201);
    }

    public function update(Request $r, Financiador $financiador) {
        $data = $r->validate([
            "nome"   => "sometimes|required|string|max:255",
            "tipo"   => "sometimes|required|in:interno,governo,empresa,fundacao,particular,outro",
            "nif"    => "nullable|string|max:30",
            "email"  => "nullable|email",
            "telefone" => "nullable|string|max:30",
            "endereco" => "nullable|string|max:255",
            "contacto_responsavel" => "nullable|string|max:255",
            "observacoes" => "nullable|string",
            "activo" => "nullable|boolean",
        ]);
        $financiador->update($data);
        return response()->json($financiador);
    }

    public function destroy(Financiador $financiador) {
        if ($financiador->bolsas()->exists() || $financiador->recibos()->exists()) {
            return response()->json([
                "message" => "Não é possível eliminar — existem bolsas ou recibos associados. Marque como inactivo.",
            ], 422);
        }
        $financiador->delete();
        return response()->json(["message" => "Financiador eliminado."]);
    }
}
