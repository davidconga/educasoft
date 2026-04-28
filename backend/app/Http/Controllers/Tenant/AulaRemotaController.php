<?php
namespace App\Http\Controllers\Tenant;
use App\Http\Controllers\Controller;
use App\Models\Tenant\AulaRemota;
use App\Models\Tenant\Material;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
class AulaRemotaController extends Controller {
    public function index(Request $request) {
        $query = AulaRemota::with("turma","disciplina","professor.user");
        if ($request->turma_id) $query->where("turma_id",$request->turma_id);
        if ($request->professor_id) $query->where("professor_id",$request->professor_id);
        return response()->json($query->orderBy("data_inicio","desc")->paginate(20));
    }
    public function store(Request $request) {
        $request->validate(["turma_id"=>"required|exists:turmas,id","disciplina_id"=>"required|exists:disciplinas,id","professor_id"=>"required|exists:professores,id","titulo"=>"required","data_inicio"=>"required|date"]);
        $escola   = $request->attributes->get("escola");
        $codigo   = $escola ? preg_replace("/[^a-z0-9]/", "", strtolower($escola->codigo)) : "escola";
        $salaNome = $codigo."-".Str::slug($request->titulo)."-".Str::random(6);
        $aula = AulaRemota::create(array_merge($request->only(["turma_id","disciplina_id","professor_id","titulo","descricao","data_inicio","data_fim"]),["sala_nome"=>$salaNome,"link_jitsi"=>"https://meet.jit.si/".$salaNome,"status"=>"agendada"]));
        return response()->json(["message"=>"Aula agendada.","aula"=>$aula->load("turma","disciplina","professor.user")], 201);
    }
    public function show(AulaRemota $aulaRemota) {
        return response()->json($aulaRemota->load("turma","disciplina","professor.user","materiais"));
    }
    public function update(Request $request, AulaRemota $aulaRemota) {
        $aulaRemota->update($request->only(["titulo","descricao","data_inicio","data_fim","status"]));
        return response()->json(["message"=>"Aula actualizada.","aula"=>$aulaRemota]);
    }
    public function uploadMaterial(Request $request, AulaRemota $aulaRemota) {
        $request->validate(["titulo"=>"required","tipo"=>"required"]);
        $arquivo = null;
        if ($request->hasFile("arquivo")) {
            $escola  = $request->attributes->get("escola");
            $arquivo = $request->file("arquivo")->store("materiais/".($escola?->id ?? "tenant"), "public");
        }
        $mat = Material::create(["aula_id"=>$aulaRemota->id,"disciplina_id"=>$aulaRemota->disciplina_id,"turma_id"=>$aulaRemota->turma_id,"titulo"=>$request->titulo,"tipo"=>$request->tipo,"arquivo"=>$arquivo,"url"=>$request->url]);
        return response()->json(["message"=>"Material carregado.","material"=>$mat], 201);
    }
}
