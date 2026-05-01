<?php
namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Jobs\EnviarLembreteEmailJob;
use App\Jobs\EnviarLembreteSmsJob;
use App\Models\Tenant\LembreteConfig;
use App\Models\Tenant\LembretePagamento;
use App\Models\Tenant\Pagamento;
use App\Services\Tenant\LembreteScheduler;
use App\Services\Tenant\MensagemTemplate;
use App\Services\Tenant\SmsGateway;
use Illuminate\Http\Request;

class LembreteController extends Controller {
    /** GET /lembretes */
    public function index(Request $r) {
        $q = LembretePagamento::with(["aluno.user","pagamento"]);
        if ($r->filled("status"))   $q->where("status", $r->status);
        if ($r->filled("canal"))    $q->where("canal", $r->canal);
        if ($r->filled("aluno_id")) $q->where("aluno_id", $r->aluno_id);
        return response()->json($q->orderByDesc("created_at")->limit(500)->get());
    }

    /** GET /lembretes/config */
    public function config() {
        return response()->json(LembreteConfig::current());
    }

    /** PUT /lembretes/config */
    public function updateConfig(Request $r) {
        $data = $r->validate([
            "email_activo"   => "boolean",
            "sms_activo"     => "boolean",
            "dias_antes"     => "nullable|array",
            "dias_antes.*"   => "integer|min:0|max:60",
            "dias_depois"    => "nullable|array",
            "dias_depois.*"  => "integer|min:0|max:120",
            "hora_envio"     => "nullable|date_format:H:i,H:i:s",
            "email_assunto"  => "nullable|string|max:255",
            "email_template" => "nullable|string",
            "sms_sender_id"  => "nullable|string|max:20",
            "sms_template"   => "nullable|string|max:480",
            "sms_gateway_url" => "nullable|url",
            "sms_gateway_method" => "nullable|in:GET,POST,PUT",
            "sms_gateway_api_key" => "nullable|string|max:500",
            "sms_gateway_payload_template" => "nullable|string",
        ]);
        $cfg = LembreteConfig::current();
        $cfg->update($data);
        return response()->json($cfg->fresh());
    }

    /** POST /lembretes/gerar — gera lembretes pendentes para hoje */
    public function gerar() {
        $r = LembreteScheduler::fromConfig()->gerar();
        return response()->json($r);
    }

    /** POST /lembretes/processar — despacha todos os pendentes */
    public function processar(Request $r) {
        $escola = $r->attributes->get("escola");
        $pendentes = LembretePagamento::where("status", "pendente")->get();
        foreach ($pendentes as $l) {
            if ($l->canal === "email") {
                EnviarLembreteEmailJob::dispatch($escola->codigo, $l->id);
            } else {
                EnviarLembreteSmsJob::dispatch($escola->codigo, $l->id);
            }
        }
        return response()->json([
            "despachados" => $pendentes->count(),
            "message"     => "Despachados {$pendentes->count()} lembretes para envio.",
        ]);
    }

    /** POST /lembretes/reenviar/{lembrete} */
    public function reenviar(Request $r, LembretePagamento $lembrete) {
        $escola = $r->attributes->get("escola");
        $lembrete->update(["status" => "pendente", "erro" => null]);
        if ($lembrete->canal === "email") {
            EnviarLembreteEmailJob::dispatch($escola->codigo, $lembrete->id);
        } else {
            EnviarLembreteSmsJob::dispatch($escola->codigo, $lembrete->id);
        }
        return response()->json(["message" => "Lembrete reagendado para envio."]);
    }

    /** POST /pagamentos/{pagamento}/lembrete — envia lembrete manual */
    public function enviarManual(Request $r, Pagamento $pagamento) {
        $data = $r->validate([
            "canal" => "required|in:email,sms",
        ]);
        $aluno = $pagamento->aluno()->with("user")->first();
        if (!$aluno) return response()->json(["message" => "Aluno não encontrado."], 404);

        $destinatario = $data["canal"] === "email"
            ? ($aluno->email_responsavel ?: $aluno->user?->email)
            : ($aluno->telefone_responsavel ?: $aluno->user?->telefone);

        if (!$destinatario) {
            return response()->json([
                "message" => $data["canal"] === "email"
                    ? "Sem email do encarregado nem do aluno registado."
                    : "Sem telefone do encarregado nem do aluno registado.",
            ], 422);
        }

        $cfg = LembreteConfig::current();
        $msg = MensagemTemplate::render($data["canal"], $pagamento, $aluno, $cfg);

        $lembrete = LembretePagamento::create([
            "pagamento_id" => $pagamento->id,
            "aluno_id"     => $aluno->id,
            "canal"        => $data["canal"],
            "destinatario" => $destinatario,
            "gatilho"      => "manual",
            "dias_offset"  => 0,
            "mensagem"     => $msg,
            "status"       => "pendente",
        ]);

        $escola = $r->attributes->get("escola");
        if ($data["canal"] === "email") {
            EnviarLembreteEmailJob::dispatch($escola->codigo, $lembrete->id);
        } else {
            EnviarLembreteSmsJob::dispatch($escola->codigo, $lembrete->id);
        }

        return response()->json([
            "lembrete" => $lembrete->fresh(),
            "message"  => "Lembrete agendado para envio a {$destinatario}.",
        ]);
    }

    /**
     * POST /lembretes/teste-sms — testa o gateway SMS sem criar registo.
     *
     * Aceita override transitório das definições do gateway (URL, método, API key,
     * payload template, sender), permitindo iterar a configuração na UI sem
     * precisar de guardar primeiro.
     */
    public function testarSms(Request $r) {
        $r->validate([
            "telefone"                     => "required|string|max:30",
            "mensagem"                     => "nullable|string|max:480",
            "sms_gateway_url"              => "nullable|url",
            "sms_gateway_method"           => "nullable|in:GET,POST,PUT",
            "sms_gateway_api_key"          => "nullable|string|max:500",
            "sms_gateway_payload_template" => "nullable|string",
            "sms_sender_id"                => "nullable|string|max:20",
        ]);

        $saved = LembreteConfig::current();
        $cfg = new LembreteConfig([
            "sms_gateway_url"              => $r->input("sms_gateway_url")              ?: $saved->sms_gateway_url,
            "sms_gateway_method"           => $r->input("sms_gateway_method")           ?: ($saved->sms_gateway_method ?? "POST"),
            "sms_gateway_api_key"          => $r->input("sms_gateway_api_key")          ?: $saved->sms_gateway_api_key,
            "sms_gateway_payload_template" => $r->input("sms_gateway_payload_template") ?: $saved->sms_gateway_payload_template,
            "sms_sender_id"                => $r->input("sms_sender_id")                ?: $saved->sms_sender_id,
        ]);

        $resultado = (new SmsGateway($cfg))->enviar(
            $r->telefone,
            $r->mensagem ?: "Teste de SMS — Educajá."
        );
        // Echo do URL realmente usado, para o utilizador confirmar que o override chegou.
        $resultado["url_usado"] = $cfg->sms_gateway_url ?: "(vazio)";
        return response()->json($resultado);
    }
}
