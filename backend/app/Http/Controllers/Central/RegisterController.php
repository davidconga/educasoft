<?php
namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Jobs\NotificarAdesaoEscolaJob;
use App\Models\Central\Escola;
use App\Models\Central\FacturaCentral;
use App\Models\Central\Plano;
use App\Models\Central\Termo;
use App\Services\Central\AssinaturaService;
use App\Services\Central\FacturaCentralService;
use App\Services\Central\ReferenciaPagamentoGateway;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RegisterController extends Controller
{
    public function planos()
    {
        $planos = Plano::where("ativo", true)
            ->orderBy("ordem")
            ->get()
            ->map(function ($p) {
                return [
                    "id"           => $p->codigo,
                    "nome"         => $p->nome,
                    "preco"        => (float) $p->preco_mensal,
                    "preco_anual"  => $p->preco_anual ? (float) $p->preco_anual : null,
                    "periodo"      => "mês",
                    "descricao"    => $p->descricao,
                    "max_alunos"   => $p->max_alunos,
                    "destaque"     => (bool) $p->destaque,
                    "features"     => $p->features ?? [],
                    "feature_keys" => $p->feature_keys ?? [],
                    "dias_trial"   => $p->dias_trial,
                ];
            });
        return response()->json($planos);
    }

    public function store(Request $request, AssinaturaService $assinaturaService, FacturaCentralService $facturaService, ReferenciaPagamentoGateway $refGateway)
    {
        $codigosValidos = Plano::where("ativo", true)->pluck("codigo")->all();

        $request->validate([
            "nome"            => "required|string|max:255",
            "email"           => "required|email|unique:tenants,email",
            "telefone"        => "nullable|string|max:30",
            "endereco"        => "nullable|string|max:500",
            "codigo"          => ["required", "string", "max:30", "unique:tenants,codigo", "regex:/^[a-z0-9\-]+$/"],
            "plano"           => ["required", "string", "in:" . implode(",", $codigosValidos)],
            "admin_nome"      => "required|string|max:255",
            "admin_email"     => "required|email",
            "admin_password"  => "required|min:8|confirmed",
            "aceito_termos"   => "required|accepted",
            "termos_versao"   => "nullable|string|max:20",
        ], [
            "email.unique"        => "Já existe uma escola registada com este email.",
            "codigo.unique"       => "Este código já está em uso. Escolha outro.",
            "codigo.regex"        => "O código só pode conter letras minúsculas, números e hífens.",
            "plano.in"            => "Plano inválido.",
            "aceito_termos.required"  => "Tem de aceitar os termos e condições.",
            "aceito_termos.accepted"  => "Tem de aceitar os termos e condições.",
        ]);

        $termoAtual = Termo::atual();
        $versaoAceita = $request->input("termos_versao") ?: $termoAtual?->versao;

        $plano = Plano::where("codigo", $request->plano)->firstOrFail();

        $escola = Escola::withoutEvents(function () use ($request, $versaoAceita) {
            return Escola::create([
                "id"             => Str::ulid(),
                "nome"           => $request->nome,
                "email"          => $request->email,
                "telefone"       => $request->telefone,
                "endereco"       => $request->endereco,
                "codigo"         => strtolower($request->codigo),
                "plano"          => $request->plano,
                "ativo"          => false,
                "admin_nome"     => $request->admin_nome,
                "admin_email"    => $request->admin_email,
                "admin_password" => bcrypt($request->admin_password),
                "termos_versao_aceita" => $versaoAceita,
                "termos_aceitos_em"    => now(),
                "termos_aceitos_ip"    => $request->ip(),
            ]);
        });

        $escola->domains()->create([
            "domain" => strtolower($request->codigo) . "." . env("TENANT_DOMAIN_SUFFIX", "educaja.ao"),
        ]);

        $assinaturaService->criarPara($escola, $plano);

        // Plano pago → gera factura + referência Multicaixa para o cliente pagar
        $facturaPayload = null;
        $referenciaPayload = null;
        if (!$plano->isGratuito() && $plano->dias_trial === 0) {
            $factura = $facturaService->gerarPara($escola);
            if ($factura) {
                $ref = $refGateway->gerar($factura);
                $facturaPayload = [
                    "id"             => $factura->id,
                    "numero"         => $factura->numero,
                    "total"          => (float) $factura->total,
                    "data_vencimento" => $factura->data_vencimento->toDateString(),
                ];
                $referenciaPayload = [
                    "entidade"   => $ref->entidade,
                    "referencia" => $ref->referencia,
                    "valor"      => (float) $ref->valor,
                    "expira_em"  => $ref->expira_em?->toIso8601String(),
                ];
            }
        }

        NotificarAdesaoEscolaJob::dispatchAfterResponse($escola->id);

        $msg = $facturaPayload
            ? "Cadastro recebido. Pague a primeira mensalidade para activar a sua conta."
            : "Cadastro recebido com sucesso! A sua escola será activada em breve.";

        return response()->json([
            "message"    => $msg,
            "codigo"     => $escola->codigo,
            "nome"       => $escola->nome,
            "plano_gratuito" => $plano->isGratuito(),
            "tem_trial"  => $plano->dias_trial > 0,
            "factura"    => $facturaPayload,
            "referencia" => $referenciaPayload,
        ], 201);
    }

    /**
     * Estado público de um cadastro (para o frontend fazer polling enquanto o cliente paga).
     */
    public function estado(string $codigo)
    {
        $escola = Escola::where("codigo", strtolower($codigo))->first();
        if (!$escola) {
            return response()->json(["message" => "Cadastro não encontrado."], 404);
        }
        $factura = FacturaCentral::where("escola_id", $escola->id)
            ->orderByDesc("id")
            ->first();
        $ref = $factura?->referencias()->orderByDesc("id")->first();

        return response()->json([
            "codigo" => $escola->codigo,
            "nome"   => $escola->nome,
            "ativo"  => (bool) $escola->ativo,
            "factura" => $factura ? [
                "numero" => $factura->numero,
                "estado" => $factura->estado,
                "total"  => (float) $factura->total,
                "paga_em" => $factura->paga_em?->toIso8601String(),
            ] : null,
            "referencia" => $ref ? [
                "entidade"   => $ref->entidade,
                "referencia" => $ref->referencia,
                "valor"      => (float) $ref->valor,
                "estado"     => $ref->estado,
                "expira_em"  => $ref->expira_em?->toIso8601String(),
            ] : null,
        ]);
    }
}
